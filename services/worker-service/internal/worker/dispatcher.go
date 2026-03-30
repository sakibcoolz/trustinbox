package worker

import (
	"context"
	"fmt"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// Dispatcher routes events to the appropriate processor based on event type.
type Dispatcher struct {
	delivery *DeliveryProcessor
	callback *CallbackReminderProcessor
	campaign *CampaignSendProcessor
	log      *zap.Logger
}

func NewDispatcher(
	delivery *DeliveryProcessor,
	callback *CallbackReminderProcessor,
	campaign *CampaignSendProcessor,
	log *zap.Logger,
) *Dispatcher {
	return &Dispatcher{
		delivery: delivery,
		callback: callback,
		campaign: campaign,
		log:      log,
	}
}

// Handle is the events.Handler used by the Redis Streams consumer.
func (d *Dispatcher) Handle(ctx context.Context, evt *events.Event) error {
	d.log.Info("dispatching event",
		zap.String("event_id", evt.ID),
		zap.String("event_type", string(evt.Type)),
	)

	switch evt.Type {
	// Delivery
	case events.NotificationCreated:
		return d.delivery.ProcessEvent(ctx, evt)

	// Callback lifecycle
	case events.CallbackRequested, events.CallbackApproved, events.CallbackExpired:
		return d.callback.ProcessEvent(ctx, evt)

	// Campaign fan-out
	case events.CampaignLaunched:
		return d.campaign.ProcessEvent(ctx, evt)

	default:
		d.log.Debug("unhandled event type, skipping",
			zap.String("event_type", string(evt.Type)),
		)
		return nil
	}
}

// SubscribedEventTypes returns all event types the worker cares about.
func SubscribedEventTypes() []events.EventType {
	return []events.EventType{
		events.NotificationCreated,
		events.CallbackRequested,
		events.CallbackApproved,
		events.CallbackExpired,
		events.CampaignLaunched,
	}
}

// StreamName is the Redis Stream the worker consumes from.
const StreamName = "trustinbox:events"

// ConsumerGroup is the consumer group name for the worker.
const ConsumerGroup = "worker-service"

// ConsumerName returns a unique consumer name.
func ConsumerName(hostname string) string {
	return fmt.Sprintf("worker-%s", hostname)
}
