package grpc

import (
	"context"
	"strings"

	commv1 "github.com/trustinbox/proto/gen/communication/v1"
	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/usecase"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CommGRPCHandler implements the gRPC CommunicationService server.
type CommGRPCHandler struct {
	commv1.UnimplementedCommunicationServiceServer
	uc  *usecase.CommunicationUseCase
	log *zap.Logger
}

// NewCommGRPCHandler creates a new CommGRPCHandler.
func NewCommGRPCHandler(uc *usecase.CommunicationUseCase, log *zap.Logger) *CommGRPCHandler {
	return &CommGRPCHandler{uc: uc, log: log}
}

// CreateCallbackRequest handles the CreateCallbackRequest RPC.
func (h *CommGRPCHandler) CreateCallbackRequest(ctx context.Context, req *commv1.CreateCallbackRequestRequest) (*commv1.CreateCallbackRequestResponse, error) {
	cb, err := h.uc.CreateCallbackRequest(ctx, &entity.CallbackRequest{
		UserID:             req.GetUserId(),
		OrganizationID:     req.GetOrganizationId(),
		RequestedByOrgUser: req.GetRequestedByOrgUserId(),
		Reason:             req.GetReason(),
		Details:            req.GetDetails(),
	})
	if err != nil {
		h.log.Error("CreateCallbackRequest failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.CreateCallbackRequestResponse{
		CallbackRequestId: cb.ID,
		Status:            cb.Status,
	}, nil
}

// ApproveCallbackRequest handles the ApproveCallbackRequest RPC.
func (h *CommGRPCHandler) ApproveCallbackRequest(ctx context.Context, req *commv1.ApproveCallbackRequestRequest) (*commv1.ApproveCallbackRequestResponse, error) {
	if err := h.uc.ApproveCallbackRequest(ctx,
		req.GetCallbackRequestId(),
		req.GetUserId(),
		req.GetApprovedSlotStart().AsTime(),
		req.GetApprovedSlotEnd().AsTime(),
	); err != nil {
		h.log.Error("ApproveCallbackRequest failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.ApproveCallbackRequestResponse{Success: true}, nil
}

// RejectCallbackRequest handles the RejectCallbackRequest RPC.
func (h *CommGRPCHandler) RejectCallbackRequest(ctx context.Context, req *commv1.RejectCallbackRequestRequest) (*commv1.RejectCallbackRequestResponse, error) {
	if err := h.uc.RejectCallbackRequest(ctx,
		req.GetCallbackRequestId(),
		req.GetUserId(),
		req.GetReason(),
	); err != nil {
		h.log.Error("RejectCallbackRequest failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.RejectCallbackRequestResponse{Success: true}, nil
}

// ListCallbackRequests handles the ListCallbackRequests RPC.
func (h *CommGRPCHandler) ListCallbackRequests(ctx context.Context, req *commv1.ListCallbackRequestsRequest) (*commv1.ListCallbackRequestsResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	requests, total, err := h.uc.ListCallbackRequests(ctx, req.GetUserId(), req.GetStatus(), limit, int(req.GetOffset()))
	if err != nil {
		h.log.Error("ListCallbackRequests failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to list callback requests")
	}
	protoReqs := make([]*commv1.CallbackRequest, 0, len(requests))
	for i := range requests {
		protoReqs = append(protoReqs, callbackToProto(&requests[i]))
	}
	return &commv1.ListCallbackRequestsResponse{
		Requests: protoReqs,
		Total:    int32(total),
	}, nil
}

// GetCallbackRequest handles the GetCallbackRequest RPC.
func (h *CommGRPCHandler) GetCallbackRequest(ctx context.Context, req *commv1.GetCallbackRequestRequest) (*commv1.CallbackRequest, error) {
	cb, err := h.uc.GetCallbackRequest(ctx, req.GetCallbackRequestId(), req.GetUserId())
	if err != nil {
		h.log.Error("GetCallbackRequest failed", zap.Error(err))
		return nil, mapError(err)
	}
	return callbackToProto(cb), nil
}

// CreateConversation handles the CreateConversation RPC.
func (h *CommGRPCHandler) CreateConversation(ctx context.Context, req *commv1.CreateConversationRequest) (*commv1.Conversation, error) {
	conv, err := h.uc.CreateConversation(ctx, &entity.Conversation{
		UserID:         req.GetUserId(),
		OrganizationID: req.GetOrganizationId(),
	})
	if err != nil {
		h.log.Error("CreateConversation failed", zap.Error(err))
		return nil, mapError(err)
	}
	return conversationToProto(conv), nil
}

// GetConversation handles the GetConversation RPC.
func (h *CommGRPCHandler) GetConversation(ctx context.Context, req *commv1.GetConversationRequest) (*commv1.Conversation, error) {
	conv, err := h.uc.GetConversation(ctx, req.GetConversationId(), req.GetUserId())
	if err != nil {
		h.log.Error("GetConversation failed", zap.Error(err))
		return nil, mapError(err)
	}
	return conversationToProto(conv), nil
}

// ListConversations handles the ListConversations RPC.
func (h *CommGRPCHandler) ListConversations(ctx context.Context, req *commv1.ListConversationsRequest) (*commv1.ListConversationsResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	convs, total, err := h.uc.ListConversations(ctx, req.GetUserId(), limit, int(req.GetOffset()))
	if err != nil {
		h.log.Error("ListConversations failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to list conversations")
	}
	protoConvs := make([]*commv1.Conversation, 0, len(convs))
	for i := range convs {
		protoConvs = append(protoConvs, conversationToProto(&convs[i]))
	}
	return &commv1.ListConversationsResponse{
		Conversations: protoConvs,
		Total:         int32(total),
	}, nil
}

// SendMessage handles the SendMessage RPC.
func (h *CommGRPCHandler) SendMessage(ctx context.Context, req *commv1.SendMessageRequest) (*commv1.Message, error) {
	msg, err := h.uc.SendMessage(ctx, &entity.Message{
		ConversationID: req.GetConversationId(),
		SenderType:     req.GetSenderType(),
		SenderRefID:    req.GetSenderRefId(),
		MessageType:    req.GetMessageType(),
		Content:        req.GetContent(),
		Metadata:       req.GetMetadata(),
	})
	if err != nil {
		h.log.Error("SendMessage failed", zap.Error(err))
		return nil, mapError(err)
	}
	return messageToProto(msg), nil
}

// ListMessages handles the ListMessages RPC.
func (h *CommGRPCHandler) ListMessages(ctx context.Context, req *commv1.ListMessagesRequest) (*commv1.ListMessagesResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 50
	}
	msgs, total, err := h.uc.ListMessages(ctx, req.GetConversationId(), limit, int(req.GetOffset()))
	if err != nil {
		h.log.Error("ListMessages failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to list messages")
	}
	protoMsgs := make([]*commv1.Message, 0, len(msgs))
	for i := range msgs {
		protoMsgs = append(protoMsgs, messageToProto(&msgs[i]))
	}
	return &commv1.ListMessagesResponse{
		Messages: protoMsgs,
		Total:    int32(total),
	}, nil
}

// CloseConversation handles the CloseConversation RPC.
func (h *CommGRPCHandler) CloseConversation(ctx context.Context, req *commv1.CloseConversationRequest) (*commv1.CloseConversationResponse, error) {
	if err := h.uc.CloseConversation(ctx, req.GetConversationId(), req.GetUserId()); err != nil {
		h.log.Error("CloseConversation failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.CloseConversationResponse{Success: true}, nil
}

// ShareDocument handles the ShareDocument RPC.
func (h *CommGRPCHandler) ShareDocument(ctx context.Context, req *commv1.ShareDocumentRequest) (*commv1.ShareDocumentResponse, error) {
	share, err := h.uc.ShareDocument(ctx, &entity.DocumentShare{
		DocumentID:     req.GetDocumentId(),
		UserID:         req.GetUserId(),
		OrganizationID: req.GetOrganizationId(),
		ShareContext:   req.GetShareContext(),
	})
	if err != nil {
		h.log.Error("ShareDocument failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.ShareDocumentResponse{
		DocumentShareId: share.ID,
		Success:         true,
	}, nil
}

// ListDocumentShares handles the ListDocumentShares RPC.
func (h *CommGRPCHandler) ListDocumentShares(ctx context.Context, req *commv1.ListDocumentSharesRequest) (*commv1.ListDocumentSharesResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	shares, total, err := h.uc.ListDocumentShares(ctx, req.GetUserId(), limit, int(req.GetOffset()))
	if err != nil {
		h.log.Error("ListDocumentShares failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to list document shares")
	}
	protoShares := make([]*commv1.DocumentShare, 0, len(shares))
	for i := range shares {
		protoShares = append(protoShares, documentShareToProto(&shares[i]))
	}
	return &commv1.ListDocumentSharesResponse{
		Shares: protoShares,
		Total:  int32(total),
	}, nil
}

// ReportSpam handles the ReportSpam RPC.
func (h *CommGRPCHandler) ReportSpam(ctx context.Context, req *commv1.ReportSpamRequest) (*commv1.ReportSpamResponse, error) {
	report := &entity.SpamReport{
		UserID:            req.GetUserId(),
		OrganizationID:    req.GetOrganizationId(),
		NotificationID:    req.GetNotificationId(),
		CallbackRequestID: req.GetCallbackRequestId(),
		Reason:            req.GetReason(),
		Details:           req.GetDetails(),
	}
	if err := h.uc.ReportSpam(ctx, report); err != nil {
		h.log.Error("ReportSpam failed", zap.Error(err))
		return nil, mapError(err)
	}
	return &commv1.ReportSpamResponse{
		ReportId: report.ID,
		Success:  true,
	}, nil
}

// --- entity ↔ proto helpers ---

func callbackToProto(cb *entity.CallbackRequest) *commv1.CallbackRequest {
	proto := &commv1.CallbackRequest{
		Id:                   cb.ID,
		UserId:               cb.UserID,
		OrganizationId:       cb.OrganizationID,
		RequestedByOrgUserId: cb.RequestedByOrgUser,
		Reason:               cb.Reason,
		Details:              cb.Details,
		Status:               cb.Status,
		RequestedAt:          timestamppb.New(cb.RequestedAt),
	}
	if cb.RespondedAt != nil {
		proto.RespondedAt = timestamppb.New(*cb.RespondedAt)
	}
	if cb.ApprovedSlotStart != nil {
		proto.ApprovedSlotStart = timestamppb.New(*cb.ApprovedSlotStart)
	}
	if cb.ApprovedSlotEnd != nil {
		proto.ApprovedSlotEnd = timestamppb.New(*cb.ApprovedSlotEnd)
	}
	return proto
}

func conversationToProto(conv *entity.Conversation) *commv1.Conversation {
	return &commv1.Conversation{
		Id:             conv.ID,
		UserId:         conv.UserID,
		OrganizationId: conv.OrganizationID,
		Status:         conv.Status,
		CreatedAt:      timestamppb.New(conv.CreatedAt),
		UpdatedAt:      timestamppb.New(conv.UpdatedAt),
	}
}

func messageToProto(msg *entity.Message) *commv1.Message {
	return &commv1.Message{
		Id:             msg.ID,
		ConversationId: msg.ConversationID,
		SenderType:     msg.SenderType,
		SenderRefId:    msg.SenderRefID,
		MessageType:    msg.MessageType,
		Content:        msg.Content,
		Metadata:       msg.Metadata,
		CreatedAt:      timestamppb.New(msg.CreatedAt),
	}
}

func documentShareToProto(ds *entity.DocumentShare) *commv1.DocumentShare {
	proto := &commv1.DocumentShare{
		Id:             ds.ID,
		DocumentId:     ds.DocumentID,
		UserId:         ds.UserID,
		OrganizationId: ds.OrganizationID,
		ShareContext:   ds.ShareContext,
		CreatedAt:      timestamppb.New(ds.CreatedAt),
	}
	if ds.OpenedAt != nil {
		proto.OpenedAt = timestamppb.New(*ds.OpenedAt)
	}
	return proto
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "NOT_FOUND") || strings.Contains(msg, "not found"):
		return status.Error(codes.NotFound, msg)
	case strings.Contains(msg, "FORBIDDEN") || strings.Contains(msg, "not authorized"):
		return status.Error(codes.PermissionDenied, msg)
	case strings.Contains(msg, "INVALID_INPUT"):
		return status.Error(codes.InvalidArgument, msg)
	case strings.Contains(msg, "POLICY_DENIED"):
		return status.Error(codes.PermissionDenied, msg)
	default:
		return status.Error(codes.Internal, msg)
	}
}
