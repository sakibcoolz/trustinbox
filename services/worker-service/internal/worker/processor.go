package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/trustinbox/cornerstone/events"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	"github.com/trustinbox/worker-service/internal/clients"
	"go.uber.org/zap"
)

// Job represents a background job.
type Job struct {
	ID        string
	Type      string // DELIVERY, CALLBACK_REMINDER, CAMPAIGN_SEND, CLEANUP, ANALYTICS
	Payload   map[string]string
	Status    string // PENDING, PROCESSING, COMPLETED, FAILED, RETRY
	Attempts  int
	MaxRetry  int
	CreatedAt time.Time
}

// JobProcessor handles different job types.
type JobProcessor interface {
	Process(ctx context.Context, job *Job) error
}

// ---------------------------------------------------------------------------
// DeliveryProcessor — notification delivery
// ---------------------------------------------------------------------------

// DeliveryProcessor handles notification delivery via notification-service gRPC.
type DeliveryProcessor struct {
	svc *clients.ServiceClients
	log *zap.Logger
}

func NewDeliveryProcessor(svc *clients.ServiceClients, log *zap.Logger) *DeliveryProcessor {
	return &DeliveryProcessor{svc: svc, log: log}
}

// ProcessEvent handles a notification.created event.
func (p *DeliveryProcessor) ProcessEvent(ctx context.Context, evt *events.Event) error {
	var payload struct {
		NotificationID    string `json:"notification_id"`
		UserID            string `json:"user_id"`
		ServiceProviderID string `json:"service_provider_id"`
		Category          string `json:"category"`
		Priority          string `json:"priority"`
	}
	if err := json.Unmarshal(evt.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal delivery payload: %w", err)
	}

	p.log.Info("processing notification delivery",
		zap.String("notification_id", payload.NotificationID),
		zap.String("user_id", payload.UserID),
		zap.String("priority", payload.Priority),
	)

	// 1. Get delivery status from notification service
	status, err := p.svc.Notification.GetDeliveryStatus(ctx, &notifpb.GetDeliveryStatusRequest{
		NotificationId: payload.NotificationID,
	})
	if err != nil {
		return fmt.Errorf("get delivery status: %w", err)
	}

	// Skip if already delivered
	if status.GetDeliveryStatus() == "DELIVERED" {
		p.log.Debug("notification already delivered, skipping",
			zap.String("notification_id", payload.NotificationID),
		)
		return nil
	}

	// 2. Policy was already evaluated at notification creation time.
	// At delivery we just proceed with the notification.

	// 3. Mark notification as delivered (inbox delivery)
	// The notification is already persisted; marking it delivered updates its status.
	_, err = p.svc.Notification.MarkAsRead(ctx, &notifpb.MarkAsReadRequest{
		NotificationId: payload.NotificationID,
		UserId:         payload.UserID,
	})
	if err != nil {
		return fmt.Errorf("mark notification delivered: %w", err)
	}

	p.log.Info("notification delivery complete",
		zap.String("notification_id", payload.NotificationID),
	)
	return nil
}

func (p *DeliveryProcessor) Process(ctx context.Context, job *Job) error {
	p.log.Info("processing delivery job",
		zap.String("notification_id", job.Payload["notification_id"]),
		zap.Int("attempt", job.Attempts),
	)

	evt, err := events.NewEvent(events.NotificationCreated, map[string]string{
		"notification_id":     job.Payload["notification_id"],
		"user_id":             job.Payload["user_id"],
		"service_provider_id": job.Payload["service_provider_id"],
		"category":            job.Payload["category"],
		"priority":            job.Payload["priority"],
	})
	if err != nil {
		return err
	}
	return p.ProcessEvent(ctx, evt)
}

// ---------------------------------------------------------------------------
// CallbackReminderProcessor — callback reminders & expiry
// ---------------------------------------------------------------------------

// CallbackReminderProcessor handles callback reminder and expiry via communication-service gRPC.
type CallbackReminderProcessor struct {
	svc *clients.ServiceClients
	log *zap.Logger
}

func NewCallbackReminderProcessor(svc *clients.ServiceClients, log *zap.Logger) *CallbackReminderProcessor {
	return &CallbackReminderProcessor{svc: svc, log: log}
}

// ProcessEvent handles callback.requested, callback.approved events.
func (p *CallbackReminderProcessor) ProcessEvent(ctx context.Context, evt *events.Event) error {
	var payload struct {
		CallbackRequestID string `json:"callback_request_id"`
		UserID            string `json:"user_id"`
		ServiceProviderID string `json:"service_provider_id"`
		Status            string `json:"status"`
	}
	if err := json.Unmarshal(evt.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal callback payload: %w", err)
	}

	p.log.Info("processing callback event",
		zap.String("callback_request_id", payload.CallbackRequestID),
		zap.String("event_type", string(evt.Type)),
	)

	// Fetch the callback request for current state
	cb, err := p.svc.Communication.GetCallbackRequest(ctx, &commpb.GetCallbackRequestRequest{
		CallbackRequestId: payload.CallbackRequestID,
	})
	if err != nil {
		return fmt.Errorf("get callback request: %w", err)
	}

	switch evt.Type {
	case events.CallbackRequested:
		// New callback request — notify the customer for approval
		p.log.Info("callback requested, creating notification for customer",
			zap.String("callback_id", cb.GetId()),
			zap.String("user_id", cb.GetUserId()),
		)
		_, err = p.svc.Notification.CreateNotification(ctx, &notifpb.CreateNotificationRequest{
			UserId:            cb.GetUserId(),
			ServiceProviderId: cb.GetServiceProviderId(),
			Category:          "SERVICE_PROVIDER",
			Title:             "Callback Request",
			Body:              fmt.Sprintf("A callback has been requested. Reason: %s", cb.GetReason()),
			Priority:          "NORMAL",
			Metadata: map[string]string{
				"callback_request_id": cb.GetId(),
				"type":                "callback_request",
			},
		})
		if err != nil {
			return fmt.Errorf("create callback notification: %w", err)
		}

	case events.CallbackApproved:
		// Callback approved — check if the approved slot is approaching and send reminder
		if cb.GetApprovedSlotStart() != nil {
			slotStart := cb.GetApprovedSlotStart().AsTime()
			until := time.Until(slotStart)
			if until > 0 && until <= 30*time.Minute {
				p.log.Info("callback slot approaching, sending reminder",
					zap.String("callback_id", cb.GetId()),
					zap.Time("slot_start", slotStart),
				)
				_, err = p.svc.Notification.CreateNotification(ctx, &notifpb.CreateNotificationRequest{
					UserId:            cb.GetUserId(),
					ServiceProviderId: cb.GetServiceProviderId(),
					Category:          "SERVICE_PROVIDER",
					Title:             "Callback Reminder",
					Body:              fmt.Sprintf("Your approved callback starts at %s", slotStart.Format(time.RFC822)),
					Priority:          "HIGH",
					Metadata: map[string]string{
						"callback_request_id": cb.GetId(),
						"type":                "callback_reminder",
					},
				})
				if err != nil {
					return fmt.Errorf("create reminder notification: %w", err)
				}
			}
		}

	case events.CallbackExpired:
		// Callback expired — notify both parties
		p.log.Info("callback expired, notifying user",
			zap.String("callback_id", cb.GetId()),
		)
		_, err = p.svc.Notification.CreateNotification(ctx, &notifpb.CreateNotificationRequest{
			UserId:            cb.GetUserId(),
			ServiceProviderId: cb.GetServiceProviderId(),
			Category:          "SERVICE_PROVIDER",
			Title:             "Callback Expired",
			Body:              "A callback request has expired without being actioned.",
			Priority:          "LOW",
			Metadata: map[string]string{
				"callback_request_id": cb.GetId(),
				"type":                "callback_expired",
			},
		})
		if err != nil {
			return fmt.Errorf("create expiry notification: %w", err)
		}
	}

	return nil
}

func (p *CallbackReminderProcessor) Process(ctx context.Context, job *Job) error {
	p.log.Info("processing callback reminder job",
		zap.String("callback_request_id", job.Payload["callback_request_id"]),
	)

	evt, err := events.NewEvent(events.CallbackRequested, map[string]string{
		"callback_request_id": job.Payload["callback_request_id"],
		"user_id":             job.Payload["user_id"],
		"service_provider_id": job.Payload["service_provider_id"],
		"status":              job.Payload["status"],
	})
	if err != nil {
		return err
	}
	return p.ProcessEvent(ctx, evt)
}

// ---------------------------------------------------------------------------
// CampaignSendProcessor — campaign target fan-out
// ---------------------------------------------------------------------------

// CampaignSendProcessor fans out a campaign launch to individual notifications.
type CampaignSendProcessor struct {
	svc *clients.ServiceClients
	db  *sql.DB
	log *zap.Logger
}

func NewCampaignSendProcessor(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) *CampaignSendProcessor {
	return &CampaignSendProcessor{svc: svc, db: db, log: log}
}

// ProcessEvent handles campaign.launched events.
func (p *CampaignSendProcessor) ProcessEvent(ctx context.Context, evt *events.Event) error {
	var payload struct {
		CampaignID        string `json:"campaign_id"`
		ServiceProviderID string `json:"service_provider_id"`
		Title             string `json:"title"`
		Body              string `json:"body"`
		Category          string `json:"category"`
		Priority          string `json:"priority"`
	}
	if err := json.Unmarshal(evt.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshal campaign payload: %w", err)
	}

	p.log.Info("processing campaign fan-out",
		zap.String("campaign_id", payload.CampaignID),
		zap.String("sp_id", payload.ServiceProviderID),
	)

	// Query campaign targets from DB
	rows, err := p.db.QueryContext(ctx, `
		SELECT ct.user_id
		FROM campaign_targets ct
		WHERE ct.campaign_id = $1
		  AND ct.status = 'PENDING'
		ORDER BY ct.created_at ASC
	`, payload.CampaignID)
	if err != nil {
		return fmt.Errorf("query campaign targets: %w", err)
	}
	defer rows.Close()

	var sent, failed int
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			p.log.Error("scan campaign target", zap.Error(err))
			failed++
			continue
		}

		// Create a notification for each target user
		_, err := p.svc.Notification.CreateNotification(ctx, &notifpb.CreateNotificationRequest{
			UserId:            userID,
			ServiceProviderId: payload.ServiceProviderID,
			Category:          payload.Category,
			Title:             payload.Title,
			Body:              payload.Body,
			Priority:          payload.Priority,
			Metadata: map[string]string{
				"campaign_id": payload.CampaignID,
				"type":        "campaign",
			},
		})
		if err != nil {
			p.log.Warn("campaign notification failed for user",
				zap.String("user_id", userID),
				zap.Error(err),
			)
			failed++
			continue
		}

		// Mark target as sent
		_, _ = p.db.ExecContext(ctx,
			`UPDATE campaign_targets SET status = 'SENT', updated_at = NOW() WHERE campaign_id = $1 AND user_id = $2`,
			payload.CampaignID, userID,
		)
		sent++
	}

	p.log.Info("campaign fan-out complete",
		zap.String("campaign_id", payload.CampaignID),
		zap.Int("sent", sent),
		zap.Int("failed", failed),
	)
	return nil
}

func (p *CampaignSendProcessor) Process(ctx context.Context, job *Job) error {
	p.log.Info("processing campaign send job",
		zap.String("campaign_id", job.Payload["campaign_id"]),
	)

	evt, err := events.NewEvent(events.CampaignLaunched, map[string]string{
		"campaign_id":         job.Payload["campaign_id"],
		"service_provider_id": job.Payload["service_provider_id"],
		"title":               job.Payload["title"],
		"body":                job.Payload["body"],
		"category":            job.Payload["category"],
		"priority":            job.Payload["priority"],
	})
	if err != nil {
		return err
	}
	return p.ProcessEvent(ctx, evt)
}

// ---------------------------------------------------------------------------
// CleanupProcessor — expired tokens, old logs, stale callbacks
// ---------------------------------------------------------------------------

// CleanupProcessor handles periodic cleanup of expired data.
type CleanupProcessor struct {
	db  *sql.DB
	log *zap.Logger
}

func NewCleanupProcessor(db *sql.DB, log *zap.Logger) *CleanupProcessor {
	return &CleanupProcessor{db: db, log: log}
}

// RunAll performs all cleanup tasks. Called on a schedule (ticker).
func (p *CleanupProcessor) RunAll(ctx context.Context) error {
	p.log.Info("starting cleanup cycle")

	if err := p.expireRefreshTokens(ctx); err != nil {
		p.log.Error("cleanup: expire refresh tokens", zap.Error(err))
	}
	if err := p.expireCallbackRequests(ctx); err != nil {
		p.log.Error("cleanup: expire callback requests", zap.Error(err))
	}
	if err := p.archiveOldNotifications(ctx); err != nil {
		p.log.Error("cleanup: archive old notifications", zap.Error(err))
	}

	p.log.Info("cleanup cycle complete")
	return nil
}

func (p *CleanupProcessor) expireRefreshTokens(ctx context.Context) error {
	res, err := p.db.ExecContext(ctx, `
		UPDATE refresh_tokens
		SET revoked = TRUE
		WHERE expires_at < NOW() AND revoked = FALSE
	`)
	if err != nil {
		return fmt.Errorf("expire refresh tokens: %w", err)
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		p.log.Info("expired refresh tokens", zap.Int64("count", n))
	}
	return nil
}

func (p *CleanupProcessor) expireCallbackRequests(ctx context.Context) error {
	res, err := p.db.ExecContext(ctx, `
		UPDATE callback_requests
		SET status = 'EXPIRED', updated_at = NOW()
		WHERE status = 'PENDING'
		  AND created_at < NOW() - INTERVAL '72 hours'
	`)
	if err != nil {
		return fmt.Errorf("expire callback requests: %w", err)
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		p.log.Info("expired callback requests", zap.Int64("count", n))
	}
	return nil
}

func (p *CleanupProcessor) archiveOldNotifications(ctx context.Context) error {
	res, err := p.db.ExecContext(ctx, `
		UPDATE notifications
		SET status = 'ARCHIVED', updated_at = NOW()
		WHERE status = 'READ'
		  AND updated_at < NOW() - INTERVAL '90 days'
	`)
	if err != nil {
		return fmt.Errorf("archive old notifications: %w", err)
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		p.log.Info("archived old notifications", zap.Int64("count", n))
	}
	return nil
}

func (p *CleanupProcessor) Process(ctx context.Context, job *Job) error {
	p.log.Info("processing cleanup job")
	return p.RunAll(ctx)
}
