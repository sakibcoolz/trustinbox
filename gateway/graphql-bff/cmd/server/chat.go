package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ==================== Request/Response Types ====================

type createConversationRequest struct {
	Type          string `json:"type"`          // "DIRECT"
	ParticipantID string `json:"participantId"` // for DIRECT
	Message       string `json:"message,omitempty"`
}

type conversationResponse struct {
	ID                 string                `json:"id"`
	Type               string                `json:"type"`
	Status             string                `json:"status"`
	LastMessageAt      *string               `json:"lastMessageAt,omitempty"`
	LastMessagePreview *string               `json:"lastMessagePreview,omitempty"`
	Participants       []participantResponse `json:"participants"`
	UnreadCount        int                   `json:"unreadCount"`
	Muted              bool                  `json:"muted"`
	CreatedAt          string                `json:"createdAt"`
}

type participantResponse struct {
	UserID     string  `json:"userId"`
	Username   string  `json:"username"`
	FullName   string  `json:"fullName"`
	Online     bool    `json:"online"`
	Role       string  `json:"role"`
	LastReadAt *string `json:"lastReadAt,omitempty"`
}

type messageResponse struct {
	ID             string               `json:"id"`
	ConversationID string               `json:"conversationId"`
	SenderID       string               `json:"senderId"`
	SenderName     string               `json:"senderName"`
	SenderType     string               `json:"senderType"`
	MessageType    string               `json:"messageType"`
	Content        *string              `json:"content"`
	ReplyToID      *string              `json:"replyToId,omitempty"`
	ReplyPreview   *replyPreview        `json:"replyPreview,omitempty"`
	Attachments    []attachmentResponse `json:"attachments,omitempty"`
	Reactions      []reactionResponse   `json:"reactions,omitempty"`
	EditedAt       *string              `json:"editedAt,omitempty"`
	DeletedAt      *string              `json:"deletedAt,omitempty"`
	CreatedAt      string               `json:"createdAt"`
	Status         string               `json:"status"`
}

type replyPreview struct {
	ID         string  `json:"id"`
	SenderName string  `json:"senderName"`
	Content    *string `json:"content"`
}

type reactionResponse struct {
	Emoji string   `json:"emoji"`
	Users []string `json:"users"`
	Count int      `json:"count"`
}

type sendMessageRequest struct {
	MessageID     string   `json:"messageId,omitempty"` // optional client-supplied UUID (XMPP stanza deduplication)
	Content       string   `json:"content"`
	ReplyToID     string   `json:"replyToId,omitempty"`
	AttachmentIDs []string `json:"attachmentIds,omitempty"`
	MessageType   string   `json:"messageType,omitempty"` // TEXT | IMAGE | VIDEO | VOICE | FILE
}

type editMessageRequest struct {
	Content string `json:"content"`
}

type reactionRequest struct {
	Emoji string `json:"emoji"`
}

// ==================== Conversation Handlers ====================

func handleCreateConversation(deps *chatDeps) http.HandlerFunc {
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

		var req createConversationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Type != "DIRECT" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "only DIRECT conversations supported currently"})
			return
		}

		if req.ParticipantID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "participantId is required"})
			return
		}

		if req.ParticipantID == userID {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "cannot create conversation with yourself"})
			return
		}

		ctx := r.Context()

		// Check if DIRECT conversation already exists between these two users
		var existingID string
		err = deps.db.QueryRowContext(ctx,
			`SELECT c.id FROM conversations c
			 JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
			 JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
			 WHERE c.type = 'DIRECT' AND c.status = 'OPEN'
			 LIMIT 1`,
			userID, req.ParticipantID,
		).Scan(&existingID)

		if err == nil && existingID != "" {
			// Return existing conversation
			conv := getConversationByID(ctx, deps, existingID, userID)
			if conv != nil {
				writeJSON(w, http.StatusOK, conv)
				return
			}
		}

		// Verify target user exists.  Bots (account_type='BOT') bypass the
		// friendship requirement — anyone can chat with an active bot.
		var targetAccountType string
		deps.db.QueryRowContext(ctx,
			`SELECT account_type FROM users WHERE id = $1 AND status = 'ACTIVE'`,
			req.ParticipantID,
		).Scan(&targetAccountType)
		if targetAccountType == "" {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user not found"})
			return
		}
		if targetAccountType != "BOT" {
			var isFriend bool
			deps.db.QueryRowContext(ctx,
				`SELECT EXISTS(SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2)`,
				userID, req.ParticipantID,
			).Scan(&isFriend)
			if !isFriend {
				writeJSON(w, http.StatusForbidden, errorResponse{Error: "you can only message friends"})
				return
			}
		}

		// Create conversation in transaction
		tx, err := deps.db.BeginTx(ctx, nil)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer tx.Rollback()

		convID := uuid.New().String()
		now := time.Now()

		_, err = tx.ExecContext(ctx,
			`INSERT INTO conversations (id, type, status, created_at, updated_at)
			 VALUES ($1, 'DIRECT', 'OPEN', $2, $2)`,
			convID, now,
		)
		if err != nil {
			deps.log.Error("failed to create conversation", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create conversation"})
			return
		}

		// Add both participants
		_, err = tx.ExecContext(ctx,
			`INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
			 VALUES ($1, $2, 'MEMBER', $3), ($1, $4, 'MEMBER', $3)`,
			convID, userID, now, req.ParticipantID,
		)
		if err != nil {
			deps.log.Error("failed to add participants", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create conversation"})
			return
		}

		// If initial message provided, insert it
		if req.Message != "" {
			msgID := uuid.New().String()
			tx.ExecContext(ctx,
				`INSERT INTO messages (id, conversation_id, sender_type, sender_ref_id, message_type, content, created_at)
				 VALUES ($1, $2, 'USER', $3, 'TEXT', $4, $5)`,
				msgID, convID, userID, req.Message, now,
			)
			preview := req.Message
			if len(preview) > 200 {
				preview = preview[:200]
			}
			tx.ExecContext(ctx,
				`UPDATE conversations SET last_message_at = $1, last_message_preview = $2 WHERE id = $3`,
				now, preview, convID,
			)
		}

		if err := tx.Commit(); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		conv := getConversationByID(ctx, deps, convID, userID)
		writeJSON(w, http.StatusCreated, conv)
	}
}

func handleListConversations(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		ctx := r.Context()

		rows, err := deps.db.QueryContext(ctx,
			`SELECT c.id, c.type, c.status, c.last_message_at, c.last_message_preview, c.created_at,
			        cp.muted
			 FROM conversations c
			 JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
			 WHERE c.status = 'OPEN'
			 ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
			 LIMIT 50`, userID)
		if err != nil {
			deps.log.Error("failed to list conversations", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		var convos []conversationResponse
		for rows.Next() {
			var c conversationResponse
			var lastMsgAt, lastMsgPreview sql.NullString
			var createdAt time.Time

			if err := rows.Scan(&c.ID, &c.Type, &c.Status, &lastMsgAt, &lastMsgPreview, &createdAt, &c.Muted); err != nil {
				continue
			}
			if lastMsgAt.Valid {
				c.LastMessageAt = &lastMsgAt.String
			}
			if lastMsgPreview.Valid {
				c.LastMessagePreview = &lastMsgPreview.String
			}
			c.CreatedAt = createdAt.Format(time.RFC3339)

			// Get participants
			c.Participants = getParticipantResponses(ctx, deps, c.ID, userID)

			// Get unread count
			c.UnreadCount = getUnreadCount(ctx, deps, c.ID, userID)

			convos = append(convos, c)
		}

		if convos == nil {
			convos = []conversationResponse{}
		}

		writeJSON(w, http.StatusOK, convos)
	}
}

// handleConversationByID handles GET /api/conversations/{id}
func handleConversationByID(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		convID := extractPathParam(r.URL.Path, "/api/conversations/", "")
		if convID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "conversation id required"})
			return
		}

		conv := getConversationByID(r.Context(), deps, convID, userID)
		if conv == nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "conversation not found"})
			return
		}

		writeJSON(w, http.StatusOK, conv)
	}
}

// ==================== Message Handlers ====================

func handleListMessages(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Extract conversation ID from path: /api/conversations/{id}/messages
		path := r.URL.Path
		convID := extractPathParam(path, "/api/conversations/", "/messages")
		if convID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "conversation id required"})
			return
		}

		ctx := r.Context()

		// Verify participation
		var isParticipantDB bool
		deps.db.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
			convID, userID,
		).Scan(&isParticipantDB)
		if !isParticipantDB {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "not a participant"})
			return
		}

		// Pagination
		limit := 50
		if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 100 {
			limit = l
		}
		before := r.URL.Query().Get("before") // cursor: message created_at

		var rows *sql.Rows
		if before != "" {
			rows, err = deps.db.QueryContext(ctx,
				`SELECT m.id, m.conversation_id, m.sender_type, COALESCE(m.sender_ref_id::text, ''),
				        m.message_type, m.content, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
				        COALESCE(p.full_name, u.username, '') as sender_name
				 FROM messages m
				 LEFT JOIN users u ON u.id = m.sender_ref_id
				 LEFT JOIN user_profiles p ON p.user_id = m.sender_ref_id
				 WHERE m.conversation_id = $1 AND m.created_at < $2
				 ORDER BY m.created_at DESC
				 LIMIT $3`,
				convID, before, limit)
		} else {
			rows, err = deps.db.QueryContext(ctx,
				`SELECT m.id, m.conversation_id, m.sender_type, COALESCE(m.sender_ref_id::text, ''),
				        m.message_type, m.content, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
				        COALESCE(p.full_name, u.username, '') as sender_name
				 FROM messages m
				 LEFT JOIN users u ON u.id = m.sender_ref_id
				 LEFT JOIN user_profiles p ON p.user_id = m.sender_ref_id
				 WHERE m.conversation_id = $1
				 ORDER BY m.created_at DESC
				 LIMIT $2`,
				convID, limit)
		}
		if err != nil {
			deps.log.Error("failed to list messages", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		// Compute read status: if the other participant's last_read_at >= message created_at, it's 'read'
		otherLastReadAt := getOtherParticipantLastReadAt(ctx, deps, convID, userID)

		var messages []messageResponse
		for rows.Next() {
			var m messageResponse
			var content, replyToID, editedAt, deletedAt sql.NullString
			var senderRefID string
			var createdAt time.Time

			if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderType, &senderRefID,
				&m.MessageType, &content, &replyToID, &editedAt, &deletedAt, &createdAt, &m.SenderName); err != nil {
				continue
			}

			m.SenderID = senderRefID
			if content.Valid {
				m.Content = &content.String
			}
			if replyToID.Valid {
				m.ReplyToID = &replyToID.String
				m.ReplyPreview = getReplyPreview(ctx, deps, replyToID.String)
			}
			if editedAt.Valid {
				m.EditedAt = &editedAt.String
			}
			if deletedAt.Valid {
				m.DeletedAt = &deletedAt.String
			}
			m.CreatedAt = createdAt.Format(time.RFC3339)

			// Determine message status for own messages
			if senderRefID == userID && otherLastReadAt != nil && !createdAt.After(*otherLastReadAt) {
				m.Status = "read"
			} else {
				m.Status = "sent"
			}

			// Get reactions
			m.Reactions = getMessageReactions(ctx, deps, m.ID)

			// Get attachments
			m.Attachments = getMessageAttachments(ctx, deps, m.ID)

			messages = append(messages, m)
		}

		// Reverse to chronological order
		for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
			messages[i], messages[j] = messages[j], messages[i]
		}

		if messages == nil {
			messages = []messageResponse{}
		}

		writeJSON(w, http.StatusOK, messages)
	}
}

func handleSendMessageREST(deps *chatDeps) http.HandlerFunc {
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

		convID := extractPathParam(r.URL.Path, "/api/conversations/", "/messages")
		if convID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "conversation id required"})
			return
		}

		var req sendMessageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Content == "" && len(req.AttachmentIDs) == 0 {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "content or attachments required"})
			return
		}

		ctx := r.Context()

		// Verify participation
		participants := getConversationParticipants(ctx, deps, convID)
		if !isParticipant(userID, participants) {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "not a participant"})
			return
		}

		senderName := getUserDisplayName(ctx, deps, userID)
		// Honour the client-supplied type (IMAGE, VIDEO, VOICE, FILE…)
		// Fall back to FILE when attachments are present but no explicit type given.
		msgType := "TEXT"
		if req.MessageType != "" {
			msgType = req.MessageType
		} else if len(req.AttachmentIDs) > 0 {
			msgType = "FILE"
		}

		messageID := uuid.New().String()
		// Accept a client-supplied ID so that the XMPP stanza ID and DB record
		// share the same UUID, enabling correct deduplication after page reload.
		if req.MessageID != "" {
			messageID = req.MessageID
		}
		var replyToID interface{} = nil
		if req.ReplyToID != "" {
			replyToID = req.ReplyToID
		}

		now := time.Now()
		_, err = deps.db.ExecContext(ctx,
			`INSERT INTO messages (id, conversation_id, sender_type, sender_ref_id, message_type, content, reply_to_id, created_at)
			 VALUES ($1, $2, 'USER', $3, $4, $5, $6, $7)`,
			messageID, convID, userID, msgType, req.Content, replyToID, now,
		)
		if err != nil {
			deps.log.Error("failed to insert message", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to send message"})
			return
		}

		// Link attachments
		for _, attID := range req.AttachmentIDs {
			deps.db.ExecContext(ctx,
				`UPDATE message_attachments SET message_id = $1 WHERE id = $2`, messageID, attID)
		}

		// Update conversation
		preview := req.Content
		if len(preview) > 200 {
			preview = preview[:200]
		}
		deps.db.ExecContext(ctx,
			`UPDATE conversations SET last_message_at = $1, last_message_preview = $2, updated_at = $1 WHERE id = $3`,
			now, preview, convID,
		)

		var attachments []attachmentResponse
		if len(req.AttachmentIDs) > 0 {
			attachments = getMessageAttachments(ctx, deps, messageID)
		}

		// Broadcast via WebSocket (legacy real-time channel kept for compatibility)
		event := wsOutgoing{
			Type:           WSEventNewMessage,
			ConversationID: convID,
			MessageID:      messageID,
			SenderID:       userID,
			SenderName:     senderName,
			Content:        req.Content,
			ReplyToID:      req.ReplyToID,
			Attachments:    attachments,
			Timestamp:      now.Format(time.RFC3339),
			MessageType:    msgType,
			Status:         "sent",
		}
		deps.hub.broadcast(ctx, participants, event)

		// Push chat_message SSE event to every participant (including sender's other tabs).
		// This is the reliable delivery channel when the recipient's XMPP connection is
		// down or when they don't yet have the conversation loaded in their UI.
		// The frontend deduplicates by message ID, so double delivery is harmless.
		for _, pid := range participants {
			deps.sseHub.send(pid, "chat_message", event)
		}

		// Build response
		resp := messageResponse{
			ID:             messageID,
			ConversationID: convID,
			SenderID:       userID,
			SenderName:     senderName,
			SenderType:     "USER",
			MessageType:    msgType,
			Content:        &req.Content,
			CreatedAt:      now.Format(time.RFC3339),
			Status:         "sent",
			Attachments:    attachments,
		}
		if req.ReplyToID != "" {
			resp.ReplyToID = &req.ReplyToID
		}

writeJSON(w, http.StatusCreated, resp)
	}
}

// handleGetMessageREST handles GET /api/messages/{id}
// Returns the full message with its attachments. Used by the receiver to
// hydrate attachment metadata after receiving an XMPP stanza (which carries
// no attachment URLs).
func handleGetMessageREST(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		msgID := extractPathParam(r.URL.Path, "/api/messages/", "")
		if msgID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message id required"})
			return
		}

		ctx := r.Context()

		var m messageResponse
		var content, replyToID, editedAt, deletedAt sql.NullString
		err = deps.db.QueryRowContext(ctx,
			`SELECT m.id, m.conversation_id, COALESCE(m.sender_ref_id::text, ''),
			        m.message_type, m.content, m.reply_to_id, m.edited_at, m.deleted_at, m.created_at,
			        COALESCE(p.full_name, u.username, '') as sender_name
			 FROM messages m
			 LEFT JOIN users u ON u.id = m.sender_ref_id
			 LEFT JOIN user_profiles p ON p.user_id = m.sender_ref_id
			 WHERE m.id = $1 AND m.deleted_at IS NULL`, msgID,
		).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.MessageType,
			&content, &replyToID, &editedAt, &deletedAt, &m.CreatedAt, &m.SenderName)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "message not found"})
			return
		}

		// Verify the requesting user is a participant in the conversation
		var isParticipant bool
		deps.db.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
			m.ConversationID, userID,
		).Scan(&isParticipant)
		if !isParticipant {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "not a participant"})
			return
		}

		if content.Valid {
			m.Content = &content.String
		}
		if replyToID.Valid {
			m.ReplyToID = &replyToID.String
		}
		if editedAt.Valid {
			m.EditedAt = &editedAt.String
		}

		m.Attachments = getMessageAttachments(ctx, deps, m.ID)
		if m.Attachments == nil {
			m.Attachments = []attachmentResponse{}
		}
		m.Status = "sent"

		writeJSON(w, http.StatusOK, m)
	}
}

func handleEditMessageREST(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		msgID := extractPathParam(r.URL.Path, "/api/messages/", "")
		if msgID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message id required"})
			return
		}

		var req editMessageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Content == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "content is required"})
			return
		}

		ctx := r.Context()

		var senderRefID, convID string
		err = deps.db.QueryRowContext(ctx,
			`SELECT sender_ref_id, conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
			msgID,
		).Scan(&senderRefID, &convID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "message not found"})
			return
		}
		if senderRefID != userID {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "can only edit your own messages"})
			return
		}

		now := time.Now()
		deps.db.ExecContext(ctx,
			`UPDATE messages SET content = $1, edited_at = $2 WHERE id = $3`,
			req.Content, now, msgID,
		)

		participants := getConversationParticipants(ctx, deps, convID)
		deps.hub.broadcast(ctx, participants, wsOutgoing{
			Type:           WSEventMessageEdited,
			ConversationID: convID,
			MessageID:      msgID,
			Content:        req.Content,
			Timestamp:      now.Format(time.RFC3339),
			SenderID:       userID,
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "edited"})
	}
}

func handleDeleteMessageREST(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		msgID := extractPathParam(r.URL.Path, "/api/messages/", "")
		if msgID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message id required"})
			return
		}

		ctx := r.Context()

		var senderRefID, convID string
		err = deps.db.QueryRowContext(ctx,
			`SELECT sender_ref_id, conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
			msgID,
		).Scan(&senderRefID, &convID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "message not found"})
			return
		}
		if senderRefID != userID {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "can only delete your own messages"})
			return
		}

		now := time.Now()
		deps.db.ExecContext(ctx,
			`UPDATE messages SET deleted_at = $1, content = NULL WHERE id = $2`,
			now, msgID,
		)

		participants := getConversationParticipants(ctx, deps, convID)
		deps.hub.broadcast(ctx, participants, wsOutgoing{
			Type:           WSEventMessageDeleted,
			ConversationID: convID,
			MessageID:      msgID,
			SenderID:       userID,
			Timestamp:      now.Format(time.RFC3339),
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

func handleAddReactionREST(deps *chatDeps) http.HandlerFunc {
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

		// /api/messages/{id}/reactions
		path := r.URL.Path
		msgID := extractPathParam(path, "/api/messages/", "/reactions")
		if msgID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message id required"})
			return
		}

		var req reactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Emoji == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "emoji is required"})
			return
		}

		ctx := r.Context()

		var convID string
		err = deps.db.QueryRowContext(ctx,
			`SELECT conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`, msgID,
		).Scan(&convID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "message not found"})
			return
		}

		deps.db.ExecContext(ctx,
			`INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
			 ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
			msgID, userID, req.Emoji,
		)

		participants := getConversationParticipants(ctx, deps, convID)
		senderName := getUserDisplayName(ctx, deps, userID)
		// broadcast() now forwards reaction events to SSE as well.
		deps.hub.broadcast(ctx, participants, wsOutgoing{
			Type:           WSEventReactionAdded,
			ConversationID: convID,
			MessageID:      msgID,
			Emoji:          req.Emoji,
			UserID:         userID,
			SenderName:     senderName,
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "added"})
	}
}

func handleRemoveReactionREST(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// /api/messages/{id}/reactions?emoji=...
		path := r.URL.Path
		msgID := extractPathParam(path, "/api/messages/", "/reactions")
		emoji := r.URL.Query().Get("emoji")
		if msgID == "" || emoji == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message id and emoji required"})
			return
		}

		ctx := r.Context()

		var convID string
		err = deps.db.QueryRowContext(ctx,
			`SELECT conversation_id FROM messages WHERE id = $1`, msgID,
		).Scan(&convID)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "message not found"})
			return
		}

		deps.db.ExecContext(ctx,
			`DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
			msgID, userID, emoji,
		)

		participants := getConversationParticipants(ctx, deps, convID)
		deps.hub.broadcast(ctx, participants, wsOutgoing{
			Type:           WSEventReactionRemoved,
			ConversationID: convID,
			MessageID:      msgID,
			Emoji:          emoji,
			UserID:         userID,
		})

		writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
	}
}

func handleMarkConversationRead(deps *chatDeps) http.HandlerFunc {
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

		convID := extractPathParam(r.URL.Path, "/api/conversations/", "/read")
		if convID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "conversation id required"})
			return
		}

		ctx := r.Context()
		now := time.Now()

		// Get latest message ID
		var lastMsgID sql.NullString
		deps.db.QueryRowContext(ctx,
			`SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
			convID,
		).Scan(&lastMsgID)

		var msgIDPtr interface{} = nil
		if lastMsgID.Valid {
			msgIDPtr = lastMsgID.String
		}

		deps.db.ExecContext(ctx,
			`UPDATE conversation_participants SET last_read_at = $1, last_read_message_id = $2
			 WHERE conversation_id = $3 AND user_id = $4`,
			now, msgIDPtr, convID, userID,
		)

		// Broadcast read receipt via WebSocket
		participants := getConversationParticipants(ctx, deps, convID)
		others := filterOut(participants, userID)
		deps.hub.broadcast(ctx, others, wsOutgoing{
			Type:           WSEventMessageRead,
			ConversationID: convID,
			UserID:         userID,
			LastReadAt:     now.Format(time.RFC3339),
			MessageID:      lastMsgID.String,
		})

		// Broadcast read receipt via SSE (for hybrid app / web SSE listeners)
		readPayload := map[string]interface{}{
			"conversationId": convID,
			"readByUserId":   userID,
			"lastReadAt":     now.Format(time.RFC3339),
			"messageId":      lastMsgID.String,
		}
		for _, uid := range others {
			deps.sseHub.send(uid, "message_read", readPayload)
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ==================== Chat Helpers ====================

func getConversationByID(ctx context.Context, deps *chatDeps, convID, userID string) *conversationResponse {
	var c conversationResponse
	var lastMsgAt, lastMsgPreview sql.NullString
	var createdAt time.Time

	err := deps.db.QueryRowContext(ctx,
		`SELECT c.id, c.type, c.status, c.last_message_at, c.last_message_preview, c.created_at, cp.muted
		 FROM conversations c
		 JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $2
		 WHERE c.id = $1`,
		convID, userID,
	).Scan(&c.ID, &c.Type, &c.Status, &lastMsgAt, &lastMsgPreview, &createdAt, &c.Muted)

	if err != nil {
		return nil
	}

	if lastMsgAt.Valid {
		c.LastMessageAt = &lastMsgAt.String
	}
	if lastMsgPreview.Valid {
		c.LastMessagePreview = &lastMsgPreview.String
	}
	c.CreatedAt = createdAt.Format(time.RFC3339)
	c.Participants = getParticipantResponses(ctx, deps, c.ID, userID)
	c.UnreadCount = getUnreadCount(ctx, deps, c.ID, userID)

	return &c
}

func getParticipantResponses(ctx context.Context, deps *chatDeps, convID, currentUserID string) []participantResponse {
	rows, err := deps.db.QueryContext(ctx,
		`SELECT cp.user_id, u.username, COALESCE(p.full_name, ''), cp.role, cp.last_read_at
		 FROM conversation_participants cp
		 JOIN users u ON u.id = cp.user_id
		 LEFT JOIN user_profiles p ON p.user_id = cp.user_id
		 WHERE cp.conversation_id = $1`,
		convID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var participants []participantResponse
	for rows.Next() {
		var pr participantResponse
		var lastReadAt sql.NullString
		if err := rows.Scan(&pr.UserID, &pr.Username, &pr.FullName, &pr.Role, &lastReadAt); err != nil {
			continue
		}
		if lastReadAt.Valid {
			pr.LastReadAt = &lastReadAt.String
		}
		if pr.UserID != currentUserID {
			pr.Online = deps.hub.isOnline(ctx, pr.UserID)
		}
		participants = append(participants, pr)
	}
	return participants
}

func getUnreadCount(ctx context.Context, deps *chatDeps, convID, userID string) int {
	var count int
	var lastReadAt sql.NullTime
	deps.db.QueryRowContext(ctx,
		`SELECT last_read_at FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
		convID, userID,
	).Scan(&lastReadAt)

	if lastReadAt.Valid {
		deps.db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND created_at > $2 AND sender_ref_id != $3`,
			convID, lastReadAt.Time, userID,
		).Scan(&count)
	} else {
		deps.db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_ref_id != $2`,
			convID, userID,
		).Scan(&count)
	}
	return count
}

func getReplyPreview(ctx context.Context, deps *chatDeps, messageID string) *replyPreview {
	var rp replyPreview
	var content sql.NullString
	err := deps.db.QueryRowContext(ctx,
		`SELECT m.id, COALESCE(p.full_name, u.username, ''), m.content
		 FROM messages m
		 LEFT JOIN users u ON u.id = m.sender_ref_id
		 LEFT JOIN user_profiles p ON p.user_id = m.sender_ref_id
		 WHERE m.id = $1`,
		messageID,
	).Scan(&rp.ID, &rp.SenderName, &content)
	if err != nil {
		return nil
	}
	if content.Valid {
		c := content.String
		if len(c) > 100 {
			c = c[:100] + "..."
		}
		rp.Content = &c
	}
	return &rp
}

// getOtherParticipantLastReadAt returns the other participant's last_read_at timestamp
// in a conversation, used to determine read status for the current user's messages.
func getOtherParticipantLastReadAt(ctx context.Context, deps *chatDeps, convID, userID string) *time.Time {
	var lastReadAt sql.NullTime
	deps.db.QueryRowContext(ctx,
		`SELECT last_read_at FROM conversation_participants
		 WHERE conversation_id = $1 AND user_id != $2
		 ORDER BY last_read_at DESC NULLS LAST
		 LIMIT 1`,
		convID, userID,
	).Scan(&lastReadAt)
	if lastReadAt.Valid {
		return &lastReadAt.Time
	}
	return nil
}

func getMessageReactions(ctx context.Context, deps *chatDeps, messageID string) []reactionResponse {
	rows, err := deps.db.QueryContext(ctx,
		`SELECT emoji, array_agg(user_id::text), COUNT(*)
		 FROM message_reactions WHERE message_id = $1
		 GROUP BY emoji`, messageID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var reactions []reactionResponse
	for rows.Next() {
		var r reactionResponse
		var usersStr string
		if err := rows.Scan(&r.Emoji, &usersStr, &r.Count); err != nil {
			continue
		}
		// Parse PostgreSQL array: {uuid1,uuid2}
		usersStr = strings.Trim(usersStr, "{}")
		if usersStr != "" {
			r.Users = strings.Split(usersStr, ",")
		}
		reactions = append(reactions, r)
	}
	return reactions
}

// extractPathParam extracts a segment from a URL path between prefix and suffix
func extractPathParam(path, prefix, suffix string) string {
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	rest := strings.TrimPrefix(path, prefix)
	if suffix != "" {
		rest = strings.TrimSuffix(rest, suffix)
	}
	// Handle trailing slashes and extra path segments
	if idx := strings.Index(rest, "/"); idx >= 0 && suffix == "" {
		rest = rest[:idx]
	}
	return strings.TrimSpace(rest)
}
