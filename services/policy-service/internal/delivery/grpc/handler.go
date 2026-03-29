package grpc

import (
	"context"

	"github.com/trustinbox/cornerstone/tracing"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/policy-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/policy/v1"
	"go.opentelemetry.io/otel/attribute"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// PolicyHandler implements the PolicyService gRPC server.
type PolicyHandler struct {
	pb.UnimplementedPolicyServiceServer
	evaluator *usecase.PolicyEvaluator
}

// NewPolicyHandler creates a new PolicyHandler.
func NewPolicyHandler(evaluator *usecase.PolicyEvaluator) *PolicyHandler {
	return &PolicyHandler{evaluator: evaluator}
}

func (h *PolicyHandler) EvaluateCommunication(ctx context.Context, req *pb.EvaluateCommunicationRequest) (*pb.EvaluateCommunicationResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "policy-service", "gRPC.EvaluateCommunication",
		attribute.String("user_id", req.UserId),
		attribute.String("organization_id", req.OrganizationId),
	)
	defer span.End()

	result, err := h.evaluator.Evaluate(ctx, req.UserId, req.OrganizationId,
		mapCategory(req.Category),
		mapChannel(req.Channel),
		mapCommType(req.CommunicationType),
		req.ScheduledUnix,
	)
	if err != nil {
		return nil, mapError(err)
	}

	return &pb.EvaluateCommunicationResponse{
		Allowed:          result.Allowed,
		DecisionCode:     mapDecisionCode(result.DecisionCode),
		Reason:           result.Reason,
		AppliedRules:     result.AppliedRules,
		NextAvailableUnix: result.NextAvailableUnix,
	}, nil
}

func (h *PolicyHandler) CheckCallbackPermission(ctx context.Context, req *pb.CheckCallbackPermissionRequest) (*pb.CheckCallbackPermissionResponse, error) {
	result, err := h.evaluator.Evaluate(ctx, req.UserId, req.OrganizationId,
		"ORGANIZATIONAL", "CALLBACK", "CALLBACK_REQUEST", 0,
	)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CheckCallbackPermissionResponse{
		Allowed:      result.Allowed,
		DecisionCode: mapDecisionCode(result.DecisionCode),
		Reason:       result.Reason,
	}, nil
}

func (h *PolicyHandler) GetNextAvailableSlot(ctx context.Context, req *pb.GetNextAvailableSlotRequest) (*pb.GetNextAvailableSlotResponse, error) {
	// TODO: implement next available slot lookup
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func mapCategory(c pb.CommunicationCategory) string {
	switch c {
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_PERSONAL:
		return "PERSONAL"
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_ORGANIZATIONAL:
		return "ORGANIZATIONAL"
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_ADVERTISEMENT:
		return "ADVERTISEMENT"
	default:
		return "UNKNOWN"
	}
}

func mapChannel(c pb.CommunicationChannel) string {
	switch c {
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_PUSH:
		return "PUSH"
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_INBOX:
		return "INBOX"
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT:
		return "CHAT"
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_CALLBACK:
		return "CALLBACK"
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_DOCUMENT:
		return "DOCUMENT"
	default:
		return "UNKNOWN"
	}
}

func mapCommType(t pb.CommunicationType) string {
	switch t {
	case pb.CommunicationType_COMMUNICATION_TYPE_NOTIFICATION:
		return "NOTIFICATION"
	case pb.CommunicationType_COMMUNICATION_TYPE_CALLBACK_REQUEST:
		return "CALLBACK_REQUEST"
	case pb.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE:
		return "CHAT_MESSAGE"
	case pb.CommunicationType_COMMUNICATION_TYPE_DOCUMENT_SHARE:
		return "DOCUMENT_SHARE"
	case pb.CommunicationType_COMMUNICATION_TYPE_CAMPAIGN:
		return "CAMPAIGN"
	default:
		return "UNKNOWN"
	}
}

func mapDecisionCode(code string) pb.DecisionCode {
	switch code {
	case "ALLOW_STANDARD":
		return pb.DecisionCode_DECISION_CODE_ALLOW_STANDARD
	case "DENY_USER_NOT_FOUND":
		return pb.DecisionCode_DECISION_CODE_DENY_USER_NOT_FOUND
	case "DENY_ORG_NOT_VERIFIED":
		return pb.DecisionCode_DECISION_CODE_DENY_ORG_NOT_VERIFIED
	case "DENY_USER_BLOCKED_ORG":
		return pb.DecisionCode_DECISION_CODE_DENY_USER_BLOCKED_ORG
	case "DENY_CATEGORY_DISABLED":
		return pb.DecisionCode_DECISION_CODE_DENY_CATEGORY_DISABLED
	case "DENY_DND_ACTIVE":
		return pb.DecisionCode_DECISION_CODE_DENY_DND_ACTIVE
	case "DENY_OUTSIDE_AVAILABILITY":
		return pb.DecisionCode_DECISION_CODE_DENY_OUTSIDE_AVAILABILITY
	case "DENY_AD_CAP_EXCEEDED":
		return pb.DecisionCode_DECISION_CODE_DENY_AD_CAP_EXCEEDED
	case "DENY_ORG_SUSPENDED":
		return pb.DecisionCode_DECISION_CODE_DENY_ORG_SUSPENDED
	case "DENY_SPAM_SCORE_HIGH":
		return pb.DecisionCode_DECISION_CODE_DENY_SPAM_SCORE_HIGH
	case "REQUIRE_CALLBACK_APPROVAL":
		return pb.DecisionCode_DECISION_CODE_REQUIRE_CALLBACK_APPROVAL
	default:
		return pb.DecisionCode_DECISION_CODE_UNSPECIFIED
	}
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Errorf(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Errorf(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Errorf(codes.PermissionDenied, err.Error())
	default:
		return status.Errorf(codes.Internal, err.Error())
	}
}
