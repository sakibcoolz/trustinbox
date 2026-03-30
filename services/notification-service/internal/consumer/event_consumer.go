package consumer

import (
	"context"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// PushNotifier abstracts the real-time push notification channel (e.g., WebSocket, SSE).
type PushNotifier interface {
	NotifyUser(ctx context.Context, userID string, payload map[string]string) error
}

// EventConsumer handles incoming events that require real-time push
// notifications to connected users.
type EventConsumer struct {
	notifier PushNotifier
	log      *zap.Logger
}

// NewEventConsumer creates a notification event consumer.
func NewEventConsumer(notifier PushNotifier, log *zap.Logger) *EventConsumer {
	return &EventConsumer{
		notifier: notifier,
		log:      log,
	}
}

// SubscribedEventTypes returns the event types requiring real-time push.
func (c *EventConsumer) SubscribedEventTypes() []events.EventType {
	return []events.EventType{
		events.NotificationCreated,
		events.NotificationDelivered,
		events.CallbackRequestCreated,
		events.CallbackRequestApproved,
		events.CallbackRequestRejected,
		events.MessageSent,
	}
}

// Handle pushes real-time notifications to connected users.
func (c *EventConsumer) Handle(ctx context.Context, evt events.Event) error {
	c.log.Info("notification push consumer received event",
		zap.String("event_type", string(evt.Type)),
		zap.String("event_id", evt.ID),
		zap.String("user_id", evt.UserID),
	)

	if evt.UserID == "" {
		c.log.Debug("skipping push: no user_id on event")
		return nil
	}

	payload := map[string]string{
		"event_type": string(evt.Type),
		"event_id":   evt.ID,
	}
	for k, v := range evt.Data {
		payload[k] = v
	}

	if c.notifier != nil {
		if err := c.notifier.NotifyUser(ctx, evt.UserID, payload); err != nil {
			c.log.Error("failed to push notification",
				zap.String("user_id", evt.UserID),
				zap.Error(err),
			)
			return err
		}
	}

	return nil
}

// Register subscribes this consumer's handler to the given router.
func (c *EventConsumer) Register(router *events.EventRouter) {
	router.Subscribe(c.Handle, c.SubscribedEventTypes()...)
}
