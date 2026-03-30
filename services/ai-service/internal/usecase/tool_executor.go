package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"go.opentelemetry.io/otel/attribute"

	"github.com/trustinbox/cornerstone/tracing"
)

// ToolHandler executes a specific bot tool and returns its result.
type ToolHandler func(ctx context.Context, args json.RawMessage) (json.RawMessage, error)

// ToolRegistry manages tool definitions and their handlers.
type ToolRegistry struct {
	handlers    map[string]ToolHandler
	definitions map[string]entity.ToolDefinition
}

// NewToolRegistry creates an empty tool registry.
func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		handlers:    make(map[string]ToolHandler),
		definitions: make(map[string]entity.ToolDefinition),
	}
}

// Register adds a tool with its definition and handler.
func (r *ToolRegistry) Register(def entity.ToolDefinition, handler ToolHandler) {
	r.handlers[def.Name] = handler
	r.definitions[def.Name] = def
}

// GetDefinitions returns all registered tool definitions.
func (r *ToolRegistry) GetDefinitions() []entity.ToolDefinition {
	defs := make([]entity.ToolDefinition, 0, len(r.definitions))
	for _, d := range r.definitions {
		defs = append(defs, d)
	}
	return defs
}

// HasTool checks whether a tool is registered.
func (r *ToolRegistry) HasTool(name string) bool {
	_, ok := r.handlers[name]
	return ok
}

// ToolExecutor runs registered tools with tracing and error handling.
type ToolExecutor struct {
	registry *ToolRegistry
}

// NewToolExecutor creates a new ToolExecutor.
func NewToolExecutor(registry *ToolRegistry) *ToolExecutor {
	return &ToolExecutor{registry: registry}
}

// Execute runs the named tool and returns the execution result.
func (te *ToolExecutor) Execute(ctx context.Context, req *entity.ToolExecutionRequest) (*entity.ToolExecutionResult, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "ToolExecutor.Execute",
		attribute.String("tool_name", req.ToolName),
		attribute.String("bot_id", req.BotID),
	)
	defer span.End()

	start := time.Now()

	handler, ok := te.registry.handlers[req.ToolName]
	if !ok {
		return &entity.ToolExecutionResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("tool not found: %s", req.ToolName),
			DurationMS:   int(time.Since(start).Milliseconds()),
		}, nil
	}

	resultJSON, err := handler(ctx, json.RawMessage(req.ArgumentsJSON))
	duration := int(time.Since(start).Milliseconds())

	if err != nil {
		tracing.SetError(ctx, err)
		return &entity.ToolExecutionResult{
			Success:      false,
			ErrorMessage: err.Error(),
			DurationMS:   duration,
		}, nil
	}

	return &entity.ToolExecutionResult{
		Success:    true,
		ResultJSON: string(resultJSON),
		DurationMS: duration,
	}, nil
}

// GetRegistry returns the underlying tool registry.
func (te *ToolExecutor) GetRegistry() *ToolRegistry {
	return te.registry
}

// RegisterDefaultTools adds the standard platform tools to the registry.
func RegisterDefaultTools(registry *ToolRegistry) {
	tools := []entity.ToolDefinition{
		{
			Name:        "get_customer_profile",
			Description: "Retrieve a customer's profile information including name, preferences, and contact details.",
			ParametersJSON: `{"type":"object","properties":{"customer_id":{"type":"string","description":"The customer ID"}},"required":["customer_id"]}`,
		},
		{
			Name:        "get_customer_consent",
			Description: "Check the customer's communication consent status for a specific channel.",
			ParametersJSON: `{"type":"object","properties":{"customer_id":{"type":"string"},"channel":{"type":"string","enum":["email","sms","push","inbox"]}},"required":["customer_id","channel"]}`,
		},
		{
			Name:        "get_customer_availability",
			Description: "Check the customer's availability schedule and DND status.",
			ParametersJSON: `{"type":"object","properties":{"customer_id":{"type":"string"}},"required":["customer_id"]}`,
		},
		{
			Name:        "evaluate_policy",
			Description: "Evaluate a communication policy to determine whether a message can be delivered.",
			ParametersJSON: `{"type":"object","properties":{"user_id":{"type":"string"},"service_provider_id":{"type":"string"},"category":{"type":"string"},"channel":{"type":"string"}},"required":["user_id","service_provider_id","category"]}`,
		},
		{
			Name:        "send_notification",
			Description: "Send a notification to a user through the platform.",
			ParametersJSON: `{"type":"object","properties":{"user_id":{"type":"string"},"title":{"type":"string"},"body":{"type":"string"},"category":{"type":"string"}},"required":["user_id","title","body"]}`,
		},
		{
			Name:        "send_message",
			Description: "Send a conversational message to a user.",
			ParametersJSON: `{"type":"object","properties":{"conversation_id":{"type":"string"},"content":{"type":"string"}},"required":["conversation_id","content"]}`,
		},
		{
			Name:        "request_callback",
			Description: "Request a callback with a user at a specified time.",
			ParametersJSON: `{"type":"object","properties":{"user_id":{"type":"string"},"reason":{"type":"string"},"preferred_time":{"type":"string","description":"ISO 8601 datetime"}},"required":["user_id","reason"]}`,
		},
		{
			Name:        "share_document",
			Description: "Share a document with a user through the platform.",
			ParametersJSON: `{"type":"object","properties":{"user_id":{"type":"string"},"document_id":{"type":"string"},"message":{"type":"string"}},"required":["user_id","document_id"]}`,
		},
		{
			Name:        "get_conversation_summary",
			Description: "Get a summary of the current or a previous conversation.",
			ParametersJSON: `{"type":"object","properties":{"conversation_id":{"type":"string"}},"required":["conversation_id"]}`,
		},
		{
			Name:        "escalate_to_human",
			Description: "Escalate the current conversation to a human agent.",
			ParametersJSON: `{"type":"object","properties":{"conversation_id":{"type":"string"},"reason":{"type":"string"},"priority":{"type":"string","enum":["low","medium","high"]}},"required":["conversation_id","reason"]}`,
		},
	}

	for _, t := range tools {
		toolName := t.Name // capture in local variable for closure
		registry.Register(t, func(ctx context.Context, args json.RawMessage) (json.RawMessage, error) {
			// Default stub handler — real implementations would call downstream services via gRPC.
			result := map[string]interface{}{
				"status": "executed",
				"tool":   toolName,
				"args":   json.RawMessage(args),
			}
			out, _ := json.Marshal(result)
			return out, nil
		})
	}
}
