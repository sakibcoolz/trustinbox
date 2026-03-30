package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

type PolicyChecker interface {
	EvaluateCallbackPermission(ctx context.Context, userID, spID string) (bool, string, error)
}

type CommunicationUseCase struct {
	callbackRepo repository.CallbackRequestRepository
	convRepo     repository.ConversationRepository
	msgRepo      repository.MessageRepository
	spamRepo     repository.SpamReportRepository
	policy       PolicyChecker
	log          *zap.Logger
}

func NewCommunicationUseCase(
	callbackRepo repository.CallbackRequestRepository,
	convRepo repository.ConversationRepository,
	msgRepo repository.MessageRepository,
	spamRepo repository.SpamReportRepository,
	policy PolicyChecker,
	log *zap.Logger,
) *CommunicationUseCase {
	return &CommunicationUseCase{
		callbackRepo: callbackRepo,
		convRepo:     convRepo,
		msgRepo:      msgRepo,
		spamRepo:     spamRepo,
		policy:       policy,
		log:          log,
	}
}

// CreateCallbackRequest creates a new callback request after policy check.
func (uc *CommunicationUseCase) CreateCallbackRequest(ctx context.Context, req *entity.CallbackRequest) (*entity.CallbackRequest, error) {
	ctx, span := tracing.StartSpan(ctx, "communication-service", "CreateCallbackRequest",
		attribute.String("user_id", req.UserID),
		attribute.String("sp_id", req.ServiceProviderID),
	)
	defer span.End()

	// Check policy
	allowed, reason, err := uc.policy.EvaluateCallbackPermission(ctx, req.UserID, req.ServiceProviderID)
	if err != nil {
		return nil, bzerr.Internal("policy check failed", err)
	}
	if !allowed {
		return nil, bzerr.PolicyDenied(reason)
	}

	req.ID = uuid.New().String()
	req.Status = "PENDING"
	req.RequestedAt = time.Now()

	if err := uc.callbackRepo.Create(ctx, req); err != nil {
		return nil, bzerr.Internal("failed to create callback request", err)
	}

	return req, nil
}

// ApproveCallbackRequest approves a callback with a time slot.
func (uc *CommunicationUseCase) ApproveCallbackRequest(ctx context.Context, requestID, userID string, slotStart, slotEnd time.Time) error {
	ctx, span := tracing.StartSpan(ctx, "communication-service", "ApproveCallbackRequest",
		attribute.String("request_id", requestID),
	)
	defer span.End()

	req, err := uc.callbackRepo.GetByID(ctx, requestID)
	if err != nil {
		return bzerr.NotFound("callback_request", requestID)
	}
	if req.UserID != userID {
		return bzerr.Forbidden("not authorized to approve this callback request")
	}
	if req.Status != "PENDING" {
		return bzerr.InvalidInput("callback request is not in PENDING status")
	}

	return uc.callbackRepo.Approve(ctx, requestID, slotStart, slotEnd)
}

// RejectCallbackRequest rejects a callback request.
func (uc *CommunicationUseCase) RejectCallbackRequest(ctx context.Context, requestID, userID, reason string) error {
	req, err := uc.callbackRepo.GetByID(ctx, requestID)
	if err != nil {
		return bzerr.NotFound("callback_request", requestID)
	}
	if req.UserID != userID {
		return bzerr.Forbidden("not authorized to reject this callback request")
	}

	return uc.callbackRepo.Reject(ctx, requestID, reason)
}

// SendMessage sends a message in a conversation.
func (uc *CommunicationUseCase) SendMessage(ctx context.Context, msg *entity.Message) (*entity.Message, error) {
	ctx, span := tracing.StartSpan(ctx, "communication-service", "SendMessage",
		attribute.String("conversation_id", msg.ConversationID),
	)
	defer span.End()

	msg.ID = uuid.New().String()
	msg.CreatedAt = time.Now()

	if err := uc.msgRepo.Create(ctx, msg); err != nil {
		return nil, bzerr.Internal("failed to send message", err)
	}

	return msg, nil
}

// ReportSpam creates a spam report.
func (uc *CommunicationUseCase) ReportSpam(ctx context.Context, report *entity.SpamReport) error {
	report.ID = uuid.New().String()
	report.Status = "OPEN"
	return uc.spamRepo.Create(ctx, report)
}

// ListCallbackRequests lists callback requests for a user.
func (uc *CommunicationUseCase) ListCallbackRequests(ctx context.Context, userID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	return uc.callbackRepo.ListByUser(ctx, userID, status, limit, offset)
}

// ListConversations lists conversations for a user.
func (uc *CommunicationUseCase) ListConversations(ctx context.Context, userID string, limit, offset int) ([]entity.Conversation, int, error) {
	return uc.convRepo.ListByUser(ctx, userID, limit, offset)
}
