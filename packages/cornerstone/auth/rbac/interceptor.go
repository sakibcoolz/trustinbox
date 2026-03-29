package rbac

import (
	"context"

	"github.com/trustinbox/cornerstone/auth/requestctx"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"google.golang.org/grpc"
)

// UnaryServerInterceptor returns a gRPC interceptor that enforces RBAC on incoming requests.
// It requires that the role is already set in the context (via ContextPropagationUnaryInterceptor).
// The permissionForMethod function maps gRPC method names to required permissions.
func UnaryServerInterceptor(permissionForMethod func(method string) Permission) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		requiredPerm := permissionForMethod(info.FullMethod)
		if requiredPerm == "" {
			return handler(ctx, req)
		}

		role := requestctx.Role(ctx)
		if role == "" {
			return nil, bizerr.Unauthorized("no role in request context")
		}

		if !HasPermission(Role(role), requiredPerm) {
			return nil, bizerr.Forbidden("insufficient permissions for " + string(requiredPerm))
		}

		return handler(ctx, req)
	}
}
