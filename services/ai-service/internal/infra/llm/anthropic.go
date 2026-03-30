package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/trustinbox/ai-service/internal/domain/entity"
)

// AnthropicProvider implements the Provider interface for Anthropic's API.
type AnthropicProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewAnthropicProvider creates a new Anthropic LLM provider.
func NewAnthropicProvider(apiKey, baseURL string) *AnthropicProvider {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	return &AnthropicProvider{
		apiKey:  apiKey,
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

func (p *AnthropicProvider) Name() entity.LLMProvider {
	return entity.ProviderAnthropic
}

// anthropicRequest is the request body for Anthropic messages API.
type anthropicRequest struct {
	Model     string             `json:"model"`
	Messages  []anthropicMessage `json:"messages"`
	System    string             `json:"system,omitempty"`
	MaxTokens int                `json:"max_tokens"`
	Tools     []anthropicTool    `json:"tools,omitempty"`
}

type anthropicMessage struct {
	Role    string                `json:"role"`
	Content []anthropicContent    `json:"content"`
}

type anthropicContent struct {
	Type      string `json:"type"`
	Text      string `json:"text,omitempty"`
	ID        string `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Input     json.RawMessage `json:"input,omitempty"`
	ToolUseID string `json:"tool_use_id,omitempty"`
	Content   string `json:"content,omitempty"`
}

type anthropicTool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
}

// anthropicResponse is the response from Anthropic messages API.
type anthropicResponse struct {
	ID      string             `json:"id"`
	Content []anthropicContent `json:"content"`
	Model   string             `json:"model"`
	StopReason string          `json:"stop_reason"`
	Usage   struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

type anthropicErrorResponse struct {
	Error struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

func (p *AnthropicProvider) ChatCompletion(ctx context.Context, req *entity.CompletionRequest) (*entity.CompletionResponse, error) {
	model := req.Model
	if model == "" {
		model = "claude-sonnet-4-20250514"
	}

	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	var systemPrompt string
	var msgs []anthropicMessage

	for _, m := range req.Messages {
		if m.Role == entity.RoleSystem {
			systemPrompt = m.Content
			continue
		}

		role := string(m.Role)
		if m.Role == entity.RoleTool {
			role = "user"
		}

		content := []anthropicContent{{Type: "text", Text: m.Content}}
		if m.Role == entity.RoleTool && m.ToolCallID != "" {
			content = []anthropicContent{{
				Type:      "tool_result",
				ToolUseID: m.ToolCallID,
				Content:   m.Content,
			}}
		}

		msgs = append(msgs, anthropicMessage{
			Role:    role,
			Content: content,
		})
	}

	anthReq := anthropicRequest{
		Model:     model,
		Messages:  msgs,
		System:    systemPrompt,
		MaxTokens: maxTokens,
	}

	if len(req.Tools) > 0 {
		tools := make([]anthropicTool, len(req.Tools))
		for i, t := range req.Tools {
			tools[i] = anthropicTool{
				Name:        t.Name,
				Description: t.Description,
				InputSchema: json.RawMessage(t.ParametersJSON),
			}
		}
		anthReq.Tools = tools
	}

	body, err := json.Marshal(anthReq)
	if err != nil {
		return nil, fmt.Errorf("marshal anthropic request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create anthropic request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("anthropic request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read anthropic response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp anthropicErrorResponse
		if jsonErr := json.Unmarshal(respBody, &errResp); jsonErr == nil && errResp.Error.Message != "" {
			return nil, fmt.Errorf("anthropic API error (%d): %s", resp.StatusCode, errResp.Error.Message)
		}
		return nil, fmt.Errorf("anthropic API error (%d): %s", resp.StatusCode, string(respBody))
	}

	var anthResp anthropicResponse
	if err := json.Unmarshal(respBody, &anthResp); err != nil {
		return nil, fmt.Errorf("unmarshal anthropic response: %w", err)
	}

	result := &entity.CompletionResponse{
		PromptTokens:     anthResp.Usage.InputTokens,
		CompletionTokens: anthResp.Usage.OutputTokens,
		Model:            anthResp.Model,
		Provider:         entity.ProviderAnthropic,
	}

	finishReason := "stop"
	for _, c := range anthResp.Content {
		switch c.Type {
		case "text":
			result.Content += c.Text
		case "tool_use":
			finishReason = "tool_calls"
			inputJSON, _ := json.Marshal(c.Input)
			result.ToolCalls = append(result.ToolCalls, entity.ToolCall{
				ID:            c.ID,
				Name:          c.Name,
				ArgumentsJSON: string(inputJSON),
			})
		}
	}
	result.FinishReason = finishReason

	return result, nil
}
