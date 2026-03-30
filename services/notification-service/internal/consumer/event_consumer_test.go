package consumer

import (
	"context"
	"sync"
	"testing"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

type mockPushNotifier struct {
	mu       sync.Mutex
	messages []map[string]string
}

func (m *mockPushNotifier) NotifyUser(ctx context.Context, userID string, payload map[string]string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, payload)
	return nil
}

func TestEventConsumer_SubscribedEventTypes(t *testing.T) {
	c := NewEventConsumer(nil, zap.NewNop())
	types := c.SubscribedEventTypes()
	if len(types) == 0 {
		t.Error("expected at least one subscribed event type")
	}
	// Check key event types are present
	want := map[events.EventType]bool{
		events.NotificationCreated:    false,
		events.CallbackRequestCreated: false,
		events.MessageSent:            false,
	}
	for _, et := range types {
		if _, ok := want[et]; ok {
			want[et] = true
		}
	}
	for et, found := range want {
		if !found {
			t.Errorf("expected event type %s in subscriptions", et)
		}
	}
}

func TestEventConsumer_HandleWithNotifier(t *testing.T) {
	notifier := &mockPushNotifier{}
	c := NewEventConsumer(notifier, zap.NewNop())

	evt := events.NewEvent(events.NotificationCreated, "test", map[string]string{
		"notification_id": "notif-1",
	}).WithUser("user-1")

	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	notifier.mu.Lock()
	defer notifier.mu.Unlock()
	if len(notifier.messages) != 1 {
		t.Errorf("expected 1 push notification, got %d", len(notifier.messages))
	}
}

func TestEventConsumer_SkipWithoutUserID(t *testing.T) {
	notifier := &mockPushNotifier{}
	c := NewEventConsumer(notifier, zap.NewNop())

	// Event without user ID should be skipped
	evt := events.NewEvent(events.NotificationCreated, "test", nil)
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	notifier.mu.Lock()
	defer notifier.mu.Unlock()
	if len(notifier.messages) != 0 {
		t.Errorf("expected 0 push notifications, got %d", len(notifier.messages))
	}
}
