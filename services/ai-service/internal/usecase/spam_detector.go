package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// SpamDetector analyzes messages for spam using heuristics and LLM signals.
type SpamDetector struct {
	router         *llm.Router
	blockThreshold float64
	flagThreshold  float64
}

// NewSpamDetector creates a new spam detector.
func NewSpamDetector(router *llm.Router, flagThreshold, blockThreshold float64) *SpamDetector {
	if flagThreshold == 0 {
		flagThreshold = 0.5
	}
	if blockThreshold == 0 {
		blockThreshold = 0.8
	}
	return &SpamDetector{
		router:         router,
		flagThreshold:  flagThreshold,
		blockThreshold: blockThreshold,
	}
}

// Detect analyzes a message and returns a spam detection result.
func (sd *SpamDetector) Detect(ctx context.Context, req *entity.SpamDetectRequest) (*entity.SpamDetectResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "SpamDetector.Detect",
		attribute.String("sender_id", req.SenderID),
	)
	defer span.End()

	// Phase 1: Heuristic-based signals
	signals := sd.computeHeuristicSignals(req)

	// Phase 2: LLM-based analysis
	llmScore, llmExplanation, err := sd.llmAnalysis(ctx, req)
	if err != nil {
		// If LLM fails, fall back to heuristic-only scoring.
		tracing.SetError(ctx, err)
	} else {
		signals = append(signals, entity.SpamSignal{
			SignalType:  "llm_analysis",
			Weight:      llmScore,
			Description: llmExplanation,
		})
	}

	// Phase 3: Aggregate score
	totalScore := sd.aggregateScore(signals)
	decision := sd.makeDecision(totalScore)

	return &entity.SpamDetectResponse{
		IsSpam:      decision == entity.SpamDecisionBlock,
		SpamScore:   totalScore,
		Decision:    decision,
		Signals:     signals,
		Explanation: sd.buildExplanation(signals, decision),
	}, nil
}

func (sd *SpamDetector) computeHeuristicSignals(req *entity.SpamDetectRequest) []entity.SpamSignal {
	var signals []entity.SpamSignal
	content := strings.ToLower(req.Content)

	// Signal: Excessive urgency language
	urgencyWords := []string{"urgent", "act now", "limited time", "immediately", "don't miss", "last chance", "expires"}
	urgencyCount := 0
	for _, w := range urgencyWords {
		if strings.Contains(content, w) {
			urgencyCount++
		}
	}
	if urgencyCount > 0 {
		weight := math.Min(float64(urgencyCount)*0.15, 0.6)
		signals = append(signals, entity.SpamSignal{
			SignalType:  "urgency",
			Weight:      weight,
			Description: fmt.Sprintf("detected %d urgency keywords", urgencyCount),
		})
	}

	// Signal: Excessive links
	linkCount := strings.Count(content, "http://") + strings.Count(content, "https://")
	if linkCount > 2 {
		weight := math.Min(float64(linkCount)*0.1, 0.5)
		signals = append(signals, entity.SpamSignal{
			SignalType:  "link_density",
			Weight:      weight,
			Description: fmt.Sprintf("detected %d URLs in message", linkCount),
		})
	}

	// Signal: ALL CAPS ratio
	if len(req.Content) > 20 {
		upperCount := 0
		for _, c := range req.Content {
			if c >= 'A' && c <= 'Z' {
				upperCount++
			}
		}
		capsRatio := float64(upperCount) / float64(len(req.Content))
		if capsRatio > 0.5 {
			signals = append(signals, entity.SpamSignal{
				SignalType:  "caps_ratio",
				Weight:      capsRatio * 0.4,
				Description: fmt.Sprintf("%.0f%% uppercase characters", capsRatio*100),
			})
		}
	}

	// Signal: Repetitive recent messages
	if len(req.RecentMessages) > 1 {
		duplicates := 0
		for _, msg := range req.RecentMessages {
			if strings.EqualFold(msg, req.Content) {
				duplicates++
			}
		}
		if duplicates > 0 {
			weight := math.Min(float64(duplicates)*0.2, 0.7)
			signals = append(signals, entity.SpamSignal{
				SignalType:  "repetition",
				Weight:      weight,
				Description: fmt.Sprintf("message repeated %d times in recent history", duplicates),
			})
		}
	}

	// Signal: Known spam patterns
	spamPatterns := []string{"congratulations you've won", "click here to claim", "free gift", "act now or", "wire transfer"}
	for _, p := range spamPatterns {
		if strings.Contains(content, p) {
			signals = append(signals, entity.SpamSignal{
				SignalType:  "known_pattern",
				Weight:      0.8,
				Description: fmt.Sprintf("matches known spam pattern: %q", p),
			})
			break
		}
	}

	return signals
}

const spamDetectionPrompt = `You are a spam detection system for a privacy-first enterprise communication platform.
Analyze the following message and determine if it is spam.
Rate the spam likelihood from 0.0 (definitely not spam) to 1.0 (definitely spam).
Respond ONLY with a JSON object: {"score": 0.0, "explanation": "brief reason"}`

func (sd *SpamDetector) llmAnalysis(ctx context.Context, req *entity.SpamDetectRequest) (float64, string, error) {
	userContent := fmt.Sprintf("Sender: %s (%s)\nMessage: %s", req.SenderID, req.SenderType, req.Content)
	if len(req.RecentMessages) > 0 {
		userContent += fmt.Sprintf("\nRecent messages from sender: %d", len(req.RecentMessages))
	}

	completionReq := &entity.CompletionRequest{
		Messages: []entity.ChatMessage{
			{Role: entity.RoleSystem, Content: spamDetectionPrompt},
			{Role: entity.RoleUser, Content: userContent},
		},
		Temperature: 0.1,
		MaxTokens:   256,
	}

	resp, err := sd.router.Complete(ctx, completionReq)
	if err != nil {
		return 0, "", fmt.Errorf("spam detection LLM call failed: %w", err)
	}

	return parseSpamLLMResponse(resp.Content)
}

type spamLLMResponse struct {
	Score       float64 `json:"score"`
	Explanation string  `json:"explanation"`
}

func parseSpamLLMResponse(content string) (float64, string, error) {
	jsonStr := content
	if idx := strings.Index(content, "{"); idx >= 0 {
		if end := strings.LastIndex(content, "}"); end > idx {
			jsonStr = content[idx : end+1]
		}
	}

	var parsed spamLLMResponse
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil {
		return 0.3, "unable to parse LLM response", nil
	}
	return parsed.Score, parsed.Explanation, nil
}

func (sd *SpamDetector) aggregateScore(signals []entity.SpamSignal) float64 {
	if len(signals) == 0 {
		return 0
	}
	// Use a weighted approach: take the maximum individual signal weight,
	// then boost it slightly based on number of additional signals.
	maxWeight := 0.0
	for _, s := range signals {
		if s.Weight > maxWeight {
			maxWeight = s.Weight
		}
	}
	// Each additional signal beyond the first adds a small boost (up to 0.2 total).
	boost := 0.0
	if len(signals) > 1 {
		boost = float64(len(signals)-1) * 0.05
		if boost > 0.2 {
			boost = 0.2
		}
	}
	score := maxWeight + boost
	if score > 1.0 {
		score = 1.0
	}
	return score
}

func (sd *SpamDetector) makeDecision(score float64) entity.SpamDecision {
	switch {
	case score >= sd.blockThreshold:
		return entity.SpamDecisionBlock
	case score >= sd.flagThreshold:
		return entity.SpamDecisionFlag
	default:
		return entity.SpamDecisionAllow
	}
}

func (sd *SpamDetector) buildExplanation(signals []entity.SpamSignal, decision entity.SpamDecision) string {
	if len(signals) == 0 {
		return "No spam indicators detected."
	}
	var parts []string
	for _, s := range signals {
		parts = append(parts, fmt.Sprintf("%s (%.2f): %s", s.SignalType, s.Weight, s.Description))
	}
	return fmt.Sprintf("Decision: %s. Signals: %s", decision, strings.Join(parts, "; "))
}
