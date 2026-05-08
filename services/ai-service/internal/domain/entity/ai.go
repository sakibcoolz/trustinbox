package entity

import "time"

// LLMProvider identifies the LLM backend provider.
type LLMProvider string

const (
	ProviderOpenAI    LLMProvider = "openai"
	ProviderAnthropic LLMProvider = "anthropic"
)

// MessageRole identifies the role of a chat message.
type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
	RoleTool      MessageRole = "tool"
)

// ChatMessage represents a single message in a conversation.
type ChatMessage struct {
	Role       MessageRole
	Content    string
	Name       string // optional tool name
	ToolCallID string
}

// ToolDefinition defines a tool that the LLM can invoke.
type ToolDefinition struct {
	Name           string
	Description    string
	ParametersJSON string // JSON Schema for tool parameters
}

// ToolCall represents the LLM's request to invoke a tool.
type ToolCall struct {
	ID            string
	Name          string
	ArgumentsJSON string
}

// CompletionRequest holds input for an LLM chat completion.
type CompletionRequest struct {
	Provider          LLMProvider
	Model             string
	Messages          []ChatMessage
	Tools             []ToolDefinition
	Temperature       float64
	MaxTokens         int
	BotID             string
	ServiceProviderID string
}

// CompletionResponse holds the LLM completion output.
type CompletionResponse struct {
	Content          string
	ToolCalls        []ToolCall
	FinishReason     string // stop, tool_calls, length
	PromptTokens     int
	CompletionTokens int
	Model            string
	Provider         LLMProvider
}

// ToolExecutionRequest holds the input for executing a tool.
type ToolExecutionRequest struct {
	BotID             string
	ServiceProviderID string
	ConversationID    string
	UserID            string
	ToolName          string
	ArgumentsJSON     string
}

// ToolExecutionResult holds the result of tool execution.
type ToolExecutionResult struct {
	Success      bool
	ResultJSON   string
	ErrorMessage string
	DurationMS   int
}

// KnowledgeChunk represents a chunk of retrieved knowledge.
type KnowledgeChunk struct {
	ChunkID        string
	SourceID       string
	SourceName     string
	Content        string
	RelevanceScore float64
	Metadata       map[string]string
}

// RAGQueryRequest holds the input for a RAG knowledge query.
type RAGQueryRequest struct {
	BotID             string
	ServiceProviderID string
	Query             string
	TopK              int
	MinScore          float64
}

// RAGQueryResponse holds the result of a RAG knowledge query.
type RAGQueryResponse struct {
	Chunks              []KnowledgeChunk
	AugmentedPrompt     string
	TotalChunksSearched int
}

// ConversationMessage represents a message in a conversation to summarize.
type ConversationMessage struct {
	Role      string
	Content   string
	Timestamp time.Time
}

// SummaryType identifies the type of summary to generate.
type SummaryType string

const (
	SummaryBrief       SummaryType = "brief"
	SummaryDetailed    SummaryType = "detailed"
	SummaryActionItems SummaryType = "action_items"
)

// SummarizeRequest holds the input for conversation summarization.
type SummarizeRequest struct {
	BotID             string
	ServiceProviderID string
	ConversationID    string
	Messages          []ConversationMessage
	SummaryType       SummaryType
}

// SummarizeResponse holds the summarization output.
type SummarizeResponse struct {
	Summary      string
	KeyTopics    []string
	ActionItems  []string
	Sentiment    string // positive, neutral, negative
	MessageCount int
}

// CommunicationCategory represents a communication category.
type CommunicationCategory string

const (
	CategoryPersonal       CommunicationCategory = "PERSONAL"
	CategoryOrganizational CommunicationCategory = "ORGANIZATIONAL"
	CategoryAdvertisement  CommunicationCategory = "ADVERTISEMENT"
)

// CategoryResult holds a categorization prediction.
type CategoryResult struct {
	Category    CommunicationCategory
	Confidence  float64
	Subcategory string
}

// CategorizeRequest holds the input for message categorization.
type CategorizeRequest struct {
	Content         string
	SenderID        string
	SenderType      string // user, service_provider, bot
	ContextMetadata map[string]string
}

// CategorizeResponse holds the categorization output.
type CategorizeResponse struct {
	PrimaryCategory CategoryResult
	AllCategories   []CategoryResult
	Reasoning       string
}

// SpamDecision represents the outcome of spam analysis.
type SpamDecision string

const (
	SpamDecisionAllow SpamDecision = "ALLOW"
	SpamDecisionFlag  SpamDecision = "FLAG"
	SpamDecisionBlock SpamDecision = "BLOCK"
)

// SpamSignal represents a contributing signal to spam detection.
type SpamSignal struct {
	SignalType  string // repetition, urgency, link_density, known_pattern
	Weight      float64
	Description string
}

// SpamDetectRequest holds the input for spam detection.
type SpamDetectRequest struct {
	Content        string
	SenderID       string
	SenderType     string
	Metadata       map[string]string
	RecentMessages []string
}

// SpamDetectResponse holds the spam detection output.
type SpamDetectResponse struct {
	IsSpam      bool
	SpamScore   float64 // 0.0 to 1.0
	Decision    SpamDecision
	Signals     []SpamSignal
	Explanation string
}
