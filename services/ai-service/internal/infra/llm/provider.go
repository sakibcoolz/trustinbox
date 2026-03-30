package llm

import (
	"context"

	"github.com/trustinbox/ai-service/internal/domain/entity"
)

// Provider defines the interface for LLM backend communication.
type Provider interface {
	// ChatCompletion sends a chat completion request to the LLM provider.
	ChatCompletion(ctx context.Context, req *entity.CompletionRequest) (*entity.CompletionResponse, error)
	// Name returns the provider identifier.
	Name() entity.LLMProvider
}
