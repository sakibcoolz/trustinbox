package usecase

import (
	"context"
	"encoding/json"
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
	resp := &entity.SummarizeResponse{
		Summary:      content,
		MessageCount: messageCount,
		Sentiment:    "neutral",
		KeyTopics:    []string{},
		ActionItems:  []string{},
	}

	// Try to extract JSON from the response (may be wrapped in markdown code blocks).
	jsonStr := content
	if idx := strings.Index(content, "{"); idx >= 0 {
		if end := strings.LastIndex(content, "}"); end > idx {
			jsonStr = content[idx : end+1]
		}
	}

	var parsed struct {
		Summary     string   `json:"summary"`
		KeyTopics   []string `json:"key_topics"`
		ActionItems []string `json:"action_items"`
		Sentiment   string   `json:"sentiment"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err == nil {
		if parsed.Summary != "" {
			resp.Summary = parsed.Summary
		}
		if len(parsed.KeyTopics) > 0 {
			resp.KeyTopics = parsed.KeyTopics
		}
		if len(parsed.ActionItems) > 0 {
			resp.ActionItems = parsed.ActionItems
		}
		if parsed.Sentiment != "" {
			resp.Sentiment = parsed.Sentiment
		}
	}

	return resp
}
