package worker

import (
	"context"
	"encoding/json"

	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/tracing"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// AgentSuiteProcessor provisions agent suites when a service provider is created.
type AgentSuiteProcessor struct {
	botClient botpb.BotServiceClient
	log       *zap.Logger
}

// NewAgentSuiteProcessor creates a new AgentSuiteProcessor.
func NewAgentSuiteProcessor(botClient botpb.BotServiceClient, log *zap.Logger) *AgentSuiteProcessor {
	return &AgentSuiteProcessor{botClient: botClient, log: log}
}

// ProcessEvent handles the service_provider.created event by provisioning an agent suite.
func (p *AgentSuiteProcessor) ProcessEvent(ctx context.Context, evt *events.Event) error {
	ctx, span := tracing.StartSpan(ctx, "worker-service", "AgentSuiteProcessor.ProcessEvent",
		attribute.String("event_id", evt.ID),
		attribute.String("service_provider_id", evt.ServiceProviderID),
	)
	defer span.End()

	spID := evt.ServiceProviderID

	// Payload may contain created_by_sp_user_id
	var payload struct {
		CreatedBySPUserID string `json:"created_by_sp_user_id"`
	}
	if len(evt.Payload) > 0 {
		_ = json.Unmarshal(evt.Payload, &payload)
	}

	p.log.Info("provisioning agent suite for new service provider",
		zap.String("service_provider_id", spID),
	)

	_, err := p.botClient.ProvisionAgentSuite(ctx, &botpb.ProvisionAgentSuiteRequest{
		ServiceProviderId: spID,
		CreatedBySpUserId: payload.CreatedBySPUserID,
	})
	if err != nil {
		p.log.Error("failed to provision agent suite",
			zap.String("service_provider_id", spID),
			zap.Error(err),
		)
		// Do not fail the event — suite can be provisioned manually if needed
		return nil
	}

	p.log.Info("agent suite provisioned",
		zap.String("service_provider_id", spID),
	)
	return nil
}
