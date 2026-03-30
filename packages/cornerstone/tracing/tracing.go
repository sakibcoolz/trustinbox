package tracing

import (
	"context"
	"database/sql"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// Common span attribute keys used across the platform.
const (
	AttrTenantID       = "trustinbox.tenant_id"
	AttrOrgID          = "trustinbox.org_id"
	AttrUserID         = "trustinbox.user_id"
	AttrBotID          = "trustinbox.bot_id"
	AttrNotificationID = "trustinbox.notification_id"
	AttrSPID           = "trustinbox.service_provider_id"
	AttrConversationID = "trustinbox.conversation_id"
	AttrCampaignID     = "trustinbox.campaign_id"
	AttrEventType      = "trustinbox.event_type"
	AttrPolicyDecision = "trustinbox.policy_decision"
)

// StartSpan creates a new span from the tracer.
func StartSpan(ctx context.Context, tracerName, spanName string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	tracer := otel.Tracer(tracerName)
	ctx, span := tracer.Start(ctx, spanName)
	if len(attrs) > 0 {
		span.SetAttributes(attrs...)
	}
	return ctx, span
}

// SpanFromContext returns the current span.
func SpanFromContext(ctx context.Context) trace.Span {
	return trace.SpanFromContext(ctx)
}

// AddEvent adds an event to the current span.
func AddEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	span.AddEvent(name, trace.WithAttributes(attrs...))
}

// SetError records an error on the current span.
func SetError(ctx context.Context, err error) {
	span := trace.SpanFromContext(ctx)
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())
}

// SetOK marks the current span as successful.
func SetOK(ctx context.Context) {
	span := trace.SpanFromContext(ctx)
	span.SetStatus(codes.Ok, "")
}

// TraceID returns the current trace ID as a hex string, or "" if none.
func TraceID(ctx context.Context) string {
	sc := trace.SpanFromContext(ctx).SpanContext()
	if sc.HasTraceID() {
		return sc.TraceID().String()
	}
	return ""
}

// InjectBusinessAttrs adds common TrustInbox span attributes.
func InjectBusinessAttrs(ctx context.Context, tenantID, spID, userID string) {
	span := trace.SpanFromContext(ctx)
	if tenantID != "" {
		span.SetAttributes(attribute.String(AttrTenantID, tenantID))
	}
	if spID != "" {
		span.SetAttributes(attribute.String(AttrSPID, spID))
	}
	if userID != "" {
		span.SetAttributes(attribute.String(AttrUserID, userID))
	}
}

// ─── Database tracing helpers ────────────────────────────────

// TraceDBQuery wraps a single DB query with a span.
func TraceDBQuery(ctx context.Context, tracerName, operation, query string) (context.Context, trace.Span) {
	ctx, span := StartSpan(ctx, tracerName, fmt.Sprintf("db.%s", operation),
		attribute.String("db.system", "postgresql"),
		attribute.String("db.operation", operation),
		attribute.String("db.statement", truncateSQL(query)),
	)
	return ctx, span
}

// TraceDBExec wraps a DB exec call with a span.
func TraceDBExec(ctx context.Context, tracerName, operation string) (context.Context, trace.Span) {
	ctx, span := StartSpan(ctx, tracerName, fmt.Sprintf("db.%s", operation),
		attribute.String("db.system", "postgresql"),
		attribute.String("db.operation", operation),
	)
	return ctx, span
}

// TracedQueryRow executes db.QueryRowContext inside a traced span.
func TracedQueryRow(ctx context.Context, db *sql.DB, tracerName, operation, query string, args ...interface{}) *sql.Row {
	ctx, span := TraceDBQuery(ctx, tracerName, operation, query)
	defer span.End()
	return db.QueryRowContext(ctx, query, args...)
}

// ─── Queue / event tracing helpers ──────────────────────────

// TraceQueuePublish wraps a queue publish with a span.
func TraceQueuePublish(ctx context.Context, tracerName, eventType string) (context.Context, trace.Span) {
	return StartSpan(ctx, tracerName, "queue.publish",
		attribute.String("messaging.system", "redis"),
		attribute.String("messaging.operation", "publish"),
		attribute.String(AttrEventType, eventType),
	)
}

// TraceQueueConsume wraps a queue consume with a span.
func TraceQueueConsume(ctx context.Context, tracerName, eventType, consumerGroup string) (context.Context, trace.Span) {
	return StartSpan(ctx, tracerName, "queue.consume",
		attribute.String("messaging.system", "redis"),
		attribute.String("messaging.operation", "process"),
		attribute.String("messaging.consumer.group", consumerGroup),
		attribute.String(AttrEventType, eventType),
	)
}

func truncateSQL(q string) string {
	if len(q) > 256 {
		return q[:256] + "..."
	}
	return q
}
