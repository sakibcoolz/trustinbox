package entity

import "time"

// AgentSuiteStatus represents the lifecycle state of an agent suite.
type AgentSuiteStatus string

const (
	AgentSuiteStatusActive      AgentSuiteStatus = "ACTIVE"
	AgentSuiteStatusPaused      AgentSuiteStatus = "PAUSED"
	AgentSuiteStatusDeactivated AgentSuiteStatus = "DEACTIVATED"
)

// AgentSuite groups a Manager bot with its specialized sub-agents for a service provider.
type AgentSuite struct {
	ID                string
	ServiceProviderID string
	ManagerBotID      string
	Status            AgentSuiteStatus
	ProvisionedAt     time.Time
	UpdatedAt         time.Time
	// Populated on read
	Manager *Bot
	Agents  []*Bot
}

// AgentDelegationLog records a delegation from the Manager bot to a sub-agent.
type AgentDelegationLog struct {
	ID                string
	ManagerBotID      string
	TargetBotID       string
	ServiceProviderID string
	UserID            string
	ConversationID    string
	ThreadID          string
	DelegationDepth   int
	IntentDetected    string
	ConfidenceScore   float64
	InputSummary      string
	OutputSummary     string
	DurationMS        int
	Success           bool
	ErrorMessage      string
	CreatedAt         time.Time
}
