package consumer

import (
	"context"
	"sync"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// EventConsumer aggregates domain events into analytics metrics.
type EventConsumer struct {
	mu       sync.Mutex
	counters map[string]int64 // eventType → count (in-memory for now)
	log      *zap.Logger
}

// NewEventConsumer creates an analytics event consumer.
func NewEventConsumer(log *zap.Logger) *EventConsumer {
	return &EventConsumer{
		counters: make(map[string]int64),
		log:      log,
	}
}

// SubscribedEventTypes returns all event types the analytics service tracks.
func (c *EventConsumer) SubscribedEventTypes() []events.EventType {
	return []events.EventType{
		// Policy metrics
		events.PolicyAllowed,
		events.PolicyDenied,
		events.PolicyEvaluated,
		// Delivery metrics
		events.DeliveryAttempted,
		events.DeliverySucceeded,
		events.DeliveryFailed,
		// Notification metrics
		events.NotificationCreated,
		events.NotificationDelivered,
		events.NotificationRead,
		// Communication metrics
		events.CallbackRequestCreated,
		events.CallbackRequestApproved,
		events.CallbackRequestRejected,
		events.MessageSent,
		events.SpamReported,
		// Campaign metrics
		events.CampaignStarted,
		events.CampaignCompleted,
		// Auth metrics
		events.UserRegistered,
		events.UserLoggedIn,
		// Organization metrics
		events.OrganizationCreated,
		events.OrganizationVerified,
		events.OrganizationSuspended,
	}
}

// Handle aggregates a single event into the analytics counters.
func (c *EventConsumer) Handle(ctx context.Context, evt events.Event) error {
	c.log.Debug("analytics consuming event",
		zap.String("event_type", string(evt.Type)),
		zap.String("event_id", evt.ID),
	)

	c.mu.Lock()
	c.counters[string(evt.Type)]++
	c.mu.Unlock()

	// In production, this would persist to the EventMetricRepository
	// with proper time-bucketing and organization scoping.
	return nil
}

// Register subscribes this consumer's handler to the given router.
func (c *EventConsumer) Register(router *events.EventRouter) {
	router.Subscribe(c.Handle, c.SubscribedEventTypes()...)
}

// GetCount returns the current count for a given event type. Useful for tests.
func (c *EventConsumer) GetCount(eventType events.EventType) int64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.counters[string(eventType)]
}
