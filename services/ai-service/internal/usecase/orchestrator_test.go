package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/infra/llm"
)

// --- Mock LLM Provider ---

type mockLLMProvider struct {
	name    entity.LLMProvider
	resp    *entity.CompletionResponse
	err     error
	lastReq *entity.CompletionRequest
}

func (m *mockLLMProvider) ChatCompletion(_ context.Context, req *entity.CompletionRequest) (*entity.CompletionResponse, error) {
	m.lastReq = req
	return m.resp, m.err
}

func (m *mockLLMProvider) Name() entity.LLMProvider {
	return m.name
}

func newMockRouter(provider *mockLLMProvider) *llm.Router {
	return llm.NewRouter([]llm.Provider{provider}, provider.name)
}

// --- Mock Knowledge Chunk Repository ---

type mockChunkRepo struct {
	chunks []entity.KnowledgeChunk
	total  int
	err    error
}

func (m *mockChunkRepo) Search(_ context.Context, _, _ string, _ int, _ float64) ([]entity.KnowledgeChunk, int, error) {
	return m.chunks, m.total, m.err
}

func (m *mockChunkRepo) Store(_ context.Context, chunk *entity.KnowledgeChunk) error {
	m.chunks = append(m.chunks, *chunk)
	return nil
}

// ─── Tool Executor Tests ───────────────────────────────────

func TestToolExecutor_Execute_RegisteredTool(t *testing.T) {
	registry := NewToolRegistry()
	registry.Register(entity.ToolDefinition{
		Name:        "test_tool",
		Description: "A test tool",
	}, func(ctx context.Context, args json.RawMessage) (json.RawMessage, error) {
		return json.RawMessage(`{"result":"success"}`), nil
	})

	executor := NewToolExecutor(registry)
	result, err := executor.Execute(context.Background(), &entity.ToolExecutionRequest{
		BotID:         "bot-1",
		ToolName:      "test_tool",
		ArgumentsJSON: `{"key":"value"}`,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Errorf("expected success, got failure: %s", result.ErrorMessage)
	}
	if result.ResultJSON != `{"result":"success"}` {
		t.Errorf("unexpected result: %s", result.ResultJSON)
	}
	if result.DurationMS < 0 {
		t.Error("duration should be non-negative")
	}
}

func TestToolExecutor_Execute_UnknownTool(t *testing.T) {
	registry := NewToolRegistry()
	executor := NewToolExecutor(registry)

	result, err := executor.Execute(context.Background(), &entity.ToolExecutionRequest{
		ToolName: "nonexistent",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Error("expected failure for unknown tool")
	}
	if !strings.Contains(result.ErrorMessage, "tool not found") {
		t.Errorf("expected 'tool not found' error, got: %s", result.ErrorMessage)
	}
}

func TestToolExecutor_Execute_ToolError(t *testing.T) {
	registry := NewToolRegistry()
	registry.Register(entity.ToolDefinition{Name: "failing_tool"}, func(ctx context.Context, args json.RawMessage) (json.RawMessage, error) {
		return nil, fmt.Errorf("tool exploded")
	})

	executor := NewToolExecutor(registry)
	result, err := executor.Execute(context.Background(), &entity.ToolExecutionRequest{
		ToolName: "failing_tool",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Error("expected failure when tool errors")
	}
	if !strings.Contains(result.ErrorMessage, "tool exploded") {
		t.Errorf("expected error message, got: %s", result.ErrorMessage)
	}
}

func TestToolRegistry_RegisterAndGet(t *testing.T) {
	registry := NewToolRegistry()
	RegisterDefaultTools(registry)

	defs := registry.GetDefinitions()
	if len(defs) != 10 {
		t.Errorf("expected 10 default tools, got %d", len(defs))
	}

	if !registry.HasTool("send_message") {
		t.Error("expected send_message tool to be registered")
	}
	if registry.HasTool("nonexistent") {
		t.Error("expected nonexistent tool to not be registered")
	}
}

// ─── RAG Pipeline Tests ────────────────────────────────────

func TestRAGPipeline_Query_WithChunks(t *testing.T) {
	chunks := []entity.KnowledgeChunk{
		{ChunkID: "c1", SourceName: "FAQ", Content: "Our return policy is 30 days.", RelevanceScore: 0.9},
		{ChunkID: "c2", SourceName: "Doc", Content: "Refunds take 5-7 business days.", RelevanceScore: 0.85},
	}
	repo := &mockChunkRepo{chunks: chunks, total: 100}
	router := newMockRouter(&mockLLMProvider{name: entity.ProviderOpenAI})

	pipeline := NewRAGPipeline(repo, router)
	resp, err := pipeline.Query(context.Background(), &entity.RAGQueryRequest{
		BotID: "bot-1",
		Query: "What is the return policy?",
		TopK:  5,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Chunks) != 2 {
		t.Errorf("expected 2 chunks, got %d", len(resp.Chunks))
	}
	if resp.TotalChunksSearched != 100 {
		t.Errorf("expected total 100, got %d", resp.TotalChunksSearched)
	}
	if !strings.Contains(resp.AugmentedPrompt, "return policy") {
		t.Error("expected augmented prompt to contain the query")
	}
	if !strings.Contains(resp.AugmentedPrompt, "FAQ") {
		t.Error("expected augmented prompt to reference source name")
	}
}

func TestRAGPipeline_Query_Empty(t *testing.T) {
	repo := &mockChunkRepo{chunks: nil, total: 0}
	router := newMockRouter(&mockLLMProvider{name: entity.ProviderOpenAI})

	pipeline := NewRAGPipeline(repo, router)
	resp, err := pipeline.Query(context.Background(), &entity.RAGQueryRequest{
		BotID: "bot-1",
		Query: "hello",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Chunks) != 0 {
		t.Errorf("expected 0 chunks, got %d", len(resp.Chunks))
	}
	// When no chunks found, augmented prompt should just be the query.
	if resp.AugmentedPrompt != "hello" {
		t.Errorf("expected plain query, got: %s", resp.AugmentedPrompt)
	}
}

func TestRAGPipeline_Query_RepoError(t *testing.T) {
	repo := &mockChunkRepo{err: fmt.Errorf("db connection lost")}
	router := newMockRouter(&mockLLMProvider{name: entity.ProviderOpenAI})

	pipeline := NewRAGPipeline(repo, router)
	_, err := pipeline.Query(context.Background(), &entity.RAGQueryRequest{
		BotID: "bot-1",
		Query: "test",
	})
	if err == nil {
		t.Fatal("expected error from repo")
	}
	if !strings.Contains(err.Error(), "knowledge search failed") {
		t.Errorf("expected wrapped error, got: %v", err)
	}
}

// ─── Summarizer Tests ──────────────────────────────────────

func TestSummarizer_EmptyMessages(t *testing.T) {
	router := newMockRouter(&mockLLMProvider{name: entity.ProviderOpenAI})
	summarizer := NewSummarizer(router)

	resp, err := summarizer.Summarize(context.Background(), &entity.SummarizeRequest{
		BotID:          "bot-1",
		ConversationID: "conv-1",
		Messages:       nil,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Summary != "No messages to summarize." {
		t.Errorf("expected empty summary message, got: %s", resp.Summary)
	}
	if resp.MessageCount != 0 {
		t.Errorf("expected 0 messages, got %d", resp.MessageCount)
	}
}

func TestSummarizer_WithMessages(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content:      `{"summary":"Customer asked about refund","key_topics":["refund"],"action_items":["process refund"],"sentiment":"neutral"}`,
			FinishReason: "stop",
		},
	}
	router := newMockRouter(provider)
	summarizer := NewSummarizer(router)

	resp, err := summarizer.Summarize(context.Background(), &entity.SummarizeRequest{
		BotID:          "bot-1",
		ConversationID: "conv-1",
		SummaryType:    entity.SummaryBrief,
		Messages: []entity.ConversationMessage{
			{Role: "user", Content: "I want a refund", Timestamp: time.Now()},
			{Role: "assistant", Content: "I can help with that", Timestamp: time.Now()},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.MessageCount != 2 {
		t.Errorf("expected 2 messages, got %d", resp.MessageCount)
	}
	if resp.Summary == "" {
		t.Error("expected non-empty summary")
	}
}

func TestSummarizer_LLMError(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		err:  fmt.Errorf("LLM unavailable"),
	}
	router := newMockRouter(provider)
	summarizer := NewSummarizer(router)

	_, err := summarizer.Summarize(context.Background(), &entity.SummarizeRequest{
		BotID: "bot-1",
		Messages: []entity.ConversationMessage{
			{Role: "user", Content: "test"},
		},
	})
	if err == nil {
		t.Fatal("expected error from LLM")
	}
}

// ─── Categorizer Tests ─────────────────────────────────────

func TestCategorizer_ValidResponse(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: `{"primary_category":"ADVERTISEMENT","confidence":0.95,"subcategory":"promotion","all_categories":[{"category":"ADVERTISEMENT","confidence":0.95},{"category":"ORGANIZATIONAL","confidence":0.04}],"reasoning":"Contains promotional language"}`,
		},
	}
	router := newMockRouter(provider)
	categorizer := NewCategorizer(router)

	resp, err := categorizer.Categorize(context.Background(), &entity.CategorizeRequest{
		Content:    "50% off all products this weekend!",
		SenderType: "service_provider",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.PrimaryCategory.Category != entity.CategoryAdvertisement {
		t.Errorf("expected ADVERTISEMENT, got %s", resp.PrimaryCategory.Category)
	}
	if resp.PrimaryCategory.Confidence < 0.9 {
		t.Errorf("expected high confidence, got %.2f", resp.PrimaryCategory.Confidence)
	}
	if len(resp.AllCategories) != 2 {
		t.Errorf("expected 2 categories, got %d", len(resp.AllCategories))
	}
}

func TestCategorizer_InvalidJSON_Fallback(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: "This looks like a personal message",
		},
	}
	router := newMockRouter(provider)
	categorizer := NewCategorizer(router)

	resp, err := categorizer.Categorize(context.Background(), &entity.CategorizeRequest{
		Content: "Hey, how are you?",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Fallback should default to ORGANIZATIONAL with 0.5 confidence.
	if resp.PrimaryCategory.Category != entity.CategoryOrganizational {
		t.Errorf("expected fallback ORGANIZATIONAL, got %s", resp.PrimaryCategory.Category)
	}
	if resp.PrimaryCategory.Confidence != 0.5 {
		t.Errorf("expected fallback confidence 0.5, got %.2f", resp.PrimaryCategory.Confidence)
	}
}

// ─── Spam Detector Tests ───────────────────────────────────

func TestSpamDetector_CleanMessage(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: `{"score": 0.1, "explanation": "Normal business message"}`,
		},
	}
	router := newMockRouter(provider)
	detector := NewSpamDetector(router, 0.5, 0.8)

	resp, err := detector.Detect(context.Background(), &entity.SpamDetectRequest{
		Content:    "Your appointment is confirmed for Tuesday at 3 PM.",
		SenderID:   "org-1",
		SenderType: "service_provider",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.IsSpam {
		t.Error("expected clean message not flagged as spam")
	}
	if resp.Decision != entity.SpamDecisionAllow {
		t.Errorf("expected ALLOW, got %s", resp.Decision)
	}
}

func TestSpamDetector_SpamWithUrgency(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: `{"score": 0.9, "explanation": "High spam indicators"}`,
		},
	}
	router := newMockRouter(provider)
	detector := NewSpamDetector(router, 0.3, 0.6)

	resp, err := detector.Detect(context.Background(), &entity.SpamDetectRequest{
		Content:    "URGENT: Act now! Limited time offer! Click here to claim your free gift!",
		SenderID:   "unknown",
		SenderType: "service_provider",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.SpamScore == 0 {
		t.Error("expected non-zero spam score")
	}
	if len(resp.Signals) == 0 {
		t.Error("expected spam signals")
	}
	// Check heuristic signals
	hasUrgency := false
	for _, s := range resp.Signals {
		if s.SignalType == "urgency" {
			hasUrgency = true
		}
	}
	if !hasUrgency {
		t.Error("expected urgency signal")
	}
}

func TestSpamDetector_KnownSpamPattern(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: `{"score": 0.95, "explanation": "Known spam pattern"}`,
		},
	}
	router := newMockRouter(provider)
	detector := NewSpamDetector(router, 0.3, 0.6)

	resp, err := detector.Detect(context.Background(), &entity.SpamDetectRequest{
		Content:    "Congratulations you've won a free gift card! Click here to claim",
		SenderType: "user",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	hasKnownPattern := false
	for _, s := range resp.Signals {
		if s.SignalType == "known_pattern" {
			hasKnownPattern = true
		}
	}
	if !hasKnownPattern {
		t.Error("expected known_pattern signal")
	}
}

func TestSpamDetector_RepetitiveMessages(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content: `{"score": 0.5, "explanation": "Repetitive content"}`,
		},
	}
	router := newMockRouter(provider)
	detector := NewSpamDetector(router, 0.3, 0.8)

	resp, err := detector.Detect(context.Background(), &entity.SpamDetectRequest{
		Content:    "Buy our product now!",
		SenderType: "service_provider",
		RecentMessages: []string{
			"Buy our product now!",
			"Buy our product now!",
			"Buy our product now!",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	hasRepetition := false
	for _, s := range resp.Signals {
		if s.SignalType == "repetition" {
			hasRepetition = true
		}
	}
	if !hasRepetition {
		t.Error("expected repetition signal")
	}
}

func TestSpamDetector_LLMFailureFallback(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		err:  fmt.Errorf("LLM unavailable"),
	}
	router := newMockRouter(provider)
	detector := NewSpamDetector(router, 0.5, 0.8)

	// Should still work with heuristics only.
	resp, err := detector.Detect(context.Background(), &entity.SpamDetectRequest{
		Content:    "Hello, how are you today?",
		SenderType: "user",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Clean message should still be ALLOW even without LLM.
	if resp.Decision != entity.SpamDecisionAllow {
		t.Errorf("expected ALLOW with heuristics-only fallback, got %s", resp.Decision)
	}
}

// ─── Orchestrator Integration Tests ────────────────────────

func TestOrchestrator_ChatCompletion(t *testing.T) {
	provider := &mockLLMProvider{
		name: entity.ProviderOpenAI,
		resp: &entity.CompletionResponse{
			Content:      "Hello! How can I help?",
			FinishReason: "stop",
			Model:        "gpt-4o",
			Provider:     entity.ProviderOpenAI,
		},
	}
	router := newMockRouter(provider)
	registry := NewToolRegistry()
	executor := NewToolExecutor(registry)
	repo := &mockChunkRepo{}
	orch := NewOrchestrator(router, executor, NewRAGPipeline(repo, router), NewSummarizer(router), NewCategorizer(router), NewSpamDetector(router, 0.5, 0.8))

	resp, err := orch.ChatCompletion(context.Background(), &entity.CompletionRequest{
		Messages: []entity.ChatMessage{{Role: entity.RoleUser, Content: "Hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Content != "Hello! How can I help?" {
		t.Errorf("unexpected content: %s", resp.Content)
	}
}

func TestOrchestrator_ExecuteTool(t *testing.T) {
	provider := &mockLLMProvider{name: entity.ProviderOpenAI}
	router := newMockRouter(provider)
	registry := NewToolRegistry()
	registry.Register(entity.ToolDefinition{Name: "test"}, func(ctx context.Context, args json.RawMessage) (json.RawMessage, error) {
		return json.RawMessage(`{"ok":true}`), nil
	})
	executor := NewToolExecutor(registry)
	repo := &mockChunkRepo{}
	orch := NewOrchestrator(router, executor, NewRAGPipeline(repo, router), NewSummarizer(router), NewCategorizer(router), NewSpamDetector(router, 0.5, 0.8))

	result, err := orch.ExecuteTool(context.Background(), &entity.ToolExecutionRequest{ToolName: "test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Error("expected tool success")
	}
}
