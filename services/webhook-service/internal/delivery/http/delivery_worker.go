package http

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/domain/repository"
	"go.uber.org/zap"
)

// DeliveryWorker processes pending webhook deliveries by POSTing to subscriber URLs.
type DeliveryWorker struct {
	subRepo      repository.WebhookSubscriptionRepository
	deliveryRepo repository.WebhookDeliveryRepository
	client       *http.Client
	logger       *zap.Logger
	batchSize    int
	interval     time.Duration
}

// NewDeliveryWorker creates a new HTTP delivery worker.
func NewDeliveryWorker(
	subRepo repository.WebhookSubscriptionRepository,
	deliveryRepo repository.WebhookDeliveryRepository,
	logger *zap.Logger,
) *DeliveryWorker {
	return &DeliveryWorker{
		subRepo:      subRepo,
		deliveryRepo: deliveryRepo,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger:    logger,
		batchSize: 50,
		interval:  5 * time.Second,
	}
}

// Start begins the delivery worker loop.
func (w *DeliveryWorker) Start(ctx context.Context) {
	w.logger.Info("delivery worker started")
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("delivery worker stopping")
			return
		case <-ticker.C:
			w.processBatch(ctx)
		}
	}
}

func (w *DeliveryWorker) processBatch(ctx context.Context) {
	deliveries, err := w.deliveryRepo.GetPendingRetries(ctx, w.batchSize)
	if err != nil {
		w.logger.Error("failed to fetch pending deliveries", zap.Error(err))
		return
	}
	for _, d := range deliveries {
		w.deliver(ctx, d)
	}
}

func (w *DeliveryWorker) deliver(ctx context.Context, d *entity.WebhookDelivery) {
	sub, err := w.subRepo.GetByID(ctx, d.SubscriptionID)
	if err != nil {
		w.logger.Error("failed to load subscription for delivery",
			zap.String("delivery_id", d.ID),
			zap.String("subscription_id", d.SubscriptionID),
			zap.Error(err),
		)
		w.markFailed(ctx, d, "subscription not found")
		return
	}

	body := []byte(d.Payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.URL, bytes.NewReader(body))
	if err != nil {
		w.markFailed(ctx, d, fmt.Sprintf("build request: %v", err))
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Event", d.EventType)
	req.Header.Set("X-Webhook-Delivery", d.ID)

	// HMAC signature using the signing secret stored in SecretHash.
	// Note: SecretHash stores the plaintext signing secret (hex-encoded) for
	// HMAC computation. In production this would be encrypted at rest.
	if sub.SecretHash != "" {
		sig := computeHMAC(body, sub.SecretHash)
		req.Header.Set("X-Webhook-Signature-256", "sha256="+sig)
	}

	// Add custom headers from subscription
	for k, v := range sub.Headers {
		req.Header.Set(k, v)
	}

	d.Attempts++

	resp, err := w.client.Do(req)
	if err != nil {
		w.handleFailure(ctx, d, 0, fmt.Sprintf("http error: %v", err))
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	d.ResponseStatus = resp.StatusCode
	d.ResponseBody = string(respBody)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		now := time.Now().UTC()
		d.Status = entity.DeliverySuccess
		d.DeliveredAt = &now
		d.NextRetryAt = nil
		if err := w.deliveryRepo.Update(ctx, d); err != nil {
			w.logger.Error("failed to mark delivery as success",
				zap.String("delivery_id", d.ID), zap.Error(err))
		}
		w.logger.Debug("webhook delivered",
			zap.String("delivery_id", d.ID),
			zap.Int("status", resp.StatusCode),
		)
	} else {
		w.handleFailure(ctx, d, resp.StatusCode, fmt.Sprintf("HTTP %d", resp.StatusCode))
	}
}

func (w *DeliveryWorker) handleFailure(ctx context.Context, d *entity.WebhookDelivery, statusCode int, errMsg string) {
	d.ResponseStatus = statusCode
	d.Error = errMsg

	if d.Attempts >= d.MaxRetries {
		d.Status = entity.DeliveryFailed
		d.NextRetryAt = nil
		w.logger.Warn("webhook delivery exhausted retries",
			zap.String("delivery_id", d.ID),
			zap.Int("attempts", d.Attempts),
		)
	} else {
		// Exponential backoff: 2^attempts * 10 seconds, capped at 1 hour
		backoff := time.Duration(1<<uint(d.Attempts)) * 10 * time.Second
		if backoff > time.Hour {
			backoff = time.Hour
		}
		next := time.Now().UTC().Add(backoff)
		d.NextRetryAt = &next
		w.logger.Debug("webhook delivery scheduled for retry",
			zap.String("delivery_id", d.ID),
			zap.Int("attempt", d.Attempts),
			zap.Time("next_retry_at", next),
		)
	}

	if err := w.deliveryRepo.Update(ctx, d); err != nil {
		w.logger.Error("failed to update delivery after failure",
			zap.String("delivery_id", d.ID), zap.Error(err))
	}
}

func (w *DeliveryWorker) markFailed(ctx context.Context, d *entity.WebhookDelivery, errMsg string) {
	d.Status = entity.DeliveryFailed
	d.Error = errMsg
	d.NextRetryAt = nil
	if err := w.deliveryRepo.Update(ctx, d); err != nil {
		w.logger.Error("failed to mark delivery as failed",
			zap.String("delivery_id", d.ID), zap.Error(err))
	}
}

// computeHMAC computes an HMAC-SHA256 signature for the given payload.
func computeHMAC(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}
