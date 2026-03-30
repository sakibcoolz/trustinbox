package http

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"go.uber.org/zap"
)

// --- Mock repositories ---

type mockSubRepo struct {
	subs map[string]*entity.WebhookSubscription
}

func newMockSubRepo() *mockSubRepo {
	return &mockSubRepo{subs: make(map[string]*entity.WebhookSubscription)}
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
	return nil, nil
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
	var result []*entity.WebhookDelivery
	for _, d := range m.deliveries {
		if d.Status == entity.DeliveryPending {
			result = append(result, d)
		}
	}
	return result, nil
}

func newTestWorker(subRepo *mockSubRepo, deliveryRepo *mockDeliveryRepo) *DeliveryWorker {
	logger, _ := zap.NewDevelopment()
	return &DeliveryWorker{
		subRepo:      subRepo,
		deliveryRepo: deliveryRepo,
		client:       &http.Client{Timeout: 5 * time.Second},
		logger:       logger,
		batchSize:    50,
		interval:     time.Second,
	}
}

func TestDeliver_SuccessfulDelivery(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Error("expected application/json content type")
		}
		if r.Header.Get("X-Webhook-Event") != "notification.sent" {
			t.Error("expected event header")
		}
		if r.Header.Get("X-Webhook-Delivery") != "d-1" {
			t.Error("expected delivery ID header")
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"received":true}`))
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:         "sub-1",
		URL:        ts.URL,
		SecretHash: "test-secret-123",
		Status:     entity.WebhookStatusActive,
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		Attempts:       0,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	d := deliveryRepo.deliveries["d-1"]
	if d.Status != entity.DeliverySuccess {
		t.Errorf("expected SUCCESS, got %s", d.Status)
	}
	if d.ResponseStatus != 200 {
		t.Errorf("expected 200 status, got %d", d.ResponseStatus)
	}
	if d.DeliveredAt == nil {
		t.Error("expected DeliveredAt to be set")
	}
	if d.Attempts != 1 {
		t.Errorf("expected 1 attempt, got %d", d.Attempts)
	}
}

func TestDeliver_ServerError_SchedulesRetry(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("error"))
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:     "sub-1",
		URL:    ts.URL,
		Status: entity.WebhookStatusActive,
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		Attempts:       0,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	d := deliveryRepo.deliveries["d-1"]
	if d.Status != entity.DeliveryPending {
		t.Errorf("expected PENDING (for retry), got %s", d.Status)
	}
	if d.NextRetryAt == nil {
		t.Error("expected NextRetryAt to be set for retry")
	}
	if d.Attempts != 1 {
		t.Errorf("expected 1 attempt, got %d", d.Attempts)
	}
}

func TestDeliver_ExhaustedRetries(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:     "sub-1",
		URL:    ts.URL,
		Status: entity.WebhookStatusActive,
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		Attempts:       4, // already attempted 4 times, max is 5
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	d := deliveryRepo.deliveries["d-1"]
	if d.Status != entity.DeliveryFailed {
		t.Errorf("expected FAILED after exhausting retries, got %s", d.Status)
	}
	if d.NextRetryAt != nil {
		t.Error("expected NextRetryAt to be nil after exhausting retries")
	}
}

func TestDeliver_SubscriptionNotFound(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-nonexistent",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	d := deliveryRepo.deliveries["d-1"]
	if d.Status != entity.DeliveryFailed {
		t.Errorf("expected FAILED for missing subscription, got %s", d.Status)
	}
	if d.Error == "" {
		t.Error("expected error message to be set")
	}
}

func TestDeliver_HMACSignaturePresent(t *testing.T) {
	var receivedSig string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedSig = r.Header.Get("X-Webhook-Signature-256")
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:         "sub-1",
		URL:        ts.URL,
		SecretHash: "my-secret",
		Status:     entity.WebhookStatusActive,
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"data":"test"}`,
		Status:         entity.DeliveryPending,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	if receivedSig == "" {
		t.Error("expected HMAC signature to be sent")
	}
	if len(receivedSig) < 10 || receivedSig[:7] != "sha256=" {
		t.Errorf("expected signature starting with sha256=, got %s", receivedSig)
	}
}

func TestDeliver_CustomHeaders(t *testing.T) {
	var receivedCustomHeader string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedCustomHeader = r.Header.Get("X-Custom-Header")
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:      "sub-1",
		URL:     ts.URL,
		Status:  entity.WebhookStatusActive,
		Headers: map[string]string{"X-Custom-Header": "custom-value"},
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.deliver(context.Background(), deliveryRepo.deliveries["d-1"])

	if receivedCustomHeader != "custom-value" {
		t.Errorf("expected custom header 'custom-value', got %q", receivedCustomHeader)
	}
}

func TestProcessBatch_ProcessesPendingDeliveries(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()

	subRepo.subs["sub-1"] = &entity.WebhookSubscription{
		ID:     "sub-1",
		URL:    ts.URL,
		Status: entity.WebhookStatusActive,
	}

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Payload:        `{"test":true}`,
		Status:         entity.DeliveryPending,
		MaxRetries:     5,
	}
	deliveryRepo.deliveries["d-2"] = &entity.WebhookDelivery{
		ID:             "d-2",
		SubscriptionID: "sub-1",
		EventType:      "callback.requested",
		Payload:        `{"cb":true}`,
		Status:         entity.DeliveryPending,
		MaxRetries:     5,
	}

	w := newTestWorker(subRepo, deliveryRepo)
	w.processBatch(context.Background())

	for id, d := range deliveryRepo.deliveries {
		if d.Status != entity.DeliverySuccess {
			t.Errorf("delivery %s: expected SUCCESS, got %s", id, d.Status)
		}
	}
}

func TestComputeHMAC(t *testing.T) {
	sig := computeHMAC([]byte("test payload"), "secret")
	if sig == "" {
		t.Error("expected non-empty signature")
	}
	if len(sig) != 64 { // SHA-256 hex is 64 chars
		t.Errorf("expected 64 char hex signature, got %d chars", len(sig))
	}

	// Same input should produce same output
	sig2 := computeHMAC([]byte("test payload"), "secret")
	if sig != sig2 {
		t.Error("expected deterministic signature")
	}

	// Different payload should produce different signature
	sig3 := computeHMAC([]byte("different payload"), "secret")
	if sig == sig3 {
		t.Error("expected different signature for different payload")
	}

	// Different secret should produce different signature
	sig4 := computeHMAC([]byte("test payload"), "different-secret")
	if sig == sig4 {
		t.Error("expected different signature for different secret")
	}
}

func TestWorkerStart_StopsOnContextCancel(t *testing.T) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	w := newTestWorker(subRepo, deliveryRepo)
	w.interval = 50 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		w.Start(ctx)
		close(done)
	}()

	// Let it run briefly
	time.Sleep(100 * time.Millisecond)
	cancel()

	select {
	case <-done:
		// Worker stopped correctly
	case <-time.After(2 * time.Second):
		t.Fatal("worker did not stop after context cancellation")
	}
}
