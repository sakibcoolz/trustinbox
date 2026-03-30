package grpc

import (
	"context"
	"fmt"
	"testing"

	pb "github.com/trustinbox/proto/gen/webhook/v1"
	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/usecase"
)

// --- Mock repositories for handler tests ---

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
	return nil, fmt.Errorf("[NOT_FOUND] webhook_subscription not found: %s", id)
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
	var result []*entity.WebhookSubscription
	for _, s := range m.subs {
		if s.ServiceProviderID == spID {
			result = append(result, s)
		}
	}
	return result, len(result), nil
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
	return nil, fmt.Errorf("[NOT_FOUND] webhook_delivery not found: %s", id)
}

func (m *mockDeliveryRepo) Update(_ context.Context, d *entity.WebhookDelivery) error {
	m.deliveries[d.ID] = d
	return nil
}

func (m *mockDeliveryRepo) ListBySubscription(_ context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error) {
	var result []*entity.WebhookDelivery
	for _, d := range m.deliveries {
		if d.SubscriptionID == subID {
			result = append(result, d)
		}
	}
	return result, len(result), nil
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

func newTestHandler() (*WebhookHandler, *mockSubRepo, *mockDeliveryRepo) {
	subRepo := newMockSubRepo()
	deliveryRepo := newMockDeliveryRepo()
	uc := usecase.NewWebhookUseCase(subRepo, deliveryRepo)
	h := NewWebhookHandler(uc)
	return h, subRepo, deliveryRepo
}

func TestHandler_CreateSubscription(t *testing.T) {
	h, _, _ := newTestHandler()

	resp, err := h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://example.com/hook",
		Description:       "Test webhook",
		Events:            []string{"notification.sent"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Id == "" {
		t.Error("expected subscription ID")
	}
	if resp.ServiceProviderId != "sp-1" {
		t.Errorf("expected sp-1, got %s", resp.ServiceProviderId)
	}
	if resp.Url != "https://example.com/hook" {
		t.Errorf("expected URL to match")
	}
	if resp.Status != "ACTIVE" {
		t.Errorf("expected ACTIVE, got %s", resp.Status)
	}
}

func TestHandler_CreateSubscription_EmptyURL(t *testing.T) {
	h, _, _ := newTestHandler()

	_, err := h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "",
		Events:            []string{"notification.sent"},
	})
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
}

func TestHandler_GetSubscription(t *testing.T) {
	h, _, _ := newTestHandler()

	created, _ := h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://example.com/hook",
		Description:       "test",
		Events:            []string{"notification.sent"},
	})

	resp, err := h.GetSubscription(context.Background(), &pb.GetSubscriptionRequest{
		SubscriptionId:    created.Id,
		ServiceProviderId: "sp-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Id != created.Id {
		t.Errorf("expected %s, got %s", created.Id, resp.Id)
	}
}

func TestHandler_GetSubscription_NotFound(t *testing.T) {
	h, _, _ := newTestHandler()

	_, err := h.GetSubscription(context.Background(), &pb.GetSubscriptionRequest{
		SubscriptionId:    "nonexistent",
		ServiceProviderId: "sp-1",
	})
	if err == nil {
		t.Fatal("expected error for nonexistent subscription")
	}
}

func TestHandler_UpdateSubscription(t *testing.T) {
	h, _, _ := newTestHandler()

	created, _ := h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://example.com/hook",
		Description:       "original",
		Events:            []string{"notification.sent"},
	})

	resp, err := h.UpdateSubscription(context.Background(), &pb.UpdateSubscriptionRequest{
		SubscriptionId:    created.Id,
		ServiceProviderId: "sp-1",
		Url:               "https://new.example.com/hook",
		Description:       "updated",
		Status:            "PAUSED",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Url != "https://new.example.com/hook" {
		t.Errorf("expected updated URL, got %s", resp.Url)
	}
	if resp.Description != "updated" {
		t.Errorf("expected updated description")
	}
	if resp.Status != "PAUSED" {
		t.Errorf("expected PAUSED, got %s", resp.Status)
	}
}

func TestHandler_DeleteSubscription(t *testing.T) {
	h, subRepo, _ := newTestHandler()

	created, _ := h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://example.com/hook",
		Description:       "test",
		Events:            []string{"notification.sent"},
	})

	resp, err := h.DeleteSubscription(context.Background(), &pb.DeleteSubscriptionRequest{
		SubscriptionId:    created.Id,
		ServiceProviderId: "sp-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Error("expected success=true")
	}
	if len(subRepo.subs) != 0 {
		t.Errorf("expected subscription to be deleted, got %d remaining", len(subRepo.subs))
	}
}

func TestHandler_ListSubscriptions(t *testing.T) {
	h, _, _ := newTestHandler()

	h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://a.com/hook",
		Description:       "first",
		Events:            []string{"notification.sent"},
	})
	h.CreateSubscription(context.Background(), &pb.CreateSubscriptionRequest{
		ServiceProviderId: "sp-1",
		Url:               "https://b.com/hook",
		Description:       "second",
		Events:            []string{"callback.requested"},
	})

	resp, err := h.ListSubscriptions(context.Background(), &pb.ListSubscriptionsRequest{
		ServiceProviderId: "sp-1",
		Limit:             10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Total != 2 {
		t.Errorf("expected 2 total, got %d", resp.Total)
	}
	if len(resp.Subscriptions) != 2 {
		t.Errorf("expected 2 subscriptions, got %d", len(resp.Subscriptions))
	}
}

func TestHandler_ListSubscriptions_DefaultLimit(t *testing.T) {
	h, _, _ := newTestHandler()

	// Request with limit=0 should default to 20
	resp, err := h.ListSubscriptions(context.Background(), &pb.ListSubscriptionsRequest{
		ServiceProviderId: "sp-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Total != 0 {
		t.Errorf("expected 0 total, got %d", resp.Total)
	}
}

func TestHandler_ListDeliveries(t *testing.T) {
	h, _, deliveryRepo := newTestHandler()

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:             "d-1",
		SubscriptionID: "sub-1",
		EventType:      "notification.sent",
		Status:         entity.DeliveryPending,
	}

	resp, err := h.ListDeliveries(context.Background(), &pb.ListDeliveriesRequest{
		SubscriptionId: "sub-1",
		Limit:          10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Total != 1 {
		t.Errorf("expected 1 total, got %d", resp.Total)
	}
	if len(resp.Deliveries) != 1 {
		t.Errorf("expected 1 delivery, got %d", len(resp.Deliveries))
	}
	if resp.Deliveries[0].Id != "d-1" {
		t.Errorf("expected d-1, got %s", resp.Deliveries[0].Id)
	}
}

func TestHandler_RetryDelivery(t *testing.T) {
	h, _, deliveryRepo := newTestHandler()

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:     "d-1",
		Status: entity.DeliveryFailed,
	}

	resp, err := h.RetryDelivery(context.Background(), &pb.RetryDeliveryRequest{
		DeliveryId: "d-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Error("expected success=true")
	}
}

func TestHandler_RetryDelivery_AlreadySucceeded(t *testing.T) {
	h, _, deliveryRepo := newTestHandler()

	deliveryRepo.deliveries["d-1"] = &entity.WebhookDelivery{
		ID:     "d-1",
		Status: entity.DeliverySuccess,
	}

	_, err := h.RetryDelivery(context.Background(), &pb.RetryDeliveryRequest{
		DeliveryId: "d-1",
	})
	if err == nil {
		t.Fatal("expected error for already succeeded delivery")
	}
}
