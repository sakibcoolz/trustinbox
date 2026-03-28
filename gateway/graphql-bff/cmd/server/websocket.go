package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"go.uber.org/zap"
)

// ==================== WebSocket Protocol ====================

// Client → Server message types
const (
	WSSendMessage    = "send_message"
	WSTyping         = "typing"
	WSStopTyping     = "stop_typing"
	WSMarkRead       = "mark_read"
	WSEditMessage    = "edit_message"
	WSDeleteMessage  = "delete_message"
	WSAddReaction    = "add_reaction"
	WSRemoveReaction = "remove_reaction"
	WSPresence       = "presence"
)

// Server → Client event types
const (
	WSEventNewMessage      = "new_message"
	WSEventTyping          = "typing"
	WSEventStopTyping      = "stop_typing"
	WSEventMessageRead     = "message_read"
	WSEventMessageEdited   = "message_edited"
	WSEventMessageDeleted  = "message_deleted"
	WSEventReactionAdded   = "reaction_added"
	WSEventReactionRemoved = "reaction_removed"
	WSEventPresence        = "presence_update"
	WSEventError           = "error"
)

// wsIncoming is the envelope for client → server messages
type wsIncoming struct {
	Type           string          `json:"type"`
	ConversationID string          `json:"conversationId,omitempty"`
	MessageID      string          `json:"messageId,omitempty"`
	Content        string          `json:"content,omitempty"`
	ReplyToID      string          `json:"replyToId,omitempty"`
	AttachmentIDs  []string        `json:"attachmentIds,omitempty"`
	Emoji          string          `json:"emoji,omitempty"`
	Status         string          `json:"status,omitempty"`
	Extra          json.RawMessage `json:"extra,omitempty"`
}

// wsOutgoing is the envelope for server → client messages
type wsOutgoing struct {
	Type           string      `json:"type"`
	ConversationID string      `json:"conversationId,omitempty"`
	MessageID      string      `json:"messageId,omitempty"`
	SenderID       string      `json:"senderId,omitempty"`
	SenderName     string      `json:"senderName,omitempty"`
	Content        string      `json:"content,omitempty"`
	ReplyToID      string      `json:"replyToId,omitempty"`
	Emoji          string      `json:"emoji,omitempty"`
	Status         string      `json:"status,omitempty"`
	Attachments    interface{} `json:"attachments,omitempty"`
	Timestamp      string      `json:"timestamp,omitempty"`
	UserID         string      `json:"userId,omitempty"`
	Online         bool        `json:"online,omitempty"`
	LastReadAt     string      `json:"lastReadAt,omitempty"`
	MessageType    string      `json:"messageType,omitempty"`
}

// ==================== WebSocket Client ====================

type wsClient struct {
	hub    *wsHub
	conn   *websocket.Conn
	userID string
	send   chan []byte
}

const (
	wsWriteWait  = 10 * time.Second
	wsPongWait   = 60 * time.Second
	wsPingPeriod = (wsPongWait * 9) / 10
	wsMaxMessage = 64 * 1024 // 64KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (c *wsClient) readPump(deps *chatDeps) {
	defer func() {
		// Publish offline presence via Redis Pub/Sub so all BFF instances
		// notify their locally-connected friends via SSE.
		go func() {
			ctxBg := context.Background()
			participants := getUserFriendIDs(ctxBg, deps, c.userID)
			deps.hub.broadcast(ctxBg, participants, wsOutgoing{
				Type:   WSEventPresence,
				UserID: c.userID,
				Online: false,
			})
			deps.hub.publishPresence(ctxBg, c.userID, false)
		}()
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(wsMaxMessage)
	c.conn.SetReadDeadline(time.Now().Add(wsPongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(wsPongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg wsIncoming
		if err := json.Unmarshal(message, &msg); err != nil {
			c.sendError("invalid message format")
			continue
		}

		c.handleMessage(msg, deps)
	}
}

func (c *wsClient) writePump() {
	ticker := time.NewTicker(wsPingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *wsClient) sendJSON(v interface{}) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	select {
	case c.send <- data:
	default:
		// Buffer full, drop
	}
}

func (c *wsClient) sendError(msg string) {
	c.sendJSON(wsOutgoing{Type: WSEventError, Content: msg})
}

// ==================== WebSocket Hub ====================

// presenceEvent is published to the Redis "presence:events" channel so every
// BFF instance can push SSE notifications to its locally-connected friends.
type presenceEvent struct {
	InstanceID string `json:"instanceId"`
	UserID     string `json:"userId"`
	Online     bool   `json:"online"`
}

type wsHub struct {
	mu         sync.RWMutex
	clients    map[string]map[*wsClient]bool // userID -> set of clients
	register   chan *wsClient
	unregister chan *wsClient
	rdb        *redis.Client
	db         *sql.DB
	sseHub     *sseHub
	log        *zap.Logger
	instanceID string // unique per process, used to skip self-published Redis messages
}

func newWSHub(rdb *redis.Client, db *sql.DB, sh *sseHub, log *zap.Logger) *wsHub {
	return &wsHub{
		clients:    make(map[string]map[*wsClient]bool),
		register:   make(chan *wsClient),
		unregister: make(chan *wsClient),
		rdb:        rdb,
		db:         db,
		sseHub:     sh,
		log:        log,
		instanceID: uuid.New().String(),
	}
}

func (h *wsHub) run(ctx context.Context) {
	// Subscribe to Redis Pub/Sub channels:
	//  - "chat:broadcast"    → cross-instance WS fan-out for chat events
	//  - "presence:events"   → cross-instance presence online/offline delivery via SSE
	pubsub := h.rdb.Subscribe(ctx, "chat:broadcast", "presence:events")
	ch := pubsub.Channel()

	go func() {
		for msg := range ch {
			switch msg.Channel {
			case "chat:broadcast":
				// Deliver WS messages to locally-connected users from another instance
				var envelope struct {
					InstanceID    string     `json:"instanceId"`
					TargetUserIDs []string   `json:"targetUserIds"`
					Event         wsOutgoing `json:"event"`
				}
				if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
					continue
				}
				if envelope.InstanceID == h.instanceID {
					continue
				}
				for _, uid := range envelope.TargetUserIDs {
					h.sendLocal(uid, envelope.Event)
				}

			case "presence:events":
				// Deliver SSE presence updates to locally-connected friends on this instance
				var evt presenceEvent
				if err := json.Unmarshal([]byte(msg.Payload), &evt); err != nil {
					continue
				}
				go h.deliverPresenceSSE(ctx, evt)
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			pubsub.Close()
			return
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.userID] == nil {
				h.clients[client.userID] = make(map[*wsClient]bool)
			}
			h.clients[client.userID][client] = true
			h.mu.Unlock()

			// Set user online in Redis, then broadcast presence transition
			h.rdb.Set(ctx, "presence:"+client.userID, "online", 2*time.Minute)
			h.log.Info("WS client connected", zap.String("user_id", client.userID))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.userID]; ok {
				delete(clients, client)
				if len(clients) == 0 {
					delete(h.clients, client.userID)
					// Set user offline in Redis
					h.rdb.Set(ctx, "presence:"+client.userID, "offline", 0)
					h.rdb.Set(ctx, "presence:lastseen:"+client.userID, time.Now().Format(time.RFC3339), 0)
				}
			}
			close(client.send)
			h.mu.Unlock()
			h.log.Info("WS client disconnected", zap.String("user_id", client.userID))
		}
	}
}

// publishPresence sets the Redis presence state for userID and publishes a
// presenceEvent to the "presence:events" channel so all BFF instances deliver
// SSE notifications to their locally-connected friends of this user.
func (h *wsHub) publishPresence(ctx context.Context, userID string, online bool) {
	evt := presenceEvent{
		InstanceID: h.instanceID,
		UserID:     userID,
		Online:     online,
	}
	data, _ := json.Marshal(evt)
	h.rdb.Publish(ctx, "presence:events", string(data))
}

// deliverPresenceSSE looks up the friends of evt.UserID and pushes an SSE
// presence_update event to each friend that has an active SSE connection on
// THIS instance.  Called from the presence:events pub/sub subscriber.
func (h *wsHub) deliverPresenceSSE(ctx context.Context, evt presenceEvent) {
	rows, err := h.db.QueryContext(ctx,
		`SELECT friend_id FROM friendships WHERE user_id = $1`, evt.UserID)
	if err != nil {
		return
	}
	defer rows.Close()
	payload := map[string]interface{}{
		"type":   WSEventPresence,
		"userId": evt.UserID,
		"online": evt.Online,
	}
	for rows.Next() {
		var friendID string
		if rows.Scan(&friendID) == nil {
			h.sseHub.send(friendID, "presence_update", payload)
		}
	}
}

// sendLocal sends to all local connections of a user
func (h *wsHub) sendLocal(userID string, event wsOutgoing) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients[userID] {
		select {
		case client.send <- data:
		default:
		}
	}
}

// broadcast sends event to multiple users via Redis Pub/Sub (works across instances)
func (h *wsHub) broadcast(ctx context.Context, targetUserIDs []string, event wsOutgoing) {
	// First send locally for speed
	for _, uid := range targetUserIDs {
		h.sendLocal(uid, event)
	}

	// Then publish to Redis for other instances
	envelope, _ := json.Marshal(map[string]interface{}{
		"instanceId":    h.instanceID,
		"targetUserIds": targetUserIDs,
		"event":         event,
	})
	h.rdb.Publish(ctx, "chat:broadcast", envelope)
}

// isOnline checks presence in Redis
func (h *wsHub) isOnline(ctx context.Context, userID string) bool {
	val, err := h.rdb.Get(ctx, "presence:"+userID).Result()
	if err != nil {
		return false
	}
	return val == "online"
}

// refreshPresence keeps the presence TTL alive (called periodically)
func (h *wsHub) refreshPresence(ctx context.Context) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for userID := range h.clients {
		h.rdb.Set(ctx, "presence:"+userID, "online", 2*time.Minute)
	}
}

// ==================== Message Handlers ====================

type chatDeps struct {
	db       *sql.DB
	hub      *wsHub
	sseHub   *sseHub
	log      *zap.Logger
	tokenSvc *jwt.TokenService
}

func (c *wsClient) handleMessage(msg wsIncoming, deps *chatDeps) {
	ctx := context.Background()

	switch msg.Type {
	case WSSendMessage:
		c.handleSendMessage(ctx, msg, deps)
	case WSTyping:
		c.handleTyping(ctx, msg, deps, true)
	case WSStopTyping:
		c.handleTyping(ctx, msg, deps, false)
	case WSMarkRead:
		c.handleMarkRead(ctx, msg, deps)
	case WSEditMessage:
		c.handleEditMessage(ctx, msg, deps)
	case WSDeleteMessage:
		c.handleDeleteMessage(ctx, msg, deps)
	case WSAddReaction:
		c.handleReaction(ctx, msg, deps, true)
	case WSRemoveReaction:
		c.handleReaction(ctx, msg, deps, false)
	default:
		c.sendError("unknown message type: " + msg.Type)
	}
}

func (c *wsClient) handleSendMessage(ctx context.Context, msg wsIncoming, deps *chatDeps) {
	if msg.ConversationID == "" || msg.Content == "" {
		c.sendError("conversationId and content are required")
		return
	}

	// Verify user is participant
	participants := getConversationParticipants(ctx, deps, msg.ConversationID)
	if !isParticipant(c.userID, participants) {
		c.sendError("not a participant of this conversation")
		return
	}

	// Get sender name
	senderName := getUserDisplayName(ctx, deps, c.userID)

	// Determine message type
	msgType := "TEXT"
	if len(msg.AttachmentIDs) > 0 {
		msgType = "FILE"
	}

	// Insert message
	messageID := uuid.New().String()
	var replyToID interface{} = nil
	if msg.ReplyToID != "" {
		replyToID = msg.ReplyToID
	}

	now := time.Now()
	_, err := deps.db.ExecContext(ctx,
		`INSERT INTO messages (id, conversation_id, sender_type, sender_ref_id, message_type, content, reply_to_id, created_at)
		 VALUES ($1, $2, 'USER', $3, $4, $5, $6, $7)`,
		messageID, msg.ConversationID, c.userID, msgType, msg.Content, replyToID, now,
	)
	if err != nil {
		deps.log.Error("failed to insert message", zap.Error(err))
		c.sendError("failed to send message")
		return
	}

	// Link attachments if any
	if len(msg.AttachmentIDs) > 0 {
		for _, attID := range msg.AttachmentIDs {
			deps.db.ExecContext(ctx,
				`UPDATE message_attachments SET message_id = $1 WHERE id = $2`, messageID, attID)
		}
	}

	// Update conversation last_message
	preview := msg.Content
	if len(preview) > 200 {
		preview = preview[:200]
	}
	deps.db.ExecContext(ctx,
		`UPDATE conversations SET last_message_at = $1, last_message_preview = $2, updated_at = $1 WHERE id = $3`,
		now, preview, msg.ConversationID,
	)

	// Build attachments response
	var attachments []attachmentResponse
	if len(msg.AttachmentIDs) > 0 {
		attachments = getMessageAttachments(ctx, deps, messageID)
	}

	// Broadcast to all participants
	event := wsOutgoing{
		Type:           WSEventNewMessage,
		ConversationID: msg.ConversationID,
		MessageID:      messageID,
		SenderID:       c.userID,
		SenderName:     senderName,
		Content:        msg.Content,
		ReplyToID:      msg.ReplyToID,
		Attachments:    attachments,
		Timestamp:      now.Format(time.RFC3339),
		MessageType:    msgType,
		Status:         "sent",
	}

	deps.hub.broadcast(ctx, participants, event)
}

func (c *wsClient) handleTyping(ctx context.Context, msg wsIncoming, deps *chatDeps, isTyping bool) {
	if msg.ConversationID == "" {
		return
	}
	participants := getConversationParticipants(ctx, deps, msg.ConversationID)
	eventType := WSEventTyping
	if !isTyping {
		eventType = WSEventStopTyping
	}
	// Send to everyone except sender
	others := filterOut(participants, c.userID)
	senderName := getUserDisplayName(ctx, deps, c.userID)
	deps.hub.broadcast(ctx, others, wsOutgoing{
		Type:           eventType,
		ConversationID: msg.ConversationID,
		UserID:         c.userID,
		SenderName:     senderName,
	})
}

func (c *wsClient) handleMarkRead(ctx context.Context, msg wsIncoming, deps *chatDeps) {
	if msg.ConversationID == "" {
		return
	}

	now := time.Now()
	deps.db.ExecContext(ctx,
		`UPDATE conversation_participants SET last_read_at = $1, last_read_message_id = $2
		 WHERE conversation_id = $3 AND user_id = $4`,
		now, msg.MessageID, msg.ConversationID, c.userID,
	)

	participants := getConversationParticipants(ctx, deps, msg.ConversationID)
	others := filterOut(participants, c.userID)
	deps.hub.broadcast(ctx, others, wsOutgoing{
		Type:           WSEventMessageRead,
		ConversationID: msg.ConversationID,
		MessageID:      msg.MessageID,
		UserID:         c.userID,
		LastReadAt:     now.Format(time.RFC3339),
	})
}

func (c *wsClient) handleEditMessage(ctx context.Context, msg wsIncoming, deps *chatDeps) {
	if msg.MessageID == "" || msg.Content == "" {
		c.sendError("messageId and content are required")
		return
	}

	// Verify ownership
	var senderRefID, convID string
	err := deps.db.QueryRowContext(ctx,
		`SELECT sender_ref_id, conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
		msg.MessageID,
	).Scan(&senderRefID, &convID)
	if err != nil || senderRefID != c.userID {
		c.sendError("cannot edit this message")
		return
	}

	now := time.Now()
	deps.db.ExecContext(ctx,
		`UPDATE messages SET content = $1, edited_at = $2 WHERE id = $3`,
		msg.Content, now, msg.MessageID,
	)

	participants := getConversationParticipants(ctx, deps, convID)
	deps.hub.broadcast(ctx, participants, wsOutgoing{
		Type:           WSEventMessageEdited,
		ConversationID: convID,
		MessageID:      msg.MessageID,
		Content:        msg.Content,
		Timestamp:      now.Format(time.RFC3339),
		SenderID:       c.userID,
	})
}

func (c *wsClient) handleDeleteMessage(ctx context.Context, msg wsIncoming, deps *chatDeps) {
	if msg.MessageID == "" {
		c.sendError("messageId is required")
		return
	}

	var senderRefID, convID string
	err := deps.db.QueryRowContext(ctx,
		`SELECT sender_ref_id, conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
		msg.MessageID,
	).Scan(&senderRefID, &convID)
	if err != nil || senderRefID != c.userID {
		c.sendError("cannot delete this message")
		return
	}

	now := time.Now()
	deps.db.ExecContext(ctx,
		`UPDATE messages SET deleted_at = $1, content = NULL WHERE id = $2`,
		now, msg.MessageID,
	)

	participants := getConversationParticipants(ctx, deps, convID)
	deps.hub.broadcast(ctx, participants, wsOutgoing{
		Type:           WSEventMessageDeleted,
		ConversationID: convID,
		MessageID:      msg.MessageID,
		SenderID:       c.userID,
		Timestamp:      now.Format(time.RFC3339),
	})
}

func (c *wsClient) handleReaction(ctx context.Context, msg wsIncoming, deps *chatDeps, add bool) {
	if msg.MessageID == "" || msg.Emoji == "" {
		c.sendError("messageId and emoji are required")
		return
	}

	// Get conversation from message
	var convID string
	err := deps.db.QueryRowContext(ctx,
		`SELECT conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
		msg.MessageID,
	).Scan(&convID)
	if err != nil {
		c.sendError("message not found")
		return
	}

	participants := getConversationParticipants(ctx, deps, convID)
	if !isParticipant(c.userID, participants) {
		c.sendError("not a participant")
		return
	}

	if add {
		deps.db.ExecContext(ctx,
			`INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
			 ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
			msg.MessageID, c.userID, msg.Emoji,
		)
	} else {
		deps.db.ExecContext(ctx,
			`DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
			msg.MessageID, c.userID, msg.Emoji,
		)
	}

	eventType := WSEventReactionAdded
	if !add {
		eventType = WSEventReactionRemoved
	}
	senderName := getUserDisplayName(ctx, deps, c.userID)
	deps.hub.broadcast(ctx, participants, wsOutgoing{
		Type:           eventType,
		ConversationID: convID,
		MessageID:      msg.MessageID,
		Emoji:          msg.Emoji,
		UserID:         c.userID,
		SenderName:     senderName,
	})
}

// ==================== Helpers ====================

func getConversationParticipants(ctx context.Context, deps *chatDeps, convID string) []string {
	rows, err := deps.db.QueryContext(ctx,
		`SELECT user_id FROM conversation_participants WHERE conversation_id = $1`, convID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

func getUserDisplayName(ctx context.Context, deps *chatDeps, userID string) string {
	var name string
	deps.db.QueryRowContext(ctx,
		`SELECT COALESCE(p.full_name, u.username) FROM users u
		 LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = $1`, userID,
	).Scan(&name)
	return name
}

func isParticipant(userID string, participants []string) bool {
	for _, p := range participants {
		if p == userID {
			return true
		}
	}
	return false
}

func filterOut(ids []string, exclude string) []string {
	var out []string
	for _, id := range ids {
		if id != exclude {
			out = append(out, id)
		}
	}
	return out
}

type attachmentResponse struct {
	ID           string `json:"id"`
	FileName     string `json:"fileName"`
	FileType     string `json:"fileType"`
	FileSize     int64  `json:"fileSize"`
	URL          string `json:"url,omitempty"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
}

func getMessageAttachments(ctx context.Context, deps *chatDeps, messageID string) []attachmentResponse {
	rows, err := deps.db.QueryContext(ctx,
		`SELECT id, file_name, file_type, file_size, s3_key, COALESCE(thumbnail_s3_key, '')
		 FROM message_attachments WHERE message_id = $1`, messageID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var atts []attachmentResponse
	for rows.Next() {
		var a attachmentResponse
		var s3Key, thumbKey string
		if rows.Scan(&a.ID, &a.FileName, &a.FileType, &a.FileSize, &s3Key, &thumbKey) == nil {
			a.URL = fmt.Sprintf("/api/files/%s", a.ID)
			if thumbKey != "" {
				a.ThumbnailURL = fmt.Sprintf("/api/files/%s/thumb", a.ID)
			}
			atts = append(atts, a)
		}
	}
	return atts
}

// ==================== WebSocket HTTP Handler ====================

func handleWebSocket(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Auth via query param (WebSocket doesn't support custom headers)
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		claims, err := deps.tokenSvc.ValidateAccessToken(tokenStr)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			deps.log.Error("ws upgrade failed", zap.Error(err))
			return
		}

		client := &wsClient{
			hub:    deps.hub,
			conn:   conn,
			userID: claims.UserID,
			send:   make(chan []byte, 256),
		}

		deps.hub.register <- client

		// Publish online presence via Redis Pub/Sub so all BFF instances
		// notify their locally-connected friends via SSE.
		go func() {
			ctxBg := context.Background()
			participants := getUserFriendIDs(ctxBg, deps, claims.UserID)
			deps.hub.broadcast(ctxBg, participants, wsOutgoing{
				Type:   WSEventPresence,
				UserID: claims.UserID,
				Online: true,
			})
			deps.hub.publishPresence(ctxBg, claims.UserID, true)
		}()

		go client.writePump()
		go client.readPump(deps)
	}
}

func getUserFriendIDs(ctx context.Context, deps *chatDeps, userID string) []string {
	rows, err := deps.db.QueryContext(ctx,
		`SELECT friend_id FROM friendships WHERE user_id = $1`, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

// handlePresenceQuery returns online status for a list of user IDs
func handlePresenceQuery(deps *chatDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		_, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		idsParam := strings.TrimSpace(r.URL.Query().Get("ids"))
		if idsParam == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "ids parameter required"})
			return
		}

		ids := strings.Split(idsParam, ",")
		if len(ids) > 100 {
			ids = ids[:100]
		}

		ctx := r.Context()
		results := make(map[string]interface{})
		for _, id := range ids {
			id = strings.TrimSpace(id)
			if id == "" {
				continue
			}
			online := deps.hub.isOnline(ctx, id)
			lastSeen := ""
			if !online {
				lastSeen, _ = deps.hub.rdb.Get(ctx, "presence:lastseen:"+id).Result()
			}
			results[id] = map[string]interface{}{
				"online":   online,
				"lastSeen": lastSeen,
			}
		}

		writeJSON(w, http.StatusOK, results)
	}
}

// handlePresenceHeartbeat keeps the current user marked as "online" in Redis.
// Called by the frontend every ~45 s via a plain HTTPS fetch (no WebSocket needed).
func handlePresenceHeartbeat(deps *chatDeps) http.HandlerFunc {
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
		ctx := r.Context()
		wasOffline, _ := deps.hub.rdb.Get(ctx, "presence:"+userID).Result()
		deps.hub.rdb.Set(ctx, "presence:"+userID, "online", 2*time.Minute)
		// Notify friends only when transitioning from offline → online.
		// publishPresence publishes to Redis Pub/Sub so all BFF instances deliver SSE.
		if wasOffline != "online" {
			go func() {
				ctxBg := context.Background()
				friends := getUserFriendIDs(ctxBg, deps, userID)
				deps.hub.broadcast(ctxBg, friends, wsOutgoing{
					Type:   WSEventPresence,
					UserID: userID,
					Online: true,
				})
				deps.hub.publishPresence(ctxBg, userID, true)
			}()
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

// handleXMPPWSProxy proxies the browser WebSocket connection to the local ejabberd
// WebSocket endpoint (ws://localhost:5280/ws).  This lets browsers reach ejabberd
// when the app is served from an external hostname (Tailscale, LAN, etc.) without
// requiring the browser to open a separate cross-origin / plain-WS connection.
//
// Flow:  browser  ──wss──►  BFF /api/xmpp-ws  ──ws──►  ejabberd :5280/ws
func handleXMPPWSProxy(ejabberdURL string, log *zap.Logger) http.HandlerFunc {
	// Dialer re-used across connections.
	dialer := websocket.DefaultDialer

	return func(w http.ResponseWriter, r *http.Request) {
		// Upgrade the browser connection.
		browserConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Warn("xmpp-ws proxy: upgrade failed", zap.Error(err))
			return
		}
		defer browserConn.Close()

		// Forward the Sec-WebSocket-Protocol header (XMPP requires "xmpp").
		reqHeader := http.Header{}
		if proto := r.Header.Get("Sec-Websocket-Protocol"); proto != "" {
			reqHeader.Set("Sec-Websocket-Protocol", proto)
		}

		// Dial ejabberd.
		ejConn, _, err := dialer.Dial(ejabberdURL, reqHeader)
		if err != nil {
			log.Warn("xmpp-ws proxy: dial ejabberd failed", zap.Error(err), zap.String("url", ejabberdURL))
			browserConn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "backend unavailable"))
			return
		}
		defer ejConn.Close()

		// Copy frames in both directions until either side closes.
		errc := make(chan error, 2)

		copyFrames := func(dst, src *websocket.Conn) {
			for {
				mt, msg, err := src.ReadMessage()
				if err != nil {
					errc <- err
					return
				}
				if err := dst.WriteMessage(mt, msg); err != nil {
					errc <- err
					return
				}
			}
		}

		go copyFrames(ejConn, browserConn) // browser → ejabberd
		go copyFrames(browserConn, ejConn) // ejabberd → browser

		<-errc // wait for first error (normal close or network failure)
	}
}
