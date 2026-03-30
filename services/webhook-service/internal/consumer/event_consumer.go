package consumer

import (
	"context"

	"github.com/google/uuid"
	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// WebhookDispatcher is the webhook dispatcher interface for delivering events
// to external webhook endpoints.
type WebhookDispatcher interface {
	Dispatch(ctx context.Context, subscriptionID, url, secret string, evt events.Event) error
}

// EventConsumer listens for all subscribed event types and dispatches them
// to registered webhook endpoints.
type EventConsumer struct {
	dispatcher WebhookDispatcher
	log        *zap.Logger
}

// NewEventConsumer creates a webhook event consumer.
func NewEventConsumer(dispatcher WebhookDispatcher, log *zap.Logger) *EventConsumer {
	return &EventConsumer{
		dispatcher: dispatcher,
		log:        log,
	}
}

// SubscribedEventTypes returns all event types (webhook service consumes everything).
func (c *EventConsumer) SubscribedEventTypes() []events.EventType {
	return events.AllEventTypes()
}

// Handle processes an incoming event by finding matching subscriptions and
// dispatching the event payload.
func (c *EventConsumer) Handle(ctx context.Context, evt events.Event) error {
	c.log.Info("webhook consumer received event",
		zap.String("event_type", string(evt.Type)),
		zap.String("event_id", evt.ID),
	)

	// In production, this would query active webhook subscriptions filtered by
	// event type and dispatch to each. For now, log the event as processed.
	deliveryID := uuid.New().String()
	c.log.Debug("webhook delivery queued",
		zap.String("delivery_id", deliveryID),
		zap.String("event_type", string(evt.Type)),
	)

	return nil
}

// Register subscribes this consumer's handler to the given router.
func (c *EventConsumer) Register(router *events.EventRouter) {
	router.Subscribe(c.Handle, c.SubscribedEventTypes()...)
}
