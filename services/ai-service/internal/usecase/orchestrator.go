package usecase

import (
	"context"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// Orchestrator coordinates all AI capabilities for the platform.
type Orchestrator struct {
	router       *llm.Router
	toolExecutor *ToolExecutor
	rag          *RAGPipeline
	summarizer   *Summarizer
	categorizer  *Categorizer
	spamDetector *SpamDetector
}

// NewOrchestrator creates a new AI orchestrator with all sub-components.
func NewOrchestrator(
	router *llm.Router,
	toolExecutor *ToolExecutor,
	rag *RAGPipeline,
	summarizer *Summarizer,
	categorizer *Categorizer,
	spamDetector *SpamDetector,
) *Orchestrator {
	return &Orchestrator{
		router:       router,
		toolExecutor: toolExecutor,
		rag:          rag,
		summarizer:   summarizer,
		categorizer:  categorizer,
		spamDetector: spamDetector,
	}
}

// ChatCompletion sends a request to the configured LLM provider.
func (o *Orchestrator) ChatCompletion(ctx context.Context, req *entity.CompletionRequest) (*entity.CompletionResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.ChatCompletion",
		attribute.String("provider", string(req.Provider)),
		attribute.String("model", req.Model),
		attribute.String("bot_id", req.BotID),
	)
	defer span.End()

	return o.router.Complete(ctx, req)
}

// ExecuteTool executes a registered bot tool.
func (o *Orchestrator) ExecuteTool(ctx context.Context, req *entity.ToolExecutionRequest) (*entity.ToolExecutionResult, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.ExecuteTool",
		attribute.String("tool_name", req.ToolName),
		attribute.String("bot_id", req.BotID),
	)
	defer span.End()

	return o.toolExecutor.Execute(ctx, req)
}

// QueryKnowledge runs the RAG pipeline for knowledge retrieval.
func (o *Orchestrator) QueryKnowledge(ctx context.Context, req *entity.RAGQueryRequest) (*entity.RAGQueryResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.QueryKnowledge",
		attribute.String("bot_id", req.BotID),
	)
	defer span.End()

	return o.rag.Query(ctx, req)
}

// SummarizeConversation generates a summary of a conversation.
func (o *Orchestrator) SummarizeConversation(ctx context.Context, req *entity.SummarizeRequest) (*entity.SummarizeResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.SummarizeConversation",
		attribute.String("bot_id", req.BotID),
		attribute.String("conversation_id", req.ConversationID),
	)
	defer span.End()

	return o.summarizer.Summarize(ctx, req)
}

// CategorizeMessage classifies a message into communication categories.
func (o *Orchestrator) CategorizeMessage(ctx context.Context, req *entity.CategorizeRequest) (*entity.CategorizeResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.CategorizeMessage",
		attribute.String("sender_type", req.SenderType),
	)
	defer span.End()

	return o.categorizer.Categorize(ctx, req)
}

// DetectSpam analyzes a message for spam indicators.
func (o *Orchestrator) DetectSpam(ctx context.Context, req *entity.SpamDetectRequest) (*entity.SpamDetectResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Orchestrator.DetectSpam",
		attribute.String("sender_id", req.SenderID),
	)
	defer span.End()

	return o.spamDetector.Detect(ctx, req)
}
