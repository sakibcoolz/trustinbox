package n8n

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// Client is a lightweight HTTP client for triggering n8n webhook workflows
// and receiving their synchronous responses.
//
// Security:
//   - All outbound requests are signed with HMAC-SHA256 using the shared secret.
//   - The n8n workflow is expected to verify the X-TrustInbox-Signature header.
//   - The base URL must point to the private network n8n instance (never public).
type Client struct {
	baseURL    string
	secret     string
	httpClient *http.Client
	log        *zap.Logger
}

// NewClient creates a new n8n webhook client.
// baseURL example: "http://n8n:5678"  (internal Docker network address)
// secret: shared HMAC secret configured on the n8n workflow credential.
func NewClient(baseURL, secret string, log *zap.Logger) *Client {
	return &Client{
		baseURL: baseURL,
		secret:  secret,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		log: log,
	}
}

// TriggerRequest is the payload sent to an n8n webhook.
type TriggerRequest struct {
	WorkflowID        string          `json:"workflowId"`
	BotID             string          `json:"botId"`
	ServiceProvidedID string          `json:"serviceProviderId"`
	ConversationID    string          `json:"conversationId"`
	UserID            string          `json:"userId"`
	ResumeCallbackURL string          `json:"resumeCallbackUrl,omitempty"` // set for async flows
	InputData         json.RawMessage `json:"inputData"`
}

// TriggerResponse is the JSON body returned synchronously by the n8n webhook.
type TriggerResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error,omitempty"`
}

// Trigger fires an n8n webhook and waits for a synchronous response.
// webhookPath is the relative path registered on n8n, e.g. "/webhook/abc123".
func (c *Client) Trigger(ctx context.Context, webhookPath string, req *TriggerRequest) (*TriggerResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "n8n.Client.Trigger",
		attribute.String("workflow_id", req.WorkflowID),
		attribute.String("bot_id", req.BotID),
	)
	defer span.End()

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("n8n trigger: marshal request: %w", err)
	}

	url := c.baseURL + webhookPath
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("n8n trigger: create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	c.addSignatureHeaders(httpReq, body)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		tracing.SetError(ctx, err)
		return nil, fmt.Errorf("n8n trigger: http call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // max 1 MB
	if err != nil {
		return nil, fmt.Errorf("n8n trigger: read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.log.Warn("n8n webhook returned non-2xx",
			zap.Int("status", resp.StatusCode),
			zap.String("workflow_id", req.WorkflowID),
			zap.String("body", string(respBody)),
		)
		return nil, fmt.Errorf("n8n trigger: unexpected status %d", resp.StatusCode)
	}

	var result TriggerResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		// n8n may return raw JSON — wrap it
		result = TriggerResponse{
			Success: true,
			Data:    respBody,
		}
	}
	return &result, nil
}

// ─── Signature helpers ────────────────────────────────────────────────────────

// addSignatureHeaders adds HMAC-SHA256 signing headers so the n8n workflow
// can verify the request origin.
//
// Headers added:
//
//	X-TrustInbox-Timestamp  — Unix timestamp (seconds)
//	X-TrustInbox-Signature  — hex(HMAC-SHA256(secret, "timestamp.body"))
func (c *Client) addSignatureHeaders(r *http.Request, body []byte) {
	if c.secret == "" {
		return
	}
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	r.Header.Set("X-TrustInbox-Timestamp", ts)

	mac := hmac.New(sha256.New, []byte(c.secret))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	r.Header.Set("X-TrustInbox-Signature", hex.EncodeToString(mac.Sum(nil)))
}
