package consumer

import (
	"context"
	"testing"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

func TestEventConsumer_SubscribedEventTypes(t *testing.T) {
	c := NewEventConsumer(zap.NewNop())
	types := c.SubscribedEventTypes()
	if len(types) == 0 {
		t.Error("expected at least one subscribed event type")
	}
}

func TestEventConsumer_HandleAndCount(t *testing.T) {
	c := NewEventConsumer(zap.NewNop())

	ctx := context.Background()
	_ = c.Handle(ctx, events.NewEvent(events.PolicyAllowed, "test", nil))
	_ = c.Handle(ctx, events.NewEvent(events.PolicyAllowed, "test", nil))
	_ = c.Handle(ctx, events.NewEvent(events.PolicyDenied, "test", nil))

	if got := c.GetCount(events.PolicyAllowed); got != 2 {
		t.Errorf("expected PolicyAllowed count=2, got %d", got)
	}
	if got := c.GetCount(events.PolicyDenied); got != 1 {
		t.Errorf("expected PolicyDenied count=1, got %d", got)
	}
	if got := c.GetCount(events.UserRegistered); got != 0 {
		t.Errorf("expected UserRegistered count=0, got %d", got)
	}
}
