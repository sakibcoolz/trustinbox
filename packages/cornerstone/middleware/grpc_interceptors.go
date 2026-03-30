package grpcinterceptors

import (
	"context"

	"github.com/google/uuid"
	"github.com/trustinbox/cornerstone/auth/requestctx"
	logger "github.com/trustinbox/cornerstone/logging"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

const (
	headerRequestID         = "x-request-id"
	headerTransactionID     = "x-transaction-id"
	headerUserID            = "x-user-id"
	headerServiceProviderID = "x-service-provider-id"
	headerRole              = "x-role"
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

// TracingUnaryInterceptor creates a span for every gRPC call and injects
// business attributes (tenant_id, user_id, service_provider_id) from context.
func TracingUnaryInterceptor(serviceName string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		ctx, span := tracing.StartSpan(ctx, serviceName, info.FullMethod,
			attribute.String("rpc.system", "grpc"),
			attribute.String("rpc.service", serviceName),
			attribute.String("rpc.method", info.FullMethod),
		)
		defer span.End()

		// Inject business attributes from context propagation
		userID := requestctx.UserID(ctx)
		spID := requestctx.ServiceProviderID(ctx)
		tracing.InjectBusinessAttrs(ctx, "", spID, userID)

		resp, err := handler(ctx, req)
		if err != nil {
			tracing.SetError(ctx, err)
		} else {
			tracing.SetOK(ctx)
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
			if vals := md.Get(headerServiceProviderID); len(vals) > 0 {
				ctx = requestctx.WithServiceProviderID(ctx, vals[0])
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
		if id := requestctx.ServiceProviderID(ctx); id != "" {
			md.Set(headerServiceProviderID, id)
		}
		if role := requestctx.Role(ctx); role != "" {
			md.Set(headerRole, role)
		}
		ctx = metadata.NewOutgoingContext(ctx, md)
		return invoker(ctx, method, req, reply, cc, opts...)
	}
}

// TracingUnaryClientInterceptor creates a client-side span for outgoing gRPC calls.
func TracingUnaryClientInterceptor(serviceName string) grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		ctx, span := tracing.StartSpan(ctx, serviceName, method,
			attribute.String("rpc.system", "grpc"),
			attribute.String("rpc.method", method),
			attribute.String("span.kind", "client"),
		)
		defer span.End()

		err := invoker(ctx, method, req, reply, cc, opts...)
		if err != nil {
			tracing.SetError(ctx, err)
		} else {
			tracing.SetOK(ctx)
		}
		return err
	}
}
