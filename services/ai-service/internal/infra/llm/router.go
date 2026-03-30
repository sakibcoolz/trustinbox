package llm

import (
	"context"
	"fmt"

	"github.com/trustinbox/ai-service/internal/domain/entity"
)

// Router selects the appropriate LLM provider based on the request.
type Router struct {
	providers map[entity.LLMProvider]Provider
	fallback  entity.LLMProvider
}

// NewRouter creates a new LLM router with the given providers.
func NewRouter(providers []Provider, fallback entity.LLMProvider) *Router {
	m := make(map[entity.LLMProvider]Provider, len(providers))
	for _, p := range providers {
		m[p.Name()] = p
	}
	return &Router{providers: m, fallback: fallback}
}

// Complete routes a completion request to the appropriate provider.
func (r *Router) Complete(ctx context.Context, req *entity.CompletionRequest) (*entity.CompletionResponse, error) {
	provider := req.Provider
	if provider == "" {
		provider = r.fallback
	}
	p, ok := r.providers[provider]
	if !ok {
		return nil, fmt.Errorf("unknown LLM provider: %s", provider)
	}
	return p.ChatCompletion(ctx, req)
}

// HasProvider returns true if the named provider is registered.
func (r *Router) HasProvider(name entity.LLMProvider) bool {
	_, ok := r.providers[name]
	return ok
}
