package events

import (
	"context"
	"sync"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestAllEventTypes_Count(t *testing.T) {
	types := AllEventTypes()
	if len(types) < 25 {
		t.Errorf("expected at least 25 event types, got %d", len(types))
	}
}

func TestAllEventTypes_Unique(t *testing.T) {
	seen := make(map[EventType]bool)
	for _, et := range AllEventTypes() {
		if seen[et] {
			t.Errorf("duplicate event type: %s", et)
		}
		seen[et] = true
	}
}

func TestNewEvent(t *testing.T) {
	evt := NewEvent(UserRegistered, "auth-service", map[string]string{"user_id": "u1"})
	if evt.ID == "" {
		t.Error("event ID should not be empty")
	}
	if evt.Type != UserRegistered {
		t.Errorf("expected type %s, got %s", UserRegistered, evt.Type)
	}
	if evt.Source != "auth-service" {
		t.Errorf("expected source auth-service, got %s", evt.Source)
	}
	if evt.Data["user_id"] != "u1" {
		t.Error("expected data[user_id] = u1")
	}
	if evt.Time.IsZero() {
		t.Error("event time should not be zero")
	}
}

func TestEvent_Builder(t *testing.T) {
	evt := NewEvent(OrganizationCreated, "org-service", nil).
		WithSubject("org-123").
		WithCorrelation("req-456").
		WithUser("user-1").
		WithOrg("org-123")

	if evt.Subject != "org-123" {
		t.Errorf("expected subject org-123, got %s", evt.Subject)
	}
	if evt.CorrelationID != "req-456" {
		t.Errorf("expected correlation req-456, got %s", evt.CorrelationID)
	}
	if evt.UserID != "user-1" {
		t.Errorf("expected user user-1, got %s", evt.UserID)
	}
	if evt.OrgID != "org-123" {
		t.Errorf("expected org org-123, got %s", evt.OrgID)
	}
}

func TestNoopPublisher(t *testing.T) {
	p := NoopPublisher{}
	err := p.Publish(context.Background(), NewEvent(UserLoggedIn, "test", nil))
	if err != nil {
		t.Errorf("NoopPublisher should not return error, got %v", err)
	}
}

func TestEventRouter_PublishAndConsume(t *testing.T) {
	log := zap.NewNop()
	router := NewEventRouter(10, log)

	var mu sync.Mutex
	received := make([]Event, 0)

	router.Subscribe(func(ctx context.Context, evt Event) error {
		mu.Lock()
		defer mu.Unlock()
		received = append(received, evt)
		return nil
	}, UserRegistered, UserLoggedIn)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go router.Start(ctx)

	// Publish events
	_ = router.Publish(ctx, NewEvent(UserRegistered, "auth", map[string]string{"user": "u1"}))
	_ = router.Publish(ctx, NewEvent(UserLoggedIn, "auth", map[string]string{"user": "u2"}))
	_ = router.Publish(ctx, NewEvent(OrganizationCreated, "org", nil)) // should not be received

	// Wait for processing
	time.Sleep(100 * time.Millisecond)
	cancel()

	mu.Lock()
	defer mu.Unlock()
	if len(received) != 2 {
		t.Errorf("expected 2 events, got %d", len(received))
	}
}

func TestEventRouter_MultipleHandlers(t *testing.T) {
	log := zap.NewNop()
	router := NewEventRouter(10, log)

	var count int
	var mu sync.Mutex

	handler := func(ctx context.Context, evt Event) error {
		mu.Lock()
		defer mu.Unlock()
		count++
		return nil
	}

	router.Subscribe(handler, PolicyEvaluated)
	router.Subscribe(handler, PolicyEvaluated)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go router.Start(ctx)

	_ = router.Publish(ctx, NewEvent(PolicyEvaluated, "policy", nil))

	time.Sleep(100 * time.Millisecond)
	cancel()

	mu.Lock()
	defer mu.Unlock()
	if count != 2 {
		t.Errorf("expected 2 handler calls, got %d", count)
	}
}
