package usecase

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
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

func TestListDeliveries_Success(t *testing.T) {
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(newMockSubRepo(), deliveryRepo)

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Status:         entity.DeliveryPending,
	}
	deliveryRepo.deliveries["d-2"] = &entity.WebhookDelivery{
		ID:             "d-2",
		SubscriptionID: "sub-1",
		EventType:      "callback.requested",
		Status:         entity.DeliverySuccess,
	}

	deliveries, total, err := uc.ListDeliveries(context.Background(), "sub-1", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected 2 total, got %d", total)
	}
	if len(deliveries) != 2 {
		t.Errorf("expected 2 deliveries, got %d", len(deliveries))
	}
}

func TestEnqueueDelivery_Success(t *testing.T) {
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(newMockSubRepo(), deliveryRepo)

	d, err := uc.EnqueueDelivery(context.Background(), "sub-1", "notification.sent", `{"test":true}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.ID == "" {
		t.Error("expected delivery ID to be set")
	}
	if d.SubscriptionID != "sub-1" {
		t.Errorf("expected sub-1, got %s", d.SubscriptionID)
	}
	if d.EventType != "notification.sent" {
		t.Errorf("expected notification.sent, got %s", d.EventType)
	}
	if d.Status != entity.DeliveryPending {
		t.Errorf("expected PENDING, got %s", d.Status)
	}
	if d.MaxRetries != 5 {
		t.Errorf("expected 5 max retries, got %d", d.MaxRetries)
	}
}

func TestTestSubscription_Success(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	// Start a test HTTP server that returns 200
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "application/json" {
			t.Error("expected application/json content type")
		}
		if r.Header.Get("X-Webhook-Event") != "webhook.test" {
			t.Error("expected webhook.test event header")
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer ts.Close()

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", ts.URL, "test sub", []string{"notification.sent"},
	)

	result, err := uc.TestSubscription(context.Background(), sub.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Success {
		t.Error("expected test to succeed")
	}
	if result.ResponseStatus != 200 {
		t.Errorf("expected 200 status, got %d", result.ResponseStatus)
	}
	if result.ResponseBody != `{"ok":true}` {
		t.Errorf("unexpected response body: %s", result.ResponseBody)
	}
	if result.DurationMs < 0 {
		t.Error("expected non-negative duration")
	}
}

func TestTestSubscription_ServerError(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer ts.Close()

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", ts.URL, "test sub", []string{"notification.sent"},
	)

	result, err := uc.TestSubscription(context.Background(), sub.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Success {
		t.Error("expected test to fail for 500 response")
	}
	if result.ResponseStatus != 500 {
		t.Errorf("expected 500 status, got %d", result.ResponseStatus)
	}
}

func TestTestSubscription_WrongSP(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", "https://example.com/hook", "test sub", []string{"notification.sent"},
	)

	_, err := uc.TestSubscription(context.Background(), sub.ID, "sp-other")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestTestSubscription_HMACSigning(t *testing.T) {
	subRepo := newMockSubRepo()
	uc := NewWebhookUseCase(subRepo, newMockDeliveryRepo())

	var receivedSig string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedSig = r.Header.Get("X-Webhook-Signature-256")
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	sub, _, _ := uc.CreateSubscription(context.Background(),
		"sp-1", ts.URL, "test sub", []string{"notification.sent"},
	)

	_, err := uc.TestSubscription(context.Background(), sub.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if receivedSig == "" {
		t.Error("expected HMAC signature header to be set")
	}
	if len(receivedSig) < 10 || receivedSig[:7] != "sha256=" {
		t.Errorf("expected signature to start with sha256=, got %s", receivedSig)
	}
}

func TestDispatchEvent_SkipsPaused(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := NewWebhookUseCase(subRepo, deliveryRepo)

	subRepo.byEvent["callback.requested"] = []*entity.WebhookSubscription{
		{ID: "sub-1", Status: entity.WebhookStatusPaused},
		{ID: "sub-2", Status: entity.WebhookStatusDisabled},
	}

	count, err := uc.DispatchEvent(context.Background(), "callback.requested", `{}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0 deliveries for paused/disabled subscriptions, got %d", count)
	}
}

func TestRetryDelivery_NotFound(t *testing.T) {
	uc := NewWebhookUseCase(newMockSubRepo(), newMockDeliveryRepo())
	_, err := uc.RetryDelivery(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent delivery")
	}
}
