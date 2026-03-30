package usecase

import (
	"context"

	"github.com/google/uuid"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// PolicyChecker abstracts the policy service call.
type PolicyChecker interface {
	EvaluateCommunication(ctx context.Context, userID, orgID, category, channel, commType string) (bool, string, error)
}

// QueuePublisher abstracts the message queue.
type QueuePublisher interface {
	PublishDeliveryJob(ctx context.Context, notificationID string) error
}

type NotificationUseCase struct {
	notifRepo     repository.NotificationRepository
	deliveryRepo  repository.DeliveryRepository
	policyChecker PolicyChecker
	queue         QueuePublisher
	publisher     events.EventPublisher
	log           *zap.Logger
}

func NewNotificationUseCase(
	notifRepo repository.NotificationRepository,
	deliveryRepo repository.DeliveryRepository,
	policyChecker PolicyChecker,
	queue QueuePublisher,
	publisher events.EventPublisher,
	log *zap.Logger,
) *NotificationUseCase {
	if publisher == nil {
		publisher = events.NoopPublisher{}
	}
	return &NotificationUseCase{
		notifRepo:     notifRepo,
		deliveryRepo:  deliveryRepo,
		policyChecker: policyChecker,
		queue:         queue,
		publisher:     publisher,
		log:           log,
	}
}

type CreateNotificationInput struct {
	UserID         string
	OrganizationID string
	Category       string
	Title          string
	Body           string
	Priority       string
	Metadata       map[string]string
}

type CreateNotificationResult struct {
	NotificationID  string
	Status          string
	RejectionReason string
}

func (uc *NotificationUseCase) CreateNotification(ctx context.Context, input CreateNotificationInput) (*CreateNotificationResult, error) {
	ctx, span := tracing.StartSpan(ctx, "notification-service", "CreateNotification",
		attribute.String("user_id", input.UserID),
		attribute.String("org_id", input.OrganizationID),
		attribute.String("category", input.Category),
	)
	defer span.End()

	// Evaluate policy
	allowed, reason, err := uc.policyChecker.EvaluateCommunication(
		ctx, input.UserID, input.OrganizationID, input.Category, "INBOX", "NOTIFICATION",
	)
	if err != nil {
		return nil, bzerr.Internal("policy evaluation failed", err)
	}

	if !allowed {
		return &CreateNotificationResult{
			Status:          "REJECTED",
			RejectionReason: reason,
		}, nil
	}

	// Create notification
	notif := &entity.Notification{
		ID:             uuid.New().String(),
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Category:       input.Category,
		Title:          input.Title,
		Body:           input.Body,
		Priority:       input.Priority,
		Status:         "QUEUED",
		Metadata:       input.Metadata,
	}

	if err := uc.notifRepo.Create(ctx, notif); err != nil {
		return nil, bzerr.Internal("failed to create notification", err)
	}

	// Queue delivery
	if err := uc.queue.PublishDeliveryJob(ctx, notif.ID); err != nil {
		uc.log.Error("failed to queue delivery", zap.String("notification_id", notif.ID), zap.Error(err))
	}

	// Publish event
	evt := events.NewEvent(events.NotificationCreated, "notification-service", map[string]string{
		"notification_id": notif.ID,
		"category":        input.Category,
		"priority":        input.Priority,
		"status":          "QUEUED",
	}).WithUser(input.UserID).WithOrg(input.OrganizationID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish notification event", zap.Error(err))
	}

	return &CreateNotificationResult{
		NotificationID: notif.ID,
		Status:         "QUEUED",
	}, nil
}

func (uc *NotificationUseCase) ListNotifications(ctx context.Context, userID, category, status string, limit, offset int) ([]entity.Notification, int, error) {
	return uc.notifRepo.ListByUser(ctx, userID, category, status, limit, offset)
}

func (uc *NotificationUseCase) MarkAsRead(ctx context.Context, notifID, userID string) error {
	if err := uc.notifRepo.MarkAsRead(ctx, notifID, userID); err != nil {
		return err
	}
	evt := events.NewEvent(events.NotificationRead, "notification-service", map[string]string{
		"notification_id": notifID,
	}).WithUser(userID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish notification read event", zap.Error(err))
	}
	return nil
}
