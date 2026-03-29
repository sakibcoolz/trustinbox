package main

// ejabberd_rest.go
//
// Thin REST client for the ejabberd admin API (mod_http_api).
// The gateway uses it to manage MUC rooms when conversations are
// created or participants change.
//
// ejabberd admin API is reachable at http://ejabberd:5280/api
// and is protected by ACL so only internal Docker hosts can call it.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"
)

const (
	xmppDomain       = "chat.trustinbox.local"
	xmppMUCDomain    = "conference.chat.trustinbox.local"
	ejabberdAdminAPI = "http://ejabberd:5280/api"
)

// ejabberdClient wraps the ejabberd admin REST API.
type ejabberdClient struct {
	baseURL    string
	httpClient *http.Client
	log        *zap.Logger
}

func newEjabberdClient(baseURL string, log *zap.Logger) *ejabberdClient {
	return &ejabberdClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		log: log,
	}
}

func (c *ejabberdClient) post(ctx context.Context, endpoint string, body interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	url := c.baseURL + endpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("ejabberd api %s returned %d", endpoint, resp.StatusCode)
	}
	return nil
}

// ServiceRoomName returns the canonical MUC room name for a service provider conversation.
// Format: svc-<conversationID>
func ServiceRoomName(conversationID string) string {
	return "svc-" + conversationID
}

// ServiceRoomJID returns the full JID of the MUC room.
func ServiceRoomJID(conversationID string) string {
	return ServiceRoomName(conversationID) + "@" + xmppMUCDomain
}

// UserJID returns the full bare JID for a user.
func UserJID(userID string) string {
	return userID + "@" + xmppDomain
}

// CreateServiceRoom creates a persistent MUC room for a service provider conversation.
// Called when a new service provider conversation is initialised.
func (c *ejabberdClient) CreateServiceRoom(ctx context.Context, conversationID string) error {
	body := map[string]string{
		"name":    ServiceRoomName(conversationID),
		"service": xmppMUCDomain,
		"host":    xmppDomain,
	}
	if err := c.post(ctx, "/create_room", body); err != nil {
		c.log.Error("ejabberd: failed to create room",
			zap.String("conversation_id", conversationID),
			zap.Error(err),
		)
		return err
	}
	c.log.Info("ejabberd: room created", zap.String("conversation_id", conversationID))
	return nil
}

// InviteToRoom subscribes a user to a MUC room (XEP-0054 subscription).
// This makes the room appear in the user's room list without requiring
// an explicit join from the client.
func (c *ejabberdClient) InviteToRoom(ctx context.Context, conversationID, userID, nick string) error {
	body := map[string]string{
		"user":  UserJID(userID),
		"nick":  nick,
		"room":  ServiceRoomJID(conversationID),
		"nodes": "urn:xmpp:mucsub:nodes:messages,urn:xmpp:mucsub:nodes:presences",
	}
	if err := c.post(ctx, "/subscribe_room", body); err != nil {
		c.log.Error("ejabberd: failed to invite to room",
			zap.String("conversation_id", conversationID),
			zap.String("user_id", userID),
			zap.Error(err),
		)
		return err
	}
	c.log.Info("ejabberd: user subscribed to room",
		zap.String("user_id", userID),
		zap.String("conversation_id", conversationID),
	)
	return nil
}

// KickFromRoom unsubscribes a user from a MUC room.
func (c *ejabberdClient) KickFromRoom(ctx context.Context, conversationID, userID string) error {
	body := map[string]string{
		"user": UserJID(userID),
		"room": ServiceRoomJID(conversationID),
	}
	if err := c.post(ctx, "/unsubscribe_room", body); err != nil {
		c.log.Error("ejabberd: failed to kick from room",
			zap.String("conversation_id", conversationID),
			zap.String("user_id", userID),
			zap.Error(err),
		)
		return err
	}
	return nil
}

// SendSystemMessage sends a system-level message to a MUC room.
// Used to notify participants of policy decisions, status changes, etc.
func (c *ejabberdClient) SendSystemMessage(ctx context.Context, conversationID, body string) error {
	payload := map[string]string{
		"from": "admin@" + xmppDomain,
		"to":   ServiceRoomJID(conversationID),
		"stanza": fmt.Sprintf(
			`<message type="groupchat"><body>%s</body></message>`,
			body,
		),
	}
	if err := c.post(ctx, "/send_stanza", payload); err != nil {
		c.log.Error("ejabberd: failed to send system message",
			zap.String("conversation_id", conversationID),
			zap.Error(err),
		)
		return err
	}
	return nil
}

// DestroyRoom permanently destroys a MUC room (soft-delete conversations).
func (c *ejabberdClient) DestroyRoom(ctx context.Context, conversationID string) error {
	body := map[string]string{
		"name":    ServiceRoomName(conversationID),
		"service": xmppMUCDomain,
	}
	if err := c.post(ctx, "/destroy_room", body); err != nil {
		c.log.Error("ejabberd: failed to destroy room",
			zap.String("conversation_id", conversationID),
			zap.Error(err),
		)
		return err
	}
	c.log.Info("ejabberd: room destroyed", zap.String("conversation_id", conversationID))
	return nil
}
