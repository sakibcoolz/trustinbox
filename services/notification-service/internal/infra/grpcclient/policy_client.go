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

// EvaluateCommunication calls the policy service to determine if communication is allowed.
func (c *PolicyGRPCClient) EvaluateCommunication(ctx context.Context, userID, orgID, category, channel, commType string) (bool, string, error) {
	client := policyv1.NewPolicyServiceClient(c.conn)

	req := &policyv1.EvaluateCommunicationRequest{
		UserId:            userID,
		OrganizationId:    orgID,
		Category:          mapCategory(category),
		Channel:           mapChannel(channel),
		CommunicationType: mapCommType(commType),
	}

	resp, err := client.EvaluateCommunication(ctx, req)
	if err != nil {
		return false, "", fmt.Errorf("policy grpc call: %w", err)
	}

	return resp.GetAllowed(), resp.GetReason(), nil
}

func mapCategory(category string) policyv1.CommunicationCategory {
	switch category {
	case "PERSONAL":
		return policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_PERSONAL
	case "ORGANIZATIONAL":
		return policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_ORGANIZATIONAL
	case "ADVERTISEMENT":
		return policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_ADVERTISEMENT
	default:
		return policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_UNSPECIFIED
	}
}

func mapChannel(channel string) policyv1.CommunicationChannel {
	switch channel {
	case "PUSH":
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_PUSH
	case "INBOX":
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_INBOX
	case "CHAT":
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT
	case "CALLBACK":
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CALLBACK
	case "DOCUMENT":
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_DOCUMENT
	default:
		return policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_UNSPECIFIED
	}
}

func mapCommType(commType string) policyv1.CommunicationType {
	switch commType {
	case "NOTIFICATION":
		return policyv1.CommunicationType_COMMUNICATION_TYPE_NOTIFICATION
	case "CALLBACK_REQUEST":
		return policyv1.CommunicationType_COMMUNICATION_TYPE_CALLBACK_REQUEST
	case "CHAT_MESSAGE":
		return policyv1.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE
	case "DOCUMENT_SHARE":
		return policyv1.CommunicationType_COMMUNICATION_TYPE_DOCUMENT_SHARE
	case "CAMPAIGN":
		return policyv1.CommunicationType_COMMUNICATION_TYPE_CAMPAIGN
	default:
		return policyv1.CommunicationType_COMMUNICATION_TYPE_UNSPECIFIED
	}
}
