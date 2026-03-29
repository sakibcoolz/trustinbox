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
	EvaluateCallbackPermission(ctx context.Context, userID, orgID string) (bool, string, error)
}

type CommunicationUseCase struct {
	callbackRepo  repository.CallbackRequestRepository
	convRepo      repository.ConversationRepository
	msgRepo       repository.MessageRepository
	spamRepo      repository.SpamReportRepository
	docRepo       repository.DocumentRepository
	docShareRepo  repository.DocumentShareRepository
	policy        PolicyChecker
	log           *zap.Logger
}

func NewCommunicationUseCase(
	callbackRepo repository.CallbackRequestRepository,
	convRepo repository.ConversationRepository,
	msgRepo repository.MessageRepository,
	spamRepo repository.SpamReportRepository,
	docRepo repository.DocumentRepository,
	docShareRepo repository.DocumentShareRepository,
	policy PolicyChecker,
	log *zap.Logger,
) *CommunicationUseCase {
	return &CommunicationUseCase{
		callbackRepo: callbackRepo,
		convRepo:     convRepo,
		msgRepo:      msgRepo,
		spamRepo:     spamRepo,
		docRepo:      docRepo,
		docShareRepo: docShareRepo,
		policy:       policy,
		log:          log,
	}
}

// CreateCallbackRequest creates a new callback request after policy check.
func (uc *CommunicationUseCase) CreateCallbackRequest(ctx context.Context, req *entity.CallbackRequest) (*entity.CallbackRequest, error) {
	ctx, span := tracing.StartSpan(ctx, "communication-service", "CreateCallbackRequest",
		attribute.String("user_id", req.UserID),
		attribute.String("org_id", req.OrganizationID),
	)
	defer span.End()

	// Check policy
	allowed, reason, err := uc.policy.EvaluateCallbackPermission(ctx, req.UserID, req.OrganizationID)
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

// CreateConversation creates a new conversation.
func (uc *CommunicationUseCase) CreateConversation(ctx context.Context, conv *entity.Conversation) (*entity.Conversation, error) {
ctx, span := tracing.StartSpan(ctx, "communication-service", "CreateConversation",
attribute.String("user_id", conv.UserID),
attribute.String("org_id", conv.OrganizationID),
)
defer span.End()

conv.ID = uuid.New().String()
conv.Status = "OPEN"
conv.CreatedAt = time.Now()
conv.UpdatedAt = time.Now()

if err := uc.convRepo.Create(ctx, conv); err != nil {
return nil, bzerr.Internal("failed to create conversation", err)
}
return conv, nil
}

// GetConversation retrieves a conversation by ID.
func (uc *CommunicationUseCase) GetConversation(ctx context.Context, id, userID string) (*entity.Conversation, error) {
conv, err := uc.convRepo.GetByID(ctx, id)
if err != nil {
return nil, bzerr.NotFound("conversation", id)
}
if conv.UserID != userID {
return nil, bzerr.Forbidden("not authorized to access this conversation")
}
return conv, nil
}

// GetCallbackRequest retrieves a callback request by ID.
func (uc *CommunicationUseCase) GetCallbackRequest(ctx context.Context, id, userID string) (*entity.CallbackRequest, error) {
req, err := uc.callbackRepo.GetByID(ctx, id)
if err != nil {
return nil, bzerr.NotFound("callback_request", id)
}
if req.UserID != userID {
return nil, bzerr.Forbidden("not authorized to access this callback request")
}
return req, nil
}

// ListMessages lists messages for a conversation.
func (uc *CommunicationUseCase) ListMessages(ctx context.Context, convID string, limit, offset int) ([]entity.Message, int, error) {
return uc.msgRepo.ListByConversation(ctx, convID, limit, offset)
}

// CloseConversation closes a conversation.
func (uc *CommunicationUseCase) CloseConversation(ctx context.Context, id, userID string) error {
conv, err := uc.convRepo.GetByID(ctx, id)
if err != nil {
return bzerr.NotFound("conversation", id)
}
if conv.UserID != userID {
return bzerr.Forbidden("not authorized to close this conversation")
}
return uc.convRepo.Close(ctx, id)
}

// ShareDocument creates a document share record.
func (uc *CommunicationUseCase) ShareDocument(ctx context.Context, share *entity.DocumentShare) (*entity.DocumentShare, error) {
share.ID = uuid.New().String()
share.CreatedAt = time.Now()
if err := uc.docShareRepo.Create(ctx, share); err != nil {
return nil, bzerr.Internal("failed to share document", err)
}
return share, nil
}

// ListDocumentShares lists document shares for a user.
func (uc *CommunicationUseCase) ListDocumentShares(ctx context.Context, userID string, limit, offset int) ([]entity.DocumentShare, int, error) {
return uc.docShareRepo.ListByUser(ctx, userID, limit, offset)
}
