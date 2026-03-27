package grpcinterceptors

import (
	"context"

	"github.com/google/uuid"
	"github.com/trustinbox/cornerstone/auth/requestctx"
	"github.com/trustinbox/cornerstone/logging"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

const (
	headerRequestID      = "x-request-id"
	headerTransactionID  = "x-transaction-id"
	headerUserID         = "x-user-id"
	headerOrganizationID = "x-organization-id"
	headerRole           = "x-role"
)

// LoggingUnaryInterceptor logs gRPC unary requests.
func LoggingUnaryInterceptor(log *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		requestID := requestctx.RequestID(ctx)
		log.Info("gRPC request",
			zap.String("method", info.FullMethod),
			zap.String("request_id", requestID),
		)
		resp, err := handler(ctx, req)
		if err != nil {
			log.Error("gRPC error",
				zap.String("method", info.FullMethod),
				zap.String("request_id", requestID),
				zap.Error(err),
			)
		}
		return resp, err
	}
}

// ContextPropagationUnaryInterceptor extracts metadata into context.
func ContextPropagationUnaryInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if ok {
			if vals := md.Get(headerRequestID); len(vals) > 0 {
				ctx = requestctx.WithRequestID(ctx, vals[0])
			}
			if vals := md.Get(headerTransactionID); len(vals) > 0 {
				ctx = requestctx.WithTransactionID(ctx, vals[0])
			}
			if vals := md.Get(headerUserID); len(vals) > 0 {
				ctx = requestctx.WithUserID(ctx, vals[0])
			}
			if vals := md.Get(headerOrganizationID); len(vals) > 0 {
				ctx = requestctx.WithOrganizationID(ctx, vals[0])
			}
			if vals := md.Get(headerRole); len(vals) > 0 {
				ctx = requestctx.WithRole(ctx, vals[0])
			}
		}

		// Ensure request ID exists
		if requestctx.RequestID(ctx) == "" {
			ctx = requestctx.WithRequestID(ctx, uuid.New().String())
		}

		// Inject logger into context
		log := logger.FromContext(ctx).With(
			zap.String("request_id", requestctx.RequestID(ctx)),
			zap.String("method", info.FullMethod),
		)
		ctx = logger.WithContext(ctx, log)

		return handler(ctx, req)
	}
}

// ContextPropagationUnaryClientInterceptor propagates context via outgoing metadata.
func ContextPropagationUnaryClientInterceptor() grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		md := metadata.New(nil)
		if id := requestctx.RequestID(ctx); id != "" {
			md.Set(headerRequestID, id)
		}
		if id := requestctx.TransactionID(ctx); id != "" {
			md.Set(headerTransactionID, id)
		}
		if id := requestctx.UserID(ctx); id != "" {
			md.Set(headerUserID, id)
		}
		if id := requestctx.OrganizationID(ctx); id != "" {
			md.Set(headerOrganizationID, id)
		}
		if role := requestctx.Role(ctx); role != "" {
			md.Set(headerRole, role)
		}
		ctx = metadata.NewOutgoingContext(ctx, md)
		return invoker(ctx, method, req, reply, cc, opts...)
	}
}
