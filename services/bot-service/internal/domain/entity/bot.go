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

// Bot represents an AI bot owned by a service provider.
type Bot struct {
	ID                  string
	ServiceProviderID   string
	Name                string
	AvatarURL           string
	Purpose             string
	Department          string
	IndustryProfileID   string
	Status              BotStatus
	CreatedBySPUserID   string
	CreatedAt           time.Time
	UpdatedAt           time.Time
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
	ID              string
	BotID           string
	ConversationID  string
	UserID          string
	ActionType      string
	ToolUsed        string
	InputSummary    string
	OutputSummary   string
	PolicyDecision  string
	PolicyReason    string
	DurationMS      int
	Success         bool
	ErrorMessage    string
	CreatedAt       time.Time
}

// BotAnalytics holds aggregated analytics for a bot.
type BotAnalytics struct {
	BotID                  string
	TotalConversations     int
	TotalMessagesSent      int
	TotalMessagesReceived  int
	TotalActionsExecuted   int
	TotalEscalations       int
	AvgResponseTimeMS      int
	AvgTurnsPerConversation float64
	EscalationRate         float64
	ResolutionRate         float64
	SatisfactionScore      float64
	LastActiveAt           *time.Time
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
}
