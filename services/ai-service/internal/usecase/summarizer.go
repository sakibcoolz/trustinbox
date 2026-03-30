package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// Summarizer generates conversation summaries using an LLM.
type Summarizer struct {
	router *llm.Router
}

// NewSummarizer creates a new conversation summarizer.
func NewSummarizer(router *llm.Router) *Summarizer {
	return &Summarizer{router: router}
}

// Summarize generates a summary for the given conversation messages.
func (s *Summarizer) Summarize(ctx context.Context, req *entity.SummarizeRequest) (*entity.SummarizeResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Summarizer.Summarize",
		attribute.String("bot_id", req.BotID),
		attribute.String("conversation_id", req.ConversationID),
		attribute.String("summary_type", string(req.SummaryType)),
		attribute.Int("message_count", len(req.Messages)),
	)
	defer span.End()

	if len(req.Messages) == 0 {
		return &entity.SummarizeResponse{
			Summary:      "No messages to summarize.",
			MessageCount: 0,
		}, nil
	}

	systemPrompt := buildSummarizationPrompt(req.SummaryType)
	conversationText := formatConversation(req.Messages)

	completionReq := &entity.CompletionRequest{
		Messages: []entity.ChatMessage{
			{Role: entity.RoleSystem, Content: systemPrompt},
			{Role: entity.RoleUser, Content: conversationText},
		},
		Temperature: 0.3,
		MaxTokens:   1024,
	}

	resp, err := s.router.Complete(ctx, completionReq)
	if err != nil {
		tracing.SetError(ctx, err)
		return nil, fmt.Errorf("summarization LLM call failed: %w", err)
	}

	return parseSummarizationResponse(resp.Content, len(req.Messages)), nil
}

func buildSummarizationPrompt(summaryType entity.SummaryType) string {
	base := `You are a conversation summarizer for an enterprise communication platform. 
Analyze the following conversation and provide a structured summary.
Respond in JSON format with these fields: "summary", "key_topics" (array), "action_items" (array), "sentiment" (positive/neutral/negative).`

	switch summaryType {
	case entity.SummaryDetailed:
		return base + "\nProvide a detailed, comprehensive summary covering all discussion points."
	case entity.SummaryActionItems:
		return base + "\nFocus primarily on extracting actionable items and next steps."
	default:
		return base + "\nProvide a brief, concise summary in 2-3 sentences."
	}
}

func formatConversation(messages []entity.ConversationMessage) string {
	var b strings.Builder
	for _, m := range messages {
		fmt.Fprintf(&b, "[%s] %s: %s\n", m.Timestamp.Format("15:04"), m.Role, m.Content)
	}
	return b.String()
}

func parseSummarizationResponse(content string, messageCount int) *entity.SummarizeResponse {
	// The LLM should respond with structured JSON, but we handle fallback gracefully.
	resp := &entity.SummarizeResponse{
		Summary:      content,
		MessageCount: messageCount,
		Sentiment:    "neutral",
	}

	// Attempt to extract key topics from content if it appears to be structured.
	if strings.Contains(content, "key_topics") {
		// Best-effort: leave full content as summary, topics can be parsed by caller.
		resp.KeyTopics = []string{}
		resp.ActionItems = []string{}
	}

	return resp
}
