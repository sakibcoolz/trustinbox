package consumer

import (
	"context"
	"encoding/json"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

const (
	StreamName    = "trustinbox:events"
	ConsumerGroup = "notification-push"
)

// PushNotifier abstracts the real-time push mechanism (WebSocket, SSE, etc.).
type PushNotifier interface {
	NotifyUser(ctx context.Context, userID string, eventType string, payload json.RawMessage) error
}

// EventConsumer listens to the shared event stream and pushes real-time
// notifications to connected users.
type EventConsumer struct {
	notifier PushNotifier
	logger   *zap.Logger
}

// NewEventConsumer creates a new event consumer for real-time notification push.
func NewEventConsumer(notifier PushNotifier, logger *zap.Logger) *EventConsumer {
	return &EventConsumer{notifier: notifier, logger: logger}
}

// Handle processes an incoming event from the Redis stream and pushes
// real-time updates to affected users.
func (c *EventConsumer) Handle(ctx context.Context, event *events.Event) error {
	if !isRealtimeEvent(event.Type) {
		return nil
	}

	userID := event.UserID
	if userID == "" {
		c.logger.Debug("skipping event without user_id for push", zap.String("type", string(event.Type)))
		return nil
	}

	payload, err := json.Marshal(event)
	if err != nil {
		c.logger.Error("failed to marshal event for push",
			zap.String("event_id", event.ID),
			zap.Error(err),
		)
		return err
	}

	if c.notifier != nil {
		if err := c.notifier.NotifyUser(ctx, userID, string(event.Type), payload); err != nil {
			c.logger.Error("real-time push failed",
				zap.String("event_type", string(event.Type)),
				zap.String("user_id", userID),
				zap.Error(err),
			)
			return nil // Don't fail the consumer for push errors
		}

		c.logger.Debug("real-time push sent",
			zap.String("event_type", string(event.Type)),
			zap.String("user_id", userID),
		)
	}

	return nil
}

// isRealtimeEvent returns true for event types that should trigger real-time push.
func isRealtimeEvent(et events.EventType) bool {
	switch et {
	case events.NotificationCreated,
		events.NotificationDelivered,
		events.NotificationRead,
		events.CallbackRequested,
		events.CallbackApproved,
		events.CallbackRejected,
		events.CallbackExpired,
		events.MessageSent,
		events.MessageRead,
		events.DocumentShared,
		events.BotEscalated:
		return true
	default:
		return false
	}
}
