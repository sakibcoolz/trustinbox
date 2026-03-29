package requestctx

import (
	"context"
)

type contextKey string

const (
	keyRequestID      contextKey = "request_id"
	keyTransactionID  contextKey = "transaction_id"
	keyUserID         contextKey = "user_id"
	keyServiceProviderID contextKey = "service_provider_id"
	keyRole           contextKey = "role"
)

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyRequestID, id)
}

func RequestID(ctx context.Context) string {
	if v, ok := ctx.Value(keyRequestID).(string); ok {
		return v
	}
	return ""
}

func WithTransactionID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyTransactionID, id)
}

func TransactionID(ctx context.Context) string {
	if v, ok := ctx.Value(keyTransactionID).(string); ok {
		return v
	}
	return ""
}

func WithUserID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyUserID, id)
}

func UserID(ctx context.Context) string {
	if v, ok := ctx.Value(keyUserID).(string); ok {
		return v
	}
	return ""
}

func WithServiceProviderID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyServiceProviderID, id)
}

func ServiceProviderID(ctx context.Context) string {
	if v, ok := ctx.Value(keyServiceProviderID).(string); ok {
		return v
	}
	return ""
}

func WithRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, keyRole, role)
}

func Role(ctx context.Context) string {
	if v, ok := ctx.Value(keyRole).(string); ok {
		return v
	}
	return ""
}
