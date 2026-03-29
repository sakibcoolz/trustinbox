package grpcclient

import (
	"context"
	"fmt"

	policyv1 "github.com/trustinbox/proto/gen/policy/v1"
	"google.golang.org/grpc"
)

// PolicyGRPCClient implements usecase.PolicyChecker via the policy service gRPC API.
type PolicyGRPCClient struct {
	conn *grpc.ClientConn
}

// NewPolicyGRPCClient creates a new PolicyGRPCClient.
func NewPolicyGRPCClient(conn *grpc.ClientConn) *PolicyGRPCClient {
	return &PolicyGRPCClient{conn: conn}
}

// EvaluateCallbackPermission calls the policy service to check if a callback request is allowed.
func (c *PolicyGRPCClient) EvaluateCallbackPermission(ctx context.Context, userID, orgID string) (bool, string, error) {
	client := policyv1.NewPolicyServiceClient(c.conn)

	resp, err := client.CheckCallbackPermission(ctx, &policyv1.CheckCallbackPermissionRequest{
		UserId:         userID,
		OrganizationId: orgID,
	})
	if err != nil {
		return false, "", fmt.Errorf("policy grpc call: %w", err)
	}

	return resp.GetAllowed(), resp.GetReason(), nil
}
