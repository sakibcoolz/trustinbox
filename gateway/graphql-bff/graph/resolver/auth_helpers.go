package resolver

import (
	"context"
	"fmt"

	"github.com/trustinbox/cornerstone/auth/rbac"
	"github.com/trustinbox/cornerstone/auth/requestctx"
)

// requireCustomerRole ensures the caller has the CUSTOMER role and returns the user ID.
func requireCustomerRole(ctx context.Context) (string, error) {
	userID := requestctx.UserID(ctx)
	if userID == "" {
		return "", fmt.Errorf("authentication required")
	}
	role := requestctx.Role(ctx)
	if role != string(rbac.RoleCustomer) {
		return "", fmt.Errorf("customer role required, got: %s", role)
	}
	return userID, nil
}

// requireAnyAuthenticatedRole ensures the caller is authenticated and returns the user ID.
func requireAnyAuthenticatedRole(ctx context.Context) (string, error) {
	userID := requestctx.UserID(ctx)
	if userID == "" {
		return "", fmt.Errorf("authentication required")
	}
	return userID, nil
}

// requireProviderRole ensures the caller has a provider role (not CUSTOMER) and returns user ID + SP ID.
func requireProviderRole(ctx context.Context) (string, string, error) {
	userID := requestctx.UserID(ctx)
	if userID == "" {
		return "", "", fmt.Errorf("authentication required")
	}
	role := requestctx.Role(ctx)
	spID := requestctx.ServiceProviderID(ctx)
	if role == string(rbac.RoleCustomer) || spID == "" {
		return "", "", fmt.Errorf("provider role required")
	}
	return userID, spID, nil
}
