package entity

import "time"

// BotStatus represents the lifecycle state of a bot.
type BotStatus string

const (
	BotStatusDraft    BotStatus = "DRAFT"
	BotStatusActive   BotStatus = "ACTIVE"
	BotStatusPaused   BotStatus = "PAUSED"
	BotStatusArchived BotStatus = "ARCHIVED"
)

// AgentType classifies a bot's role within the manager agent suite.
type AgentType string

const (
	AgentTypeGeneral               AgentType = "GENERAL"
	AgentTypeManager               AgentType = "MANAGER"
	AgentTypeDocumentationWriter   AgentType = "DOCUMENTATION_WRITER"
	AgentTypeCustomerService       AgentType = "CUSTOMER_SERVICE"
	AgentTypeAppointmentScheduling AgentType = "APPOINTMENT_SCHEDULING"
	AgentTypePayment               AgentType = "PAYMENT"
	AgentTypeOrderAccepting        AgentType = "ORDER_ACCEPTING"
	AgentTypeProductShowcase       AgentType = "PRODUCT_SHOWCASE"
)

// Bot represents an AI bot owned by a service provider.
type Bot struct {
	ID                string
	ServiceProviderID string
	Name              string
	AvatarURL         string
	Purpose           string
	Department        string
	IndustryProfileID string
	Status            BotStatus
	CreatedBySPUserID string
	CreatedAt         time.Time
	UpdatedAt         time.Time
	// Agent suite fields
	AgentType    AgentType
	ManagerBotID string // set on sub-agents; empty on GENERAL/MANAGER bots
}

// BotConfiguration holds the behavioral configuration for a bot.
type BotConfiguration struct {
	BotID                    string
	Tone                     string
	WritingStyle             string
	SupportedLanguages       []string
	WorkingHoursStart        string
	WorkingHoursEnd          string
	WorkingDays              []int
	MaxTurnsBeforeEscalation int
	EscalationRules          string // JSON
	HumanHandoffPolicy       string // JSON
	ApprovalPolicy           string // JSON
	FallbackActions          string // JSON
	ComplianceRestrictions   string // JSON
	CustomSystemPrompt       string
	AIModel                  string
	MaxResponseTokens        int
	Temperature              float64
}

// BotPermission defines which tools a bot is allowed to use.
type BotPermission struct {
	ID          string
	BotID       string
	ToolName    string
	IsAllowed   bool
	Constraints string // JSON
}

// KnowledgeSourceType identifies the type of knowledge source.
type KnowledgeSourceType string

const (
	KnowledgeSourceDocument KnowledgeSourceType = "DOCUMENT"
	KnowledgeSourceURL      KnowledgeSourceType = "URL"
	KnowledgeSourceText     KnowledgeSourceType = "TEXT"
	KnowledgeSourceFAQ      KnowledgeSourceType = "FAQ"
	KnowledgeSourceAPI      KnowledgeSourceType = "API"
	KnowledgeSourceWorkflow KnowledgeSourceType = "WORKFLOW"
)

// KnowledgeSourceStatus represents the processing status.
type KnowledgeSourceStatus string

const (
	KnowledgeSourcePending    KnowledgeSourceStatus = "PENDING"
	KnowledgeSourceProcessing KnowledgeSourceStatus = "PROCESSING"
	KnowledgeSourceActive     KnowledgeSourceStatus = "ACTIVE"
	KnowledgeSourceFailed     KnowledgeSourceStatus = "FAILED"
)

// KnowledgeSource represents a knowledge attachment for a bot.
type KnowledgeSource struct {
	ID          string
	BotID       string
	SourceType  KnowledgeSourceType
	Name        string
	Description string
	Content     string
	S3Key       string
	FileType    string
	FileSize    int64
	ChunkCount  int
	Status      KnowledgeSourceStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// BotActionLog records a bot action for audit purposes.
type BotActionLog struct {
	ID                string
	BotID             string
	ServiceProviderID string
	ConversationID    string
	UserID            string
	ThreadID          string
	ActionType        string
	ToolUsed          string
	InputSummary      string
	OutputSummary     string
	PolicyDecision    string
	PolicyReason      string
	DurationMS        int
	Success           bool
	ErrorMessage      string
	CreatedAt         time.Time
}

// BotAnalytics holds aggregated analytics for a bot.
type BotAnalytics struct {
	BotID                   string
	TotalConversations      int
	TotalMessagesSent       int
	TotalMessagesReceived   int
	TotalActionsExecuted    int
	TotalEscalations        int
	AvgResponseTimeMS       int
	AvgTurnsPerConversation float64
	EscalationRate          float64
	ResolutionRate          float64
	SatisfactionScore       float64
	LastActiveAt            *time.Time
}

// AllowedBotTools lists all platform-approved tools a bot can use.
var AllowedBotTools = []string{
	"get_customer_profile",
	"get_customer_consent",
	"get_customer_availability",
	"evaluate_policy",
	"send_notification",
	"send_message",
	"request_callback",
	"share_document",
	"get_conversation_summary",
	"escalate_to_human",
	"execute_workflow",
	"delegate_to_agent",
}

// DefaultToolsForAgentType returns the default allowed tools for a given agent type.
func DefaultToolsForAgentType(agentType AgentType) []string {
	switch agentType {
	case AgentTypeManager:
		return []string{"delegate_to_agent", "get_customer_profile", "evaluate_policy", "get_conversation_summary"}
	case AgentTypeDocumentationWriter:
		return []string{"share_document", "get_conversation_summary"}
	case AgentTypeCustomerService:
		return []string{"get_customer_profile", "get_customer_consent", "send_notification", "send_message", "escalate_to_human"}
	case AgentTypeAppointmentScheduling:
		return []string{"get_customer_availability", "request_callback", "send_notification"}
	case AgentTypePayment:
		return []string{"evaluate_policy", "send_notification", "send_message"}
	case AgentTypeOrderAccepting:
		return []string{"send_notification", "send_message", "share_document"}
	case AgentTypeProductShowcase:
		return []string{"share_document", "send_message", "get_conversation_summary"}
	default:
		return []string{"get_customer_profile", "send_message"}
	}
}
