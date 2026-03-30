package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/usecase"
	"go.uber.org/zap"
)

// --- Mock repositories ---

type mockSubRepo struct {
	subs    map[string]*entity.WebhookSubscription
	byEvent map[string][]*entity.WebhookSubscription
}

func newMockSubRepo() *mockSubRepo {
	return &mockSubRepo{
		subs:    make(map[string]*entity.WebhookSubscription),
		byEvent: make(map[string][]*entity.WebhookSubscription),
	}
}

func (m *mockSubRepo) Create(_ context.Context, sub *entity.WebhookSubscription) error {
	m.subs[sub.ID] = sub
	return nil
}

func (m *mockSubRepo) GetByID(_ context.Context, id string) (*entity.WebhookSubscription, error) {
	if s, ok := m.subs[id]; ok {
		return s, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] not found: %s", id)
}

func (m *mockSubRepo) Update(_ context.Context, sub *entity.WebhookSubscription) error {
	m.subs[sub.ID] = sub
	return nil
}

func (m *mockSubRepo) Delete(_ context.Context, id string) error {
	delete(m.subs, id)
	return nil
}

func (m *mockSubRepo) ListBySP(_ context.Context, spID string, limit, offset int) ([]*entity.WebhookSubscription, int, error) {
	return nil, 0, nil
}

func (m *mockSubRepo) FindByEvent(_ context.Context, eventType string) ([]*entity.WebhookSubscription, error) {
	return m.byEvent[eventType], nil
}

type mockDeliveryRepo struct {
	deliveries map[string]*entity.WebhookDelivery
}

func newMockDeliveryRepo() *mockDeliveryRepo {
	return &mockDeliveryRepo{deliveries: make(map[string]*entity.WebhookDelivery)}
}

func (m *mockDeliveryRepo) Create(_ context.Context, d *entity.WebhookDelivery) error {
	m.deliveries[d.ID] = d
	return nil
}

func (m *mockDeliveryRepo) GetByID(_ context.Context, id string) (*entity.WebhookDelivery, error) {
	if d, ok := m.deliveries[id]; ok {
		return d, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] not found: %s", id)
}

func (m *mockDeliveryRepo) Update(_ context.Context, d *entity.WebhookDelivery) error {
	m.deliveries[d.ID] = d
	return nil
}

func (m *mockDeliveryRepo) ListBySubscription(_ context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error) {
	return nil, 0, nil
}

func (m *mockDeliveryRepo) GetPendingRetries(_ context.Context, limit int) ([]*entity.WebhookDelivery, error) {
	return nil, nil
}

func TestHandle_DispatchesMatchingEvent(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := usecase.NewWebhookUseCase(subRepo, deliveryRepo)

	subRepo.byEvent["notification.sent"] = []*entity.WebhookSubscription{
		{ID: "sub-1", ServiceProviderID: "sp-1", URL: "https://a.com/hook", Status: entity.WebhookStatusActive},
	}

	logger, _ := zap.NewDevelopment()
	ec := NewEventConsumer(uc, logger)

	event := &events.Event{
		ID:         "evt-1",
		Type:       events.NotificationCreated,
		OccurredAt: time.Now().UTC(),
		Payload:    json.RawMessage(`{"test":true}`),
	}

	err := ec.Handle(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deliveryRepo.deliveries) != 1 {
		t.Errorf("expected 1 delivery, got %d", len(deliveryRepo.deliveries))
	}
}

func TestHandle_IgnoresUnmappedEvent(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := usecase.NewWebhookUseCase(subRepo, deliveryRepo)

	logger, _ := zap.NewDevelopment()
	ec := NewEventConsumer(uc, logger)

	// Use an event type that has no mapping
	event := &events.Event{
		ID:         "evt-1",
		Type:       events.DocumentOpened,
		OccurredAt: time.Now().UTC(),
		Payload:    json.RawMessage(`{}`),
	}

	err := ec.Handle(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(deliveryRepo.deliveries) != 0 {
		t.Errorf("expected 0 deliveries for unmapped event, got %d", len(deliveryRepo.deliveries))
	}
}

func TestHandle_MultipleSubscriptions(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := usecase.NewWebhookUseCase(subRepo, deliveryRepo)

	subRepo.byEvent["callback.requested"] = []*entity.WebhookSubscription{
		{ID: "sub-1", ServiceProviderID: "sp-1", URL: "https://a.com/hook", Status: entity.WebhookStatusActive},
		{ID: "sub-2", ServiceProviderID: "sp-2", URL: "https://b.com/hook", Status: entity.WebhookStatusActive},
		{ID: "sub-3", ServiceProviderID: "sp-3", URL: "https://c.com/hook", Status: entity.WebhookStatusPaused},
	}

	logger, _ := zap.NewDevelopment()
	ec := NewEventConsumer(uc, logger)

	event := &events.Event{
		ID:         "evt-2",
		Type:       events.CallbackRequested,
		OccurredAt: time.Now().UTC(),
		Payload:    json.RawMessage(`{"callback_id":"cb-1"}`),
	}

	err := ec.Handle(context.Background(), event)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Only active subscriptions should get deliveries (sub-1 and sub-2)
	if len(deliveryRepo.deliveries) != 2 {
		t.Errorf("expected 2 deliveries (active only), got %d", len(deliveryRepo.deliveries))
	}
}

func TestMapEventType_AllMappings(t *testing.T) {
	tests := []struct {
		input    events.EventType
		expected string
	}{
		{events.NotificationCreated, "notification.sent"},
		{events.NotificationDelivered, "notification.delivered"},
		{events.NotificationArchived, "notification.failed"},
		{events.CallbackRequested, "callback.requested"},
		{events.CallbackApproved, "callback.approved"},
		{events.CallbackRejected, "callback.denied"},
		{events.CampaignLaunched, "campaign.sent"},
		{events.CampaignCompleted, "campaign.completed"},
		{events.BotActionExecuted, "bot.action.executed"},
		{events.BotEscalated, "bot.escalated"},
		{events.PolicyEvaluated, "policy.denied"},
		{events.CustomerBlockedSP, "customer.opted_out"},
		{events.CustomerUnblockedSP, "customer.opted_in"},
		// Unmapped types
		{events.DocumentOpened, ""},
		{events.MessageSent, ""},
		{events.ConsentUpdated, ""},
	}

	for _, tc := range tests {
		t.Run(string(tc.input), func(t *testing.T) {
			result := mapEventType(tc.input)
			if result != tc.expected {
				t.Errorf("mapEventType(%s) = %q, want %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestConstants(t *testing.T) {
	if StreamName != "trustinbox:events" {
		t.Errorf("expected stream name 'trustinbox:events', got %s", StreamName)
	}
	if ConsumerGroup != "webhook-service" {
		t.Errorf("expected consumer group 'webhook-service', got %s", ConsumerGroup)
	}
}
