package main

// bot_xmpp.go
//
// Bridges AI bots into the chat / XMPP infrastructure.
//
// Architecture:
//   * Each ACTIVE bot has a "shadow" row in the `users` table.  The bot's
//     UUID is reused as the user UUID, so it can be referenced from
//     `conversation_participants` (FK to users) and recognised by the
//     ejabberd `is_user` hook.
//   * The bot's JID is `<botID>@chat.trustinbox.local` — same shape as a
//     human user — so any XMPP-aware client can address it directly.
//   * Bot conversations are regular DIRECT conversations.  The friendship
//     requirement is bypassed when the other participant has
//     `account_type = 'BOT'`.
//   * When a user posts a message into a bot conversation, the gateway
//     fires off an async goroutine that calls the bot-service
//     `ExecuteBotAction(actionType=test_prompt)` RPC and persists the
//     reply as a `sender_type='AI'` message, then broadcasts an SSE
//     `chat_message` event so every connected client receives it in
//     realtime — exactly like a human reply.

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/graphql-bff/internal/clients"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	"go.uber.org/zap"
)

// botJID returns the bare JID for a bot in the chat domain.
func botJID(botID string) string {
	return botID + "@" + xmppDomain
}

// ensureBotShadowUser upserts the bot's shadow row in the users table and
// stores the JID on the bots row.  Idempotent — safe to call from every
// bot create / publish / update path.
//
// The bot does not actually log into ejabberd (the gateway sends stanzas on
// its behalf via the admin REST API), but we still seed an `xmpp_token_hash`
// derived from a random secret so the existing check_password hook would
// succeed if a future bot runtime ever connected directly.
func ensureBotShadowUser(ctx context.Context, db *sql.DB, log *zap.Logger, botID, displayName string) (string, error) {
	if !isUUID(botID) {
		return "", fmt.Errorf("invalid bot id")
	}

	jid := botJID(botID)

	// Always resolve the canonical name from the bots row so callers don't
	// have to thread it through.  This guarantees the shadow user_profile
	// stays in sync with bot renames.
	var dbBotName sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT name FROM bots WHERE id = $1`, botID).Scan(&dbBotName); err != nil && err != sql.ErrNoRows {
		return "", fmt.Errorf("lookup bot name: %w", err)
	}
	if dbBotName.Valid && dbBotName.String != "" {
		displayName = dbBotName.String
	}

	// Generate a stable-but-unguessable token.  We hash it (sha256) before
	// persisting, mirroring what handleEjabberdCheckPassword expects.
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	tokenHash := sha256.Sum256(secret)
	tokenHashHex := hex.EncodeToString(tokenHash[:])

	// Bot account password column requires a non-null value; set a hash that
	// can never match any real password.
	const sentinelPasswordHash = "BOT_NO_PASSWORD"

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// `username` is NOT NULL UNIQUE — derive a deterministic value from the
	// bot UUID so the upsert remains idempotent.
	username := "bot_" + botID

	// UPSERT the user shadow row.  We only set xmpp_token_hash on insert —
	// don't rotate it on every call.
	_, err = tx.ExecContext(ctx,
		`INSERT INTO users (id, username, password_hash, status, account_type, xmpp_jid, xmpp_token_hash, created_at, updated_at)
		 VALUES ($1, $2, $3, 'ACTIVE', 'BOT', $4, $5, NOW(), NOW())
		 ON CONFLICT (id) DO UPDATE SET
		     status       = 'ACTIVE',
		     account_type = 'BOT',
		     xmpp_jid     = COALESCE(users.xmpp_jid, EXCLUDED.xmpp_jid),
		     updated_at   = NOW()`,
		botID, username, sentinelPasswordHash, jid, tokenHashHex,
	)
	if err != nil {
		return "", fmt.Errorf("upsert bot user: %w", err)
	}

	// Seed user_profile (display name) — needed by chat.go participant lookups.
	// Only update it when we actually have a real name; otherwise preserve
	// whatever's already there (avoids clobbering a good name with "Bot").
	if displayName != "" {
		_, err = tx.ExecContext(ctx,
			`INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
			 VALUES ($1, $2, NOW(), NOW())
			 ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()`,
			botID, displayName,
		)
	} else {
		// First-time insert with a placeholder so the JOIN in getParticipantResponses
		// always finds a row; do nothing on conflict.
		_, err = tx.ExecContext(ctx,
			`INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
			 VALUES ($1, 'Bot', NOW(), NOW())
			 ON CONFLICT (user_id) DO NOTHING`,
			botID,
		)
	}
	if err != nil {
		return "", fmt.Errorf("upsert bot profile: %w", err)
	}

	// Persist JID on the bots row (no-op if column already matches).
	_, err = tx.ExecContext(ctx,
		`UPDATE bots SET xmpp_jid = $1, updated_at = NOW() WHERE id = $2`,
		jid, botID,
	)
	if err != nil {
		return "", fmt.Errorf("update bot jid: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("commit: %w", err)
	}

	if log != nil {
		log.Info("bot shadow user ensured", zap.String("bot_id", botID), zap.String("jid", jid))
	}
	return jid, nil
}

// findBotInConversation returns the (botID, spID) of the first BOT account
// participating in the conversation, or empty strings if there is none.
func findBotInConversation(ctx context.Context, db *sql.DB, convID string) (botID string, spID string) {
	row := db.QueryRowContext(ctx,
		`SELECT b.id, b.service_provider_id
		   FROM conversation_participants cp
		   JOIN users u ON u.id = cp.user_id
		   JOIN bots  b ON b.id = u.id
		  WHERE cp.conversation_id = $1
		    AND u.account_type = 'BOT'
		  LIMIT 1`, convID,
	)
	_ = row.Scan(&botID, &spID)
	return botID, spID
}

// triggerBotReplyAsync runs the AI bot reply in a goroutine.  It must NEVER
// panic the gateway, so all errors are logged and swallowed.
func triggerBotReplyAsync(deps *chatDeps, svc *clients.ServiceClients, convID, userID, botID, spID, userMessage string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()

		// ── Fetch recent conversation history (oldest-first, max 20 turns) ──
		// We fetch 21 rows (DESC) and reverse, excluding the current user message
		// which is passed separately as "message".
		type historyEntry struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		}
		var history []historyEntry

		rows, rowErr := deps.db.QueryContext(ctx,
			`SELECT sender_type, content
			   FROM messages
			  WHERE conversation_id = $1
			  ORDER BY created_at DESC
			  LIMIT 20`, convID,
		)
		if rowErr != nil {
			deps.log.Warn("bot reply: could not load history",
				zap.Error(rowErr),
				zap.String("conversation_id", convID),
			)
		} else {
			defer rows.Close()
			// Collected in DESC order; we'll reverse below
			var reversed []historyEntry
			for rows.Next() {
				var senderType, content string
				if err := rows.Scan(&senderType, &content); err != nil {
					continue
				}
				role := "user"
				if senderType == "AI" {
					role = "assistant"
				}
				reversed = append(reversed, historyEntry{Role: role, Content: content})
			}
			// Reverse to chronological order
			for i := len(reversed) - 1; i >= 0; i-- {
				history = append(history, reversed[i])
			}
		}

		inputPayload := map[string]interface{}{
			"message": userMessage,
			"history": history,
		}
		inputJSON, _ := json.Marshal(inputPayload)

		resp, err := svc.Bot.ExecuteBotAction(ctx, &botpb.ExecuteBotActionRequest{
			BotId:             botID,
			ServiceProviderId: spID,
			ConversationId:    convID,
			UserId:            userID,
			ActionType:        "test_prompt",
			InputJson:         string(inputJSON),
		})
		if err != nil {
			deps.log.Error("bot reply: ExecuteBotAction failed",
				zap.Error(err),
				zap.String("bot_id", botID),
				zap.String("conversation_id", convID),
			)
			persistAndBroadcastBotReply(ctx, deps, convID, botID,
				"⚠️ I'm having trouble responding right now. Please try again in a moment.")
			return
		}

		var inner map[string]interface{}
		if jerr := json.Unmarshal([]byte(resp.GetOutputJson()), &inner); jerr != nil {
			deps.log.Warn("bot reply: cannot decode output", zap.Error(jerr))
			return
		}
		body, _ := inner["response"].(string)
		if body == "" {
			body = "(no response)"
		}

		persistAndBroadcastBotReply(ctx, deps, convID, botID, body)
	}()
}

// persistAndBroadcastBotReply inserts a sender_type='AI' message and pushes
// a chat_message SSE event to every conversation participant.
func persistAndBroadcastBotReply(ctx context.Context, deps *chatDeps, convID, botID, body string) {
	msgID := uuid.New().String()
	now := time.Now()

	_, err := deps.db.ExecContext(ctx,
		`INSERT INTO messages (id, conversation_id, sender_type, sender_ref_id, message_type, content, created_at)
		 VALUES ($1, $2, 'AI', $3, 'TEXT', $4, $5)`,
		msgID, convID, botID, body, now,
	)
	if err != nil {
		deps.log.Error("bot reply: insert message failed", zap.Error(err))
		return
	}

	preview := body
	if len(preview) > 200 {
		preview = preview[:200]
	}
	deps.db.ExecContext(ctx,
		`UPDATE conversations SET last_message_at = $1, last_message_preview = $2, updated_at = $1 WHERE id = $3`,
		now, preview, convID,
	)

	senderName := getUserDisplayName(ctx, deps, botID)
	participants := getConversationParticipants(ctx, deps, convID)

	event := wsOutgoing{
		Type:           WSEventNewMessage,
		ConversationID: convID,
		MessageID:      msgID,
		SenderID:       botID,
		SenderName:     senderName,
		Content:        body,
		Timestamp:      now.Format(time.RFC3339),
		MessageType:    "TEXT",
		Status:         "sent",
	}
	deps.hub.broadcast(ctx, participants, event)
	for _, pid := range participants {
		deps.sseHub.send(pid, "chat_message", event)
	}
}

// ─── HTTP: POST /api/bots/conversations ──────────────────────────────────
//
// Customer-facing endpoint — creates (or returns existing) DIRECT conversation
// between the authenticated user and the given bot.  Auto-provisions the
// bot's shadow user row on first use.
//
// Body: { "botId": "<uuid>" }
// Returns: full conversationResponse (same shape as POST /api/conversations).

func handleCreateBotConversation(deps *chatDeps, svc *clients.ServiceClients) http.HandlerFunc {
	_ = svc // currently unused, but kept on the signature for future bot RPC needs
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var body struct {
			BotID string `json:"botId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !isUUID(body.BotID) {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "valid botId is required"})
			return
		}

		ctx := r.Context()

		// Verify the bot exists and is ACTIVE; load name + spID for shadow row.
		var (
			botName   sql.NullString
			botStatus string
		)
		err = deps.db.QueryRowContext(ctx,
			`SELECT name, status FROM bots WHERE id = $1`, body.BotID,
		).Scan(&botName, &botStatus)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not found"})
			return
		}
		if err != nil {
			deps.log.Error("bot lookup failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if botStatus != "ACTIVE" {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "bot is not active"})
			return
		}

		// Idempotently provision the bot as a chat user.
		if _, err := ensureBotShadowUser(ctx, deps.db, deps.log, body.BotID, botName.String); err != nil {
			deps.log.Error("ensure bot shadow user failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to provision bot"})
			return
		}

		// Reuse handleCreateConversation logic by calling it with a synthetic body.
		// Easiest path: do it inline (handleCreateConversation enforces friendship,
		// which we want to bypass for bots).
		var existingID string
		_ = deps.db.QueryRowContext(ctx,
			`SELECT c.id FROM conversations c
			   JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
			   JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
			  WHERE c.type = 'DIRECT' AND c.status = 'OPEN' LIMIT 1`,
			userID, body.BotID,
		).Scan(&existingID)

		if existingID != "" {
			if conv := getConversationByID(ctx, deps, existingID, userID); conv != nil {
				writeJSON(w, http.StatusOK, conv)
				return
			}
		}

		tx, err := deps.db.BeginTx(ctx, nil)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer tx.Rollback()

		convID := uuid.New().String()
		now := time.Now()
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO conversations (id, type, status, created_at, updated_at)
			 VALUES ($1, 'DIRECT', 'OPEN', $2, $2)`, convID, now); err != nil {
			deps.log.Error("create bot conversation failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create conversation"})
			return
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
			 VALUES ($1, $2, 'MEMBER', $3), ($1, $4, 'MEMBER', $3)`,
			convID, userID, now, body.BotID); err != nil {
			deps.log.Error("add bot conversation participants failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create conversation"})
			return
		}
		if err := tx.Commit(); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		writeJSON(w, http.StatusCreated, getConversationByID(ctx, deps, convID, userID))
	}
}
