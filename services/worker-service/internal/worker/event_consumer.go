package worker

import (
	"context"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// EventConsumer processes domain events routed to the worker service.
// It handles delivery, campaign, and cleanup event types.
type EventConsumer struct {
	delivery  *DeliveryProcessor
	callback  *CallbackReminderProcessor
	cleanup   *CleanupProcessor
	log       *zap.Logger
}

// NewEventConsumer creates a new worker event consumer wired to the
// existing job processors.
func NewEventConsumer(
	delivery *DeliveryProcessor,
	callback *CallbackReminderProcessor,
	cleanup *CleanupProcessor,
	log *zap.Logger,
) *EventConsumer {
	return &EventConsumer{
		delivery: delivery,
		callback: callback,
		cleanup:  cleanup,
		log:      log,
	}
}

// SubscribedEventTypes returns the event types the worker cares about.
func (c *EventConsumer) SubscribedEventTypes() []events.EventType {
	return []events.EventType{
		// delivery
		events.NotificationCreated,
		events.DeliveryAttempted,
		events.DeliverySucceeded,
		events.DeliveryFailed,
		// campaign
		events.CampaignStarted,
		events.CampaignCompleted,
		events.CampaignPaused,
		// cleanup
		events.CleanupStarted,
		events.CleanupCompleted,
		events.CallbackRequestExpired,
	}
}

// Handle is the EventHandler that dispatches events to the appropriate
// job processor.
func (c *EventConsumer) Handle(ctx context.Context, evt events.Event) error {
	c.log.Info("worker consuming event",
		zap.String("event_type", string(evt.Type)),
		zap.String("event_id", evt.ID),
	)

	switch evt.Type {
	// Delivery events → DeliveryProcessor
	case events.NotificationCreated:
		return c.delivery.Process(ctx, &Job{
			ID:      evt.ID,
			Type:    "DELIVERY",
			Payload: evt.Data,
			Status:  "PENDING",
		})
	case events.DeliveryAttempted, events.DeliveryFailed:
		jobID := evt.Data["delivery_id"]
		if jobID == "" {
			jobID = evt.ID
		}
		return c.delivery.Process(ctx, &Job{
			ID:      jobID,
			Type:    "DELIVERY",
			Payload: evt.Data,
			Status:  "RETRY",
		})
	case events.DeliverySucceeded:
		c.log.Info("delivery succeeded", zap.String("event_id", evt.ID))

	// Campaign events → DeliveryProcessor (campaigns are batch deliveries)
	case events.CampaignStarted:
		return c.delivery.Process(ctx, &Job{
			ID:      evt.ID,
			Type:    "CAMPAIGN_SEND",
			Payload: evt.Data,
			Status:  "PENDING",
		})
	case events.CampaignCompleted, events.CampaignPaused:
		c.log.Info("campaign status change", zap.String("event_type", string(evt.Type)))

	// Callback expiry → CallbackReminderProcessor
	case events.CallbackRequestExpired:
		return c.callback.Process(ctx, &Job{
			ID:      evt.ID,
			Type:    "CALLBACK_REMINDER",
			Payload: evt.Data,
			Status:  "PENDING",
		})

	// Cleanup events → CleanupProcessor
	case events.CleanupStarted:
		return c.cleanup.Process(ctx, &Job{
			ID:      evt.ID,
			Type:    "CLEANUP",
			Payload: evt.Data,
			Status:  "PENDING",
		})
	case events.CleanupCompleted:
		c.log.Info("cleanup completed", zap.String("event_id", evt.ID))

	default:
		c.log.Warn("unexpected event type in worker consumer", zap.String("type", string(evt.Type)))
	}
	return nil
}

// Register subscribes this consumer's handler to the given router.
func (c *EventConsumer) Register(router *events.EventRouter) {
	router.Subscribe(c.Handle, c.SubscribedEventTypes()...)
}
