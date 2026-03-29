package grpc

import (
	"context"
	"time"

	policyv1 "github.com/trustinbox/proto/gen/policy/v1"
	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/usecase"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// PolicyGRPCHandler implements the gRPC PolicyService server.
type PolicyGRPCHandler struct {
	policyv1.UnimplementedPolicyServiceServer
	evaluator *usecase.PolicyEvaluator
	logger    *zap.Logger
}

// NewPolicyGRPCHandler creates a new PolicyGRPCHandler.
func NewPolicyGRPCHandler(evaluator *usecase.PolicyEvaluator, logger *zap.Logger) *PolicyGRPCHandler {
	return &PolicyGRPCHandler{evaluator: evaluator, logger: logger}
}

// EvaluateCommunication evaluates whether a communication is allowed by policy.
func (h *PolicyGRPCHandler) EvaluateCommunication(ctx context.Context, req *policyv1.EvaluateCommunicationRequest) (*policyv1.EvaluateCommunicationResponse, error) {
	evalReq := entity.EvaluationRequest{
		UserID:            req.GetUserId(),
		OrganizationID:    req.GetOrganizationId(),
		Category:          mapProtoCategory(req.GetCategory()),
		Channel:           mapProtoChannel(req.GetChannel()),
		CommunicationType: mapProtoCommunicationType(req.GetCommunicationType()),
	}
	if scheduledUnix := req.GetScheduledUnix(); scheduledUnix > 0 {
		evalReq.ScheduledTime = time.Unix(scheduledUnix, 0)
	}

	result, err := h.evaluator.Evaluate(ctx, evalReq)
	if err != nil {
		h.logger.Error("policy evaluation error", zap.Error(err))
		return nil, status.Error(codes.Internal, "policy evaluation failed")
	}

	resp := &policyv1.EvaluateCommunicationResponse{
		Allowed:      result.Allowed,
		DecisionCode: mapEntityDecisionCode(result.DecisionCode),
		Reason:       result.Reason,
		AppliedRules: result.AppliedRules,
	}
	if result.NextAvailableAt != nil {
		resp.NextAvailableUnix = result.NextAvailableAt.Unix()
	}
	return resp, nil
}

// CheckCallbackPermission checks if a callback request is permitted.
func (h *PolicyGRPCHandler) CheckCallbackPermission(ctx context.Context, req *policyv1.CheckCallbackPermissionRequest) (*policyv1.CheckCallbackPermissionResponse, error) {
	evalReq := entity.EvaluationRequest{
		UserID:            req.GetUserId(),
		OrganizationID:    req.GetOrganizationId(),
		Channel:           entity.ChannelCallback,
		CommunicationType: entity.CommTypeCallbackReq,
		Category:          entity.CategoryOrganizational,
	}

	result, err := h.evaluator.Evaluate(ctx, evalReq)
	if err != nil {
		h.logger.Error("callback permission check error", zap.Error(err))
		return nil, status.Error(codes.Internal, "callback permission check failed")
	}

	return &policyv1.CheckCallbackPermissionResponse{
		Allowed:      result.Allowed,
		DecisionCode: mapEntityDecisionCode(result.DecisionCode),
		Reason:       result.Reason,
	}, nil
}

// GetNextAvailableSlot returns the next available slot for communication.
func (h *PolicyGRPCHandler) GetNextAvailableSlot(_ context.Context, _ *policyv1.GetNextAvailableSlotRequest) (*policyv1.GetNextAvailableSlotResponse, error) {
	return nil, status.Error(codes.Unimplemented, "GetNextAvailableSlot is not yet implemented")
}

func mapProtoCategory(c policyv1.CommunicationCategory) entity.Category {
	switch c {
	case policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_PERSONAL:
		return entity.CategoryPersonal
	case policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_ORGANIZATIONAL:
		return entity.CategoryOrganizational
	case policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_ADVERTISEMENT:
		return entity.CategoryAdvertisement
	default:
		return entity.CategoryOrganizational
	}
}

func mapProtoChannel(c policyv1.CommunicationChannel) entity.Channel {
	switch c {
	case policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_PUSH:
		return entity.ChannelPush
	case policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_INBOX:
		return entity.ChannelInbox
	case policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT:
		return entity.ChannelChat
	case policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CALLBACK:
		return entity.ChannelCallback
	case policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_DOCUMENT:
		return entity.ChannelDocument
	default:
		return entity.ChannelInbox
	}
}

func mapProtoCommunicationType(t policyv1.CommunicationType) entity.CommunicationType {
	switch t {
	case policyv1.CommunicationType_COMMUNICATION_TYPE_NOTIFICATION:
		return entity.CommTypeNotification
	case policyv1.CommunicationType_COMMUNICATION_TYPE_CALLBACK_REQUEST:
		return entity.CommTypeCallbackReq
	case policyv1.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE:
		return entity.CommTypeChatMessage
	case policyv1.CommunicationType_COMMUNICATION_TYPE_DOCUMENT_SHARE:
		return entity.CommTypeDocumentShare
	case policyv1.CommunicationType_COMMUNICATION_TYPE_CAMPAIGN:
		return entity.CommTypeCampaign
	default:
		return entity.CommTypeNotification
	}
}

func mapEntityDecisionCode(d entity.DecisionCode) policyv1.DecisionCode {
	switch d {
	case entity.DecisionAllowStandard:
		return policyv1.DecisionCode_DECISION_CODE_ALLOW_STANDARD
	case entity.DecisionDenyUserNotFound:
		return policyv1.DecisionCode_DECISION_CODE_DENY_USER_NOT_FOUND
	case entity.DecisionDenyOrgNotVerified:
		return policyv1.DecisionCode_DECISION_CODE_DENY_ORG_NOT_VERIFIED
	case entity.DecisionDenyUserBlockedOrg:
		return policyv1.DecisionCode_DECISION_CODE_DENY_USER_BLOCKED_ORG
	case entity.DecisionDenyCategoryDisabled:
		return policyv1.DecisionCode_DECISION_CODE_DENY_CATEGORY_DISABLED
	case entity.DecisionDenyDNDActive:
		return policyv1.DecisionCode_DECISION_CODE_DENY_DND_ACTIVE
	case entity.DecisionDenyOutsideAvailability:
		return policyv1.DecisionCode_DECISION_CODE_DENY_OUTSIDE_AVAILABILITY
	case entity.DecisionDenyAdCapExceeded:
		return policyv1.DecisionCode_DECISION_CODE_DENY_AD_CAP_EXCEEDED
	case entity.DecisionDenyOrgSuspended:
		return policyv1.DecisionCode_DECISION_CODE_DENY_ORG_SUSPENDED
	case entity.DecisionDenySpamScoreHigh:
		return policyv1.DecisionCode_DECISION_CODE_DENY_SPAM_SCORE_HIGH
	case entity.DecisionRequireCallbackApproval:
		return policyv1.DecisionCode_DECISION_CODE_REQUIRE_CALLBACK_APPROVAL
	case entity.DecisionSuggestNextSlot:
		return policyv1.DecisionCode_DECISION_CODE_SUGGEST_NEXT_AVAILABLE_SLOT
	default:
		return policyv1.DecisionCode_DECISION_CODE_UNSPECIFIED
	}
}
