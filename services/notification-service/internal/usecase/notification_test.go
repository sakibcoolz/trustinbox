package usecase_test

import (
	"context"
	"testing"
	"time"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/usecase"
	"go.uber.org/zap"
)

// ─── Mocks ─────────────────────────────────────────────────

type mockNotifRepo struct {
	notifs map[string]*entity.Notification
}

func newMockNotifRepo() *mockNotifRepo {
	return &mockNotifRepo{notifs: make(map[string]*entity.Notification)}
}

func (m *mockNotifRepo) Create(_ context.Context, n *entity.Notification) error {
	n.CreatedAt = time.Now()
	m.notifs[n.ID] = n
	return nil
}

func (m *mockNotifRepo) GetByID(_ context.Context, id string) (*entity.Notification, error) {
	n, ok := m.notifs[id]
	if !ok {
		return nil, bizerr.NotFound("notification", id)
	}
	return n, nil
}

func (m *mockNotifRepo) ListByUser(_ context.Context, userID, category, status string, limit, offset int) ([]entity.Notification, int, error) {
	var out []entity.Notification
	for _, n := range m.notifs {
		if n.UserID != userID {
			continue
		}
		if category != "" && n.Category != category {
			continue
		}
		if status != "" && n.Status != status {
			continue
		}
		out = append(out, *n)
	}
	return out, len(out), nil
}

func (m *mockNotifRepo) UpdateStatus(_ context.Context, id, status string) error {
	n, ok := m.notifs[id]
	if !ok {
		return bizerr.NotFound("notification", id)
	}
	n.Status = status
	return nil
}

func (m *mockNotifRepo) MarkAsRead(_ context.Context, id, userID string) error {
	n, ok := m.notifs[id]
	if !ok {
		return bizerr.NotFound("notification", id)
	}
	if n.UserID != userID {
		return bizerr.Forbidden("not authorized")
	}
	n.Status = "READ"
	return nil
}

type mockDeliveryRepo struct{}

func (m *mockDeliveryRepo) Create(_ context.Context, _ *entity.NotificationDelivery) error {
	return nil
}
func (m *mockDeliveryRepo) GetByNotificationID(_ context.Context, _ string) (*entity.NotificationDelivery, error) {
	return nil, nil
}
func (m *mockDeliveryRepo) UpdateStatus(_ context.Context, _, _ string) error { return nil }

type mockPolicyChecker struct {
	allowed bool
	reason  string
}

func (m *mockPolicyChecker) EvaluateCommunication(_ context.Context, _, _, _, _, _ string) (bool, string, error) {
	return m.allowed, m.reason, nil
}

type mockQueuePublisher struct {
	published []string
}

func (m *mockQueuePublisher) PublishDeliveryJob(_ context.Context, notificationID string) error {
	m.published = append(m.published, notificationID)
	return nil
}

type mockPublisher struct {
	events []*events.Event
}

func (m *mockPublisher) Publish(_ context.Context, event *events.Event) error {
	m.events = append(m.events, event)
	return nil
}

func (m *mockPublisher) PublishBatch(_ context.Context, evts []*events.Event) error {
	m.events = append(m.events, evts...)
	return nil
}

func (m *mockPublisher) Close() error { return nil }

// ─── E2E: Notification Delivery Flow ───────────────────────

func TestE2E_NotificationDelivery_Allowed(t *testing.T) {
	notifRepo := newMockNotifRepo()
	policy := &mockPolicyChecker{allowed: true}
	queue := &mockQueuePublisher{}
	pub := &mockPublisher{}

	uc := usecase.NewNotificationUseCase(notifRepo, &mockDeliveryRepo{}, policy, queue, pub, zap.NewNop())
	ctx := context.Background()

	result, err := uc.CreateNotification(ctx, usecase.CreateNotificationInput{
		UserID:            "user-001",
		ServiceProviderID: "sp-001",
		Category:          "SERVICE_PROVIDER",
		Title:             "Appointment Reminder",
		Body:              "Your appointment is tomorrow at 10 AM.",
		Priority:          "HIGH",
	})
	if err != nil {
		t.Fatalf("CreateNotification: %v", err)
	}
	if result.Status != "QUEUED" {
		t.Errorf("Status = %q, want QUEUED", result.Status)
	}
	if result.NotificationID == "" {
		t.Error("NotificationID should not be empty")
	}

	// Verify delivery job was queued
	if len(queue.published) != 1 {
		t.Fatalf("queue.published len = %d, want 1", len(queue.published))
	}
	if queue.published[0] != result.NotificationID {
		t.Errorf("queued ID = %q, want %q", queue.published[0], result.NotificationID)
	}

	// Verify event was published
	if len(pub.events) != 1 {
		t.Fatalf("events len = %d, want 1", len(pub.events))
	}
	if pub.events[0].Type != events.NotificationCreated {
		t.Errorf("event type = %q, want %q", pub.events[0].Type, events.NotificationCreated)
	}

	// Verify notification persisted
	notif, err := notifRepo.GetByID(ctx, result.NotificationID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if notif.Title != "Appointment Reminder" {
		t.Errorf("Title = %q, want %q", notif.Title, "Appointment Reminder")
	}

	// Mark as read completes the delivery lifecycle
	if err := uc.MarkAsRead(ctx, result.NotificationID, "user-001"); err != nil {
		t.Fatalf("MarkAsRead: %v", err)
	}
	notif, _ = notifRepo.GetByID(ctx, result.NotificationID)
	if notif.Status != "READ" {
		t.Errorf("Status after MarkAsRead = %q, want READ", notif.Status)
	}
}

func TestE2E_NotificationDelivery_PolicyRejected(t *testing.T) {
	notifRepo := newMockNotifRepo()
	policy := &mockPolicyChecker{allowed: false, reason: "DND active"}
	queue := &mockQueuePublisher{}
	pub := &mockPublisher{}

	uc := usecase.NewNotificationUseCase(notifRepo, &mockDeliveryRepo{}, policy, queue, pub, zap.NewNop())
	ctx := context.Background()

	result, err := uc.CreateNotification(ctx, usecase.CreateNotificationInput{
		UserID:            "user-001",
		ServiceProviderID: "sp-001",
		Category:          "ADVERTISEMENT",
		Title:             "Special Offer",
		Body:              "50% off!",
		Priority:          "LOW",
	})
	if err != nil {
		t.Fatalf("CreateNotification: %v", err)
	}
	if result.Status != "REJECTED" {
		t.Errorf("Status = %q, want REJECTED", result.Status)
	}
	if result.RejectionReason != "DND active" {
		t.Errorf("RejectionReason = %q, want %q", result.RejectionReason, "DND active")
	}

	// Nothing was queued or persisted
	if len(queue.published) != 0 {
		t.Errorf("queue.published should be empty, got %d", len(queue.published))
	}
	if len(notifRepo.notifs) != 0 {
		t.Errorf("notifRepo should be empty, got %d", len(notifRepo.notifs))
	}
}

func TestListNotifications(t *testing.T) {
	notifRepo := newMockNotifRepo()
	policy := &mockPolicyChecker{allowed: true}
	queue := &mockQueuePublisher{}
	pub := &mockPublisher{}

	uc := usecase.NewNotificationUseCase(notifRepo, &mockDeliveryRepo{}, policy, queue, pub, zap.NewNop())
	ctx := context.Background()

	// Create two notifications for the same user
	for _, title := range []string{"First", "Second"} {
		_, err := uc.CreateNotification(ctx, usecase.CreateNotificationInput{
			UserID:            "user-list",
			ServiceProviderID: "sp-001",
			Category:          "PERSONAL",
			Title:             title,
			Body:              "test",
			Priority:          "NORMAL",
		})
		if err != nil {
			t.Fatalf("CreateNotification %s: %v", title, err)
		}
	}

	// List all notifications for user
	notifs, total, err := uc.ListNotifications(ctx, "user-list", "", "", 10, 0)
	if err != nil {
		t.Fatalf("ListNotifications: %v", err)
	}
	if total != 2 {
		t.Errorf("total = %d, want 2", total)
	}
	if len(notifs) != 2 {
		t.Errorf("len = %d, want 2", len(notifs))
	}
}
