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

// Categorizer classifies messages into communication categories using an LLM.
type Categorizer struct {
	router *llm.Router
}

// NewCategorizer creates a new smart categorizer.
func NewCategorizer(router *llm.Router) *Categorizer {
	return &Categorizer{router: router}
}

const categorizationSystemPrompt = `You are a message categorizer for an enterprise privacy-first communication platform called TrustInbox.
Classify the given message into one of these categories:
- PERSONAL: Direct personal communication between individuals
- ORGANIZATIONAL: Business-related communication from verified organizations
- ADVERTISEMENT: Promotional or marketing content

Respond ONLY with a JSON object containing:
{
  "primary_category": "PERSONAL|ORGANIZATIONAL|ADVERTISEMENT",
  "confidence": 0.0-1.0,
  "subcategory": "optional subcategory",
  "all_categories": [{"category": "...", "confidence": 0.0-1.0, "subcategory": "..."}],
  "reasoning": "brief explanation"
}`

// Categorize classifies a message into communication categories.
func (c *Categorizer) Categorize(ctx context.Context, req *entity.CategorizeRequest) (*entity.CategorizeResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "Categorizer.Categorize",
		attribute.String("sender_type", req.SenderType),
	)
	defer span.End()

	userContent := fmt.Sprintf("Sender type: %s\nSender ID: %s\nMessage: %s", req.SenderType, req.SenderID, req.Content)
	if len(req.ContextMetadata) > 0 {
		metaJSON, _ := json.Marshal(req.ContextMetadata)
		userContent += fmt.Sprintf("\nContext: %s", string(metaJSON))
	}

	completionReq := &entity.CompletionRequest{
		Messages: []entity.ChatMessage{
			{Role: entity.RoleSystem, Content: categorizationSystemPrompt},
			{Role: entity.RoleUser, Content: userContent},
		},
		Temperature: 0.1,
		MaxTokens:   512,
	}

	resp, err := c.router.Complete(ctx, completionReq)
	if err != nil {
		tracing.SetError(ctx, err)
		return nil, fmt.Errorf("categorization LLM call failed: %w", err)
	}

	return parseCategorizeResponse(resp.Content)
}

// categorizationJSON is the expected LLM response structure.
type categorizationJSON struct {
	PrimaryCategory string  `json:"primary_category"`
	Confidence      float64 `json:"confidence"`
	Subcategory     string  `json:"subcategory"`
	AllCategories   []struct {
		Category    string  `json:"category"`
		Confidence  float64 `json:"confidence"`
		Subcategory string  `json:"subcategory"`
	} `json:"all_categories"`
	Reasoning string `json:"reasoning"`
}

func parseCategorizeResponse(content string) (*entity.CategorizeResponse, error) {
	// Try to extract JSON from the response (it may be wrapped in markdown code blocks).
	jsonStr := content
	if idx := strings.Index(content, "{"); idx >= 0 {
		if end := strings.LastIndex(content, "}"); end > idx {
			jsonStr = content[idx : end+1]
		}
	}

	var parsed categorizationJSON
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		// Fallback: return a default categorization with the raw content.
		return &entity.CategorizeResponse{
			PrimaryCategory: entity.CategoryResult{
				Category:   entity.CategoryOrganizational,
				Confidence: 0.5,
			},
			Reasoning: content,
		}, nil
	}

	result := &entity.CategorizeResponse{
		PrimaryCategory: entity.CategoryResult{
			Category:    entity.CommunicationCategory(parsed.PrimaryCategory),
			Confidence:  parsed.Confidence,
			Subcategory: parsed.Subcategory,
		},
		Reasoning: parsed.Reasoning,
	}

	for _, c := range parsed.AllCategories {
		result.AllCategories = append(result.AllCategories, entity.CategoryResult{
			Category:    entity.CommunicationCategory(c.Category),
			Confidence:  c.Confidence,
			Subcategory: c.Subcategory,
		})
	}

	return result, nil
}
