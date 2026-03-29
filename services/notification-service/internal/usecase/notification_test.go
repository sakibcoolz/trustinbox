package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"go.uber.org/zap"
)

// Mock implementations

type mockNotifRepo struct {
	created       []*entity.Notification
	notifications []entity.Notification
	total         int
	err           error
}

func (m *mockNotifRepo) Create(_ context.Context, notif *entity.Notification) error {
	if m.err != nil {
		return m.err
	}
	m.created = append(m.created, notif)
	return nil
}

func (m *mockNotifRepo) GetByID(_ context.Context, _ string) (*entity.Notification, error) {
	if len(m.notifications) == 0 {
		return nil, fmt.Errorf("not found")
	}
	return &m.notifications[0], m.err
}

func (m *mockNotifRepo) ListByUser(_ context.Context, _, _, _ string, _, _ int) ([]entity.Notification, int, error) {
	return m.notifications, m.total, m.err
}

func (m *mockNotifRepo) UpdateStatus(_ context.Context, _, _ string) error {
	return m.err
}

func (m *mockNotifRepo) MarkAsRead(_ context.Context, _, _ string) error {
	return m.err
}

type mockDeliveryRepo struct {
	delivery *entity.NotificationDelivery
	err      error
}

func (m *mockDeliveryRepo) Create(_ context.Context, _ *entity.NotificationDelivery) error {
	return m.err
}

func (m *mockDeliveryRepo) GetByNotificationID(_ context.Context, _ string) (*entity.NotificationDelivery, error) {
	return m.delivery, m.err
}

func (m *mockDeliveryRepo) UpdateStatus(_ context.Context, _, _ string) error {
	return m.err
}

type mockPolicyChecker struct {
	allowed bool
	reason  string
	err     error
}

func (m *mockPolicyChecker) EvaluateCommunication(_ context.Context, _, _, _, _, _ string) (bool, string, error) {
	return m.allowed, m.reason, m.err
}

type mockQueuePublisher struct {
	err error
}

func (m *mockQueuePublisher) PublishDeliveryJob(_ context.Context, _ string) error {
	return m.err
}

// Helper

func newTestNotificationUseCase(
	notifRepo *mockNotifRepo,
	deliveryRepo *mockDeliveryRepo,
	policy *mockPolicyChecker,
	queue *mockQueuePublisher,
) *NotificationUseCase {
	return NewNotificationUseCase(notifRepo, deliveryRepo, policy, queue, zap.NewNop())
}

// Tests

func TestCreateNotification_PolicyDenied(t *testing.T) {
	notifRepo := &mockNotifRepo{}
	uc := newTestNotificationUseCase(
		notifRepo,
		&mockDeliveryRepo{},
		&mockPolicyChecker{allowed: false, reason: "category disabled"},
		&mockQueuePublisher{},
	)

	result, err := uc.CreateNotification(context.Background(), CreateNotificationInput{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       "ADVERTISEMENT",
		Title:          "Promo",
		Body:           "Special offer",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "REJECTED" {
		t.Errorf("expected status REJECTED, got %s", result.Status)
	}
	if len(notifRepo.created) != 0 {
		t.Error("expected no notifications to be created when policy denies")
	}
}

func TestCreateNotification_PolicyAllowed(t *testing.T) {
	notifRepo := &mockNotifRepo{}
	uc := newTestNotificationUseCase(
		notifRepo,
		&mockDeliveryRepo{},
		&mockPolicyChecker{allowed: true},
		&mockQueuePublisher{},
	)

	result, err := uc.CreateNotification(context.Background(), CreateNotificationInput{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       "PERSONAL",
		Title:          "Hello",
		Body:           "You have a message",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "QUEUED" {
		t.Errorf("expected status QUEUED, got %s", result.Status)
	}
	if len(notifRepo.created) != 1 {
		t.Errorf("expected 1 notification to be created, got %d", len(notifRepo.created))
	}
}

func TestListNotifications_Success(t *testing.T) {
	notifs := []entity.Notification{
		{ID: "n1", UserID: "user-1", Status: "QUEUED"},
		{ID: "n2", UserID: "user-1", Status: "READ"},
		{ID: "n3", UserID: "user-1", Status: "QUEUED"},
	}
	uc := newTestNotificationUseCase(
		&mockNotifRepo{notifications: notifs, total: 3},
		&mockDeliveryRepo{},
		&mockPolicyChecker{},
		&mockQueuePublisher{},
	)

	results, total, err := uc.ListNotifications(context.Background(), "user-1", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Errorf("expected 3 notifications, got %d", len(results))
	}
	if total != 3 {
		t.Errorf("expected total 3, got %d", total)
	}
}

func TestMarkAsRead_Success(t *testing.T) {
	uc := newTestNotificationUseCase(
		&mockNotifRepo{},
		&mockDeliveryRepo{},
		&mockPolicyChecker{},
		&mockQueuePublisher{},
	)

	if err := uc.MarkAsRead(context.Background(), "notif-1", "user-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
