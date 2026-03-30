package consumer

import (
	"context"
	"encoding/json"

	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/webhook-service/internal/usecase"
	"go.uber.org/zap"
)

const (
	StreamName    = "trustinbox:events"
	ConsumerGroup = "webhook-service"
)

// EventConsumer listens to the shared event stream and dispatches matching
// events to webhook subscriptions.
type EventConsumer struct {
	uc     *usecase.WebhookUseCase
	logger *zap.Logger
}

// NewEventConsumer creates a new event consumer for webhook dispatch.
func NewEventConsumer(uc *usecase.WebhookUseCase, logger *zap.Logger) *EventConsumer {
	return &EventConsumer{uc: uc, logger: logger}
}

// Handle processes an incoming event from the Redis stream. It converts the
// event's type to the webhook event name (e.g. "notification.created" →
// "notification.sent") and dispatches it to all matching active subscriptions.
func (c *EventConsumer) Handle(ctx context.Context, event *events.Event) error {
	webhookEvent := mapEventType(event.Type)
	if webhookEvent == "" {
		return nil
	}

	payload, err := json.Marshal(event)
	if err != nil {
		c.logger.Error("failed to marshal event for webhook payload",
			zap.String("event_id", event.ID),
			zap.Error(err),
		)
		return err
	}

	count, err := c.uc.DispatchEvent(ctx, webhookEvent, string(payload))
	if err != nil {
		c.logger.Error("webhook dispatch failed",
			zap.String("event_type", webhookEvent),
			zap.Error(err),
		)
		return err
	}

	if count > 0 {
		c.logger.Info("webhook deliveries enqueued",
			zap.String("event_type", webhookEvent),
			zap.Int("count", count),
		)
	}
	return nil
}

// mapEventType converts internal event types to the webhook event names
// that subscribers register for.
func mapEventType(et events.EventType) string {
	switch et {
	case events.NotificationCreated:
		return "notification.sent"
	case events.NotificationDelivered:
		return "notification.delivered"
	case events.NotificationArchived:
		return "notification.failed"

	case events.CallbackRequested:
		return "callback.requested"
	case events.CallbackApproved:
		return "callback.approved"
	case events.CallbackRejected:
		return "callback.denied"

	case events.CampaignLaunched:
		return "campaign.sent"
	case events.CampaignCompleted:
		return "campaign.completed"

	case events.BotActionExecuted:
		return "bot.action.executed"
	case events.BotEscalated:
		return "bot.escalated"

	case events.PolicyEvaluated:
		return "policy.denied"

	case events.CustomerBlockedSP:
		return "customer.opted_out"
	case events.CustomerUnblockedSP:
		return "customer.opted_in"

	default:
		return ""
	}
}
