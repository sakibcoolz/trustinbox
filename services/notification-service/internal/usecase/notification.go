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
	publisher     events.Publisher
	log           *zap.Logger
}

func NewNotificationUseCase(
	notifRepo repository.NotificationRepository,
	deliveryRepo repository.DeliveryRepository,
	policyChecker PolicyChecker,
	queue QueuePublisher,
	publisher events.Publisher,
	log *zap.Logger,
) *NotificationUseCase {
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
	UserID            string
	ServiceProviderID string
	Category          string
	Title             string
	Body              string
	Priority          string
	Metadata          map[string]string
}

type CreateNotificationResult struct {
	NotificationID  string
	Status          string
	RejectionReason string
}

func (uc *NotificationUseCase) CreateNotification(ctx context.Context, input CreateNotificationInput) (*CreateNotificationResult, error) {
	ctx, span := tracing.StartSpan(ctx, "notification-service", "CreateNotification",
		attribute.String("user_id", input.UserID),
		attribute.String("sp_id", input.ServiceProviderID),
		attribute.String("category", input.Category),
	)
	defer span.End()

	// Evaluate policy
	if uc.policyChecker != nil {
		allowed, reason, err := uc.policyChecker.EvaluateCommunication(
			ctx, input.UserID, input.ServiceProviderID, input.Category, "INBOX", "NOTIFICATION",
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
	}

	// Create notification
	notif := &entity.Notification{
		ID:                uuid.New().String(),
		UserID:            input.UserID,
		ServiceProviderID: input.ServiceProviderID,
		Category:          input.Category,
		Title:             input.Title,
		Body:              input.Body,
		Priority:          input.Priority,
		Status:            "QUEUED",
		Metadata:          input.Metadata,
	}

	if err := uc.notifRepo.Create(ctx, notif); err != nil {
		return nil, bzerr.Internal("failed to create notification", err)
	}

	// Queue delivery
	if uc.queue != nil {
		if err := uc.queue.PublishDeliveryJob(ctx, notif.ID); err != nil {
			uc.log.Error("failed to queue delivery", zap.String("notification_id", notif.ID), zap.Error(err))
		}
	}

	// Publish notification.created event
	if uc.publisher != nil {
		uc.publishEvent(ctx, events.NotificationCreated, notif.ID, notif.UserID, notif.ServiceProviderID, map[string]interface{}{
			"notification_id":     notif.ID,
			"user_id":             notif.UserID,
			"service_provider_id": notif.ServiceProviderID,
			"category":            notif.Category,
			"title":               notif.Title,
			"priority":            notif.Priority,
		})
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

	// Publish notification.read event
	uc.publishEvent(ctx, events.NotificationRead, notifID, userID, "", map[string]interface{}{
		"notification_id": notifID,
		"user_id":         userID,
	})

	return nil
}

// publishEvent fires a domain event asynchronously.
func (uc *NotificationUseCase) publishEvent(ctx context.Context, eventType events.EventType, entityID, userID, spID string, payload interface{}) {
	if uc.publisher == nil {
		return
	}
	evt, err := events.NewEvent(eventType, payload)
	if err != nil {
		uc.log.Error("failed to create event", zap.String("event_type", string(eventType)), zap.Error(err))
		return
	}
	evt.WithEntity(entityID).WithUser(userID)
	if spID != "" {
		evt.WithServiceProvider(spID)
	}
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish event", zap.String("event_type", string(eventType)), zap.Error(err))
	}
}
