package metrics

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// Recorder provides high-level methods for recording platform metrics.
type Recorder struct {
	meter metric.Meter

	// Notification metrics
	NotificationsSent      metric.Int64Counter
	NotificationsDelivered metric.Int64Counter
	NotificationsRead      metric.Int64Counter
	NotificationsRejected  metric.Int64Counter

	// Callback metrics
	CallbacksRequested metric.Int64Counter
	CallbacksApproved  metric.Int64Counter
	CallbacksRejected  metric.Int64Counter

	// Policy metrics
	PolicyEvaluations metric.Int64Counter
	PolicyDenials     metric.Int64Counter

	// Campaign metrics
	CampaignTargetsProcessed metric.Int64Counter

	// Bot metrics
	BotActionsExecuted metric.Int64Counter
	BotEscalations     metric.Int64Counter

	// Spam metrics
	SpamReports metric.Int64Counter

	// Document metrics
	DocumentShares metric.Int64Counter
	DocumentOpens  metric.Int64Counter

	// Webhook metrics
	WebhookDeliveries       metric.Int64Counter
	WebhookDeliveryFailures metric.Int64Counter

	// Request duration
	RequestDuration metric.Float64Histogram

	// Queue metrics
	QueueDepth metric.Int64UpDownCounter
}

// NewRecorder creates a metrics recorder for the given service.
func NewRecorder(serviceName string) (*Recorder, error) {
	meter := otel.Meter(serviceName)
	r := &Recorder{meter: meter}

	var err error

	r.NotificationsSent, err = meter.Int64Counter("trustinbox.notifications.sent",
		metric.WithDescription("Total notifications sent"))
	if err != nil {
		return nil, fmt.Errorf("create notifications_sent counter: %w", err)
	}

	r.NotificationsDelivered, err = meter.Int64Counter("trustinbox.notifications.delivered",
		metric.WithDescription("Total notifications delivered"))
	if err != nil {
		return nil, fmt.Errorf("create notifications_delivered counter: %w", err)
	}

	r.NotificationsRead, err = meter.Int64Counter("trustinbox.notifications.read",
		metric.WithDescription("Total notifications read"))
	if err != nil {
		return nil, fmt.Errorf("create notifications_read counter: %w", err)
	}

	r.NotificationsRejected, err = meter.Int64Counter("trustinbox.notifications.rejected",
		metric.WithDescription("Total notifications rejected by policy"))
	if err != nil {
		return nil, fmt.Errorf("create notifications_rejected counter: %w", err)
	}

	r.CallbacksRequested, err = meter.Int64Counter("trustinbox.callbacks.requested",
		metric.WithDescription("Total callback requests"))
	if err != nil {
		return nil, fmt.Errorf("create callbacks_requested counter: %w", err)
	}

	r.CallbacksApproved, err = meter.Int64Counter("trustinbox.callbacks.approved",
		metric.WithDescription("Total callbacks approved"))
	if err != nil {
		return nil, fmt.Errorf("create callbacks_approved counter: %w", err)
	}

	r.CallbacksRejected, err = meter.Int64Counter("trustinbox.callbacks.rejected",
		metric.WithDescription("Total callbacks rejected"))
	if err != nil {
		return nil, fmt.Errorf("create callbacks_rejected counter: %w", err)
	}

	r.PolicyEvaluations, err = meter.Int64Counter("trustinbox.policy.evaluations",
		metric.WithDescription("Total policy evaluations"))
	if err != nil {
		return nil, fmt.Errorf("create policy_evaluations counter: %w", err)
	}

	r.PolicyDenials, err = meter.Int64Counter("trustinbox.policy.denials",
		metric.WithDescription("Total policy denials"))
	if err != nil {
		return nil, fmt.Errorf("create policy_denials counter: %w", err)
	}

	r.CampaignTargetsProcessed, err = meter.Int64Counter("trustinbox.campaigns.targets_processed",
		metric.WithDescription("Total campaign targets processed"))
	if err != nil {
		return nil, fmt.Errorf("create campaign_targets counter: %w", err)
	}

	r.BotActionsExecuted, err = meter.Int64Counter("trustinbox.bots.actions_executed",
		metric.WithDescription("Total bot actions executed"))
	if err != nil {
		return nil, fmt.Errorf("create bot_actions counter: %w", err)
	}

	r.BotEscalations, err = meter.Int64Counter("trustinbox.bots.escalations",
		metric.WithDescription("Total bot escalations to human"))
	if err != nil {
		return nil, fmt.Errorf("create bot_escalations counter: %w", err)
	}

	r.SpamReports, err = meter.Int64Counter("trustinbox.spam.reports",
		metric.WithDescription("Total spam reports"))
	if err != nil {
		return nil, fmt.Errorf("create spam_reports counter: %w", err)
	}

	r.DocumentShares, err = meter.Int64Counter("trustinbox.documents.shares",
		metric.WithDescription("Total documents shared"))
	if err != nil {
		return nil, fmt.Errorf("create document_shares counter: %w", err)
	}

	r.DocumentOpens, err = meter.Int64Counter("trustinbox.documents.opens",
		metric.WithDescription("Total documents opened"))
	if err != nil {
		return nil, fmt.Errorf("create document_opens counter: %w", err)
	}

	r.WebhookDeliveries, err = meter.Int64Counter("trustinbox.webhooks.deliveries",
		metric.WithDescription("Total webhook deliveries"))
	if err != nil {
		return nil, fmt.Errorf("create webhook_deliveries counter: %w", err)
	}

	r.WebhookDeliveryFailures, err = meter.Int64Counter("trustinbox.webhooks.delivery_failures",
		metric.WithDescription("Total webhook delivery failures"))
	if err != nil {
		return nil, fmt.Errorf("create webhook_delivery_failures counter: %w", err)
	}

	r.RequestDuration, err = meter.Float64Histogram("trustinbox.request.duration_ms",
		metric.WithDescription("Request duration in milliseconds"),
		metric.WithUnit("ms"))
	if err != nil {
		return nil, fmt.Errorf("create request_duration histogram: %w", err)
	}

	r.QueueDepth, err = meter.Int64UpDownCounter("trustinbox.queue.depth",
		metric.WithDescription("Current queue depth"))
	if err != nil {
		return nil, fmt.Errorf("create queue_depth counter: %w", err)
	}

	return r, nil
}

// RecordRequestDuration records the duration of an operation.
func (r *Recorder) RecordRequestDuration(ctx context.Context, operation string, startTime time.Time, attrs ...attribute.KeyValue) {
	duration := float64(time.Since(startTime).Milliseconds())
	allAttrs := append([]attribute.KeyValue{attribute.String("operation", operation)}, attrs...)
	r.RequestDuration.Record(ctx, duration, metric.WithAttributes(allAttrs...))
}

// MetricsMiddleware returns an HTTP middleware that records request duration.
func (r *Recorder) MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, req)
		r.RecordRequestDuration(req.Context(), req.URL.Path, start,
			attribute.String("method", req.Method),
		)
	})
}
