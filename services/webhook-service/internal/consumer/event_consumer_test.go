package consumer

import (
	"context"
	"testing"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

func TestEventConsumer_SubscribedEventTypes(t *testing.T) {
	c := NewEventConsumer(nil, zap.NewNop())
	types := c.SubscribedEventTypes()
	// Webhook service subscribes to ALL event types
	allTypes := events.AllEventTypes()
	if len(types) != len(allTypes) {
		t.Errorf("expected %d event types, got %d", len(allTypes), len(types))
	}
}

func TestEventConsumer_HandleEvent(t *testing.T) {
	c := NewEventConsumer(nil, zap.NewNop())
	evt := events.NewEvent(events.UserRegistered, "test", map[string]string{
		"user_id": "u-1",
	})
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
