package entity

import "time"

// BotWorkflowConfig maps a named workflow ID to an n8n webhook path for a specific bot.
// Service providers register their n8n workflows here so bots can trigger them.
type BotWorkflowConfig struct {
	ID           string
	BotID        string
	WorkflowID   string // logical identifier chosen by the SP (e.g. "crm-lookup")
	WorkflowName string
	WebhookPath  string // relative path on the n8n instance, e.g. "/webhook/abc123"
	Description  string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// BotWorkflowSuspension tracks an async workflow execution pending an n8n resume callback.
type BotWorkflowSuspension struct {
	ID             string
	ResumeToken    string // random 32-byte hex token embedded in the n8n resume callback URL
	BotID          string
	ConversationID string
	UserID         string
	WorkflowID     string
	Status         string // PENDING | RESUMED | EXPIRED
	ResultJSON     string
	CreatedAt      time.Time
	ExpiresAt      time.Time
	ResumedAt      *time.Time
}
