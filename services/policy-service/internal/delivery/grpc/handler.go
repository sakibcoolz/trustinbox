package grpc

import (
	"context"
	"time"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/policy-service/internal/domain/entity"
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
		attribute.String("service_provider_id", req.ServiceProviderId),
	)
	defer span.End()

	var scheduledTime time.Time
	if req.ScheduledUnix > 0 {
		scheduledTime = time.Unix(req.ScheduledUnix, 0)
	}

	result, err := h.evaluator.Evaluate(ctx, entity.EvaluationRequest{
		UserID:            req.UserId,
		ServiceProviderID: req.ServiceProviderId,
		Category:          mapCategory(req.Category),
		Channel:           mapChannel(req.Channel),
		CommunicationType: mapCommType(req.CommunicationType),
		ScheduledTime:     scheduledTime,
	})
	if err != nil {
		return nil, mapError(err)
	}

	var nextAvailableUnix int64
	if result.NextAvailableAt != nil {
		nextAvailableUnix = result.NextAvailableAt.Unix()
	}

	return &pb.EvaluateCommunicationResponse{
		Allowed:           result.Allowed,
		DecisionCode:      mapDecisionCode(result.DecisionCode),
		Reason:            result.Reason,
		AppliedRules:      result.AppliedRules,
		NextAvailableUnix: nextAvailableUnix,
	}, nil
}

func (h *PolicyHandler) CheckCallbackPermission(ctx context.Context, req *pb.CheckCallbackPermissionRequest) (*pb.CheckCallbackPermissionResponse, error) {
	result, err := h.evaluator.Evaluate(ctx, entity.EvaluationRequest{
		UserID:            req.UserId,
		ServiceProviderID: req.ServiceProviderId,
		Category:          entity.CategoryServiceProvider,
		Channel:           entity.ChannelCallback,
		CommunicationType: entity.CommTypeCallbackReq,
	})
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
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func mapCategory(c pb.CommunicationCategory) entity.Category {
	switch c {
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_PERSONAL:
		return entity.CategoryPersonal
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_SERVICE_PROVIDER:
		return entity.CategoryServiceProvider
	case pb.CommunicationCategory_COMMUNICATION_CATEGORY_ADVERTISEMENT:
		return entity.CategoryAdvertisement
	default:
		return entity.Category("UNKNOWN")
	}
}

func mapChannel(c pb.CommunicationChannel) entity.Channel {
	switch c {
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_PUSH:
		return entity.ChannelPush
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_INBOX:
		return entity.ChannelInbox
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT:
		return entity.ChannelChat
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_CALLBACK:
		return entity.ChannelCallback
	case pb.CommunicationChannel_COMMUNICATION_CHANNEL_DOCUMENT:
		return entity.ChannelDocument
	default:
		return entity.Channel("UNKNOWN")
	}
}

func mapCommType(t pb.CommunicationType) entity.CommunicationType {
	switch t {
	case pb.CommunicationType_COMMUNICATION_TYPE_NOTIFICATION:
		return entity.CommTypeNotification
	case pb.CommunicationType_COMMUNICATION_TYPE_CALLBACK_REQUEST:
		return entity.CommTypeCallbackReq
	case pb.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE:
		return entity.CommTypeChatMessage
	case pb.CommunicationType_COMMUNICATION_TYPE_DOCUMENT_SHARE:
		return entity.CommTypeDocumentShare
	case pb.CommunicationType_COMMUNICATION_TYPE_CAMPAIGN:
		return entity.CommTypeCampaign
	default:
		return entity.CommunicationType("UNKNOWN")
	}
}

func mapDecisionCode(code entity.DecisionCode) pb.DecisionCode {
	switch code {
	case entity.DecisionAllowStandard:
		return pb.DecisionCode_DECISION_CODE_ALLOW_STANDARD
	case entity.DecisionDenyUserNotFound:
		return pb.DecisionCode_DECISION_CODE_DENY_USER_NOT_FOUND
	case entity.DecisionDenySPNotVerified:
		return pb.DecisionCode_DECISION_CODE_DENY_SP_NOT_VERIFIED
	case entity.DecisionDenyUserBlockedSP:
		return pb.DecisionCode_DECISION_CODE_DENY_USER_BLOCKED_SP
	case entity.DecisionDenyCategoryDisabled:
		return pb.DecisionCode_DECISION_CODE_DENY_CATEGORY_DISABLED
	case entity.DecisionDenyDNDActive:
		return pb.DecisionCode_DECISION_CODE_DENY_DND_ACTIVE
	case entity.DecisionDenyOutsideAvailability:
		return pb.DecisionCode_DECISION_CODE_DENY_OUTSIDE_AVAILABILITY
	case entity.DecisionDenyAdCapExceeded:
		return pb.DecisionCode_DECISION_CODE_DENY_AD_CAP_EXCEEDED
	case entity.DecisionDenySPSuspended:
		return pb.DecisionCode_DECISION_CODE_DENY_SP_SUSPENDED
	case entity.DecisionDenySpamScoreHigh:
		return pb.DecisionCode_DECISION_CODE_DENY_SPAM_SCORE_HIGH
	case entity.DecisionRequireCallbackApproval:
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
