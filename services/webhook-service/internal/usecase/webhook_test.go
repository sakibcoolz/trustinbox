package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
)

// --- Mock repositories ---

type mockSubRepo struct {
	subs     map[string]*entity.WebhookSubscription
	byEvent  map[string][]*entity.WebhookSubscription
	createFn func(ctx context.Context, sub *entity.WebhookSubscription) error
}

func newMockSubRepo() *mockSubRepo {
	return &mockSubRepo{
		subs:    make(map[string]*entity.WebhookSubscription),
		byEvent: make(map[string][]*entity.WebhookSubscription),
	}
}

func (m *mockSubRepo) Create(ctx context.Context, sub *entity.WebhookSubscription) error {
	if m.createFn != nil {
		return m.createFn(ctx, sub)
	}
	m.subs[sub.ID] = sub
	return nil
}

func (m *mockSubRepo) GetByID(ctx context.Context, id string) (*entity.WebhookSubscription, error) {
	if s, ok := m.subs[id]; ok {
		return s, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] webhook_subscription not found: %s", id)
}

func (m *mockSubRepo) Update(ctx context.Context, sub *entity.WebhookSubscription) error {
	m.subs[sub.ID] = sub
	return nil
}

func (m *mockSubRepo) Delete(ctx context.Context, id string) error {
	delete(m.subs, id)
	return nil
}

func (m *mockSubRepo) ListBySP(ctx context.Context, spID string, limit, offset int) ([]*entity.WebhookSubscription, int, error) {
	var result []*entity.WebhookSubscription
	for _, s := range m.subs {
		if s.ServiceProviderID == spID {
			result = append(result, s)
		}
	}
	return result, len(result), nil
}

func (m *mockSubRepo) FindByEvent(ctx context.Context, eventType string) ([]*entity.WebhookSubscription, error) {
	return m.byEvent[eventType], nil
}

type mockDeliveryRepo struct {
	deliveries map[string]*entity.WebhookDelivery
}

func newMockDeliveryRepo() *mockDeliveryRepo {
	return &mockDeliveryRepo{deliveries: make(map[string]*entity.WebhookDelivery)}
}

func (m *mockDeliveryRepo) Create(ctx context.Context, d *entity.WebhookDelivery) error {
	m.deliveries[d.ID] = d
	return nil
}

func (m *mockDeliveryRepo) GetByID(ctx context.Context, id string) (*entity.WebhookDelivery, error) {
	if d, ok := m.deliveries[id]; ok {
		return d, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] webhook_delivery not found: %s", id)
}

func (m *mockDeliveryRepo) Update(ctx context.Context, d *entity.WebhookDelivery) error {
	m.deliveries[d.ID] = d
	return nil
}

func (m *mockDeliveryRepo) ListBySubscription(ctx context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error) {
	var result []*entity.WebhookDelivery
	for _, d := range m.deliveries {
		if d.SubscriptionID == subID {
			result = append(result, d)
		}
	}
	return result, len(result), nil
}

func (m *mockDeliveryRepo) GetPendingRetries(ctx context.Context, limit int) ([]*entity.WebhookDelivery, error) {
	var result []*entity.WebhookDelivery
	for _, d := range m.deliveries {
		if d.Status == entity.DeliveryPending {
			result = append(result, d)
		}
	}
	return result, nil
}

func TestCreateSubscription_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(subRepo, deliveryRepo)

	sub, secret, err := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/webhook", "test", []string{"notification.sent"},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub.ID == "" {
		t.Error("expected subscription ID to be set")
	}
	if sub.ServiceProviderID != "sp-1" {
		t.Errorf("expected sp-1, got %s", sub.ServiceProviderID)
	}
	if sub.URL != "https://example.com/webhook" {
		t.Errorf("expected URL to match")
	}
	if secret == "" {
		t.Error("expected signing secret to be returned")
	}
	if sub.Status != entity.WebhookStatusActive {
		t.Errorf("expected ACTIVE status, got %s", sub.Status)
	}
}

func TestCreateSubscription_EmptyURL(t *testing.T) {
	uc := NewWebhookUseCase(newMockSubRepo(), newMockDeliveryRepo())
	_, _, err := uc.CreateSubscription(context.Background(), "sp-1", "", "desc", []string{"notification.sent"})
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
}

func TestCreateSubscription_NoEvents(t *testing.T) {
	uc := NewWebhookUseCase(newMockSubRepo(), newMockDeliveryRepo())
	_, _, err := uc.CreateSubscription(context.Background(), "sp-1", "https://example.com", "desc", nil)
	if err == nil {
		t.Fatal("expected error for empty events")
	}
}

func TestCreateSubscription_InvalidEvent(t *testing.T) {
	uc := NewWebhookUseCase(newMockSubRepo(), newMockDeliveryRepo())
	_, _, err := uc.CreateSubscription(context.Background(), "sp-1", "https://example.com", "desc", []string{"invalid.event"})
	if err == nil {
		t.Fatal("expected error for invalid event type")
	}
}

func TestGetSubscription_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/webhook", "test", []string{"notification.sent"},
	)

	result, err := uc.GetSubscription(context.Background(), sub.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != sub.ID {
		t.Errorf("expected %s, got %s", sub.ID, result.ID)
	}
}

func TestGetSubscription_WrongSP(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/webhook", "test", []string{"notification.sent"},
	)

	_, err := uc.GetSubscription(context.Background(), sub.ID, "sp-other")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestDeleteSubscription_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/webhook", "test", []string{"notification.sent"},
	)

	err := uc.DeleteSubscription(context.Background(), sub.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(subRepo.subs) != 0 {
		t.Error("expected subscription to be deleted")
	}
}

func TestDispatchEvent_EnqueuesDeliveries(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(subRepo, deliveryRepo)

	// Pre-populate with matching subscriptions
	subRepo.byEvent["notification.sent"] = []*entity.WebhookSubscription{
		{ID: "sub-1", ServiceProviderID: "sp-1", URL: "https://a.com/hook", Status: entity.WebhookStatusActive},
		{ID: "sub-2", ServiceProviderID: "sp-2", URL: "https://b.com/hook", Status: entity.WebhookStatusActive},
		{ID: "sub-3", ServiceProviderID: "sp-3", URL: "https://c.com/hook", Status: entity.WebhookStatusPaused},
	}

	count, err := uc.DispatchEvent(context.Background(), "notification.sent", `{"test": true}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 deliveries (active only), got %d", count)
	}
	if len(deliveryRepo.deliveries) != 2 {
		t.Errorf("expected 2 deliveries in repo, got %d", len(deliveryRepo.deliveries))
	}
}

func TestRetryDelivery_Success(t *testing.T) {
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(newMockSubRepo(), deliveryRepo)

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:     "d-1",
		Status: entity.DeliveryFailed,
	}

	d, err := uc.RetryDelivery(context.Background(), "d-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Status != entity.DeliveryPending {
		t.Errorf("expected PENDING, got %s", d.Status)
	}
	if d.Attempts != 0 {
		t.Errorf("expected 0 attempts after retry, got %d", d.Attempts)
	}
}

func TestRetryDelivery_AlreadySucceeded(t *testing.T) {
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(newMockSubRepo(), deliveryRepo)

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:     "d-1",
		Status: entity.DeliverySuccess,
	}

	_, err := uc.RetryDelivery(context.Background(), "d-1")
	if err == nil {
		t.Fatal("expected error for already succeeded delivery")
	}
}

func TestUpdateSubscription_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/webhook", "test", []string{"notification.sent"},
	)

	updated, err := uc.UpdateSubscription(context.Background(),
		sub.ID, "sp-1", "https://new.example.com/webhook", "updated desc", "PAUSED", nil,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.URL != "https://new.example.com/webhook" {
		t.Errorf("expected updated URL, got %s", updated.URL)
	}
	if updated.Description != "updated desc" {
		t.Errorf("expected updated description")
	}
	if updated.Status != entity.WebhookStatusPaused {
		t.Errorf("expected PAUSED, got %s", updated.Status)
	}
}

func TestListSubscriptions_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	uc.CreateSubscription(context.Background(), "sp-1", "https://a.com", "a", []string{"notification.sent"})
	uc.CreateSubscription(context.Background(), "sp-1", "https://b.com", "b", []string{"callback.requested"})

	subs, total, err := uc.ListSubscriptions(context.Background(), "sp-1", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected 2 total, got %d", total)
	}
	if len(subs) != 2 {
		t.Errorf("expected 2 subs, got %d", len(subs))
	}
}
