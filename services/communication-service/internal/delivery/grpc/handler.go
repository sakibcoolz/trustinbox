package grpc

import (
	"context"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/communication/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CommunicationHandler implements the CommunicationService gRPC server.
type CommunicationHandler struct {
	pb.UnimplementedCommunicationServiceServer
	uc *usecase.CommunicationUseCase
}

// NewCommunicationHandler creates a new CommunicationHandler.
func NewCommunicationHandler(uc *usecase.CommunicationUseCase) *CommunicationHandler {
	return &CommunicationHandler{uc: uc}
}

func (h *CommunicationHandler) CreateCallbackRequest(ctx context.Context, req *pb.CreateCallbackRequestRequest) (*pb.CreateCallbackRequestResponse, error) {
	result, err := h.uc.CreateCallbackRequest(ctx, &entity.CallbackRequest{
		UserID:            req.UserId,
		ServiceProviderID: req.ServiceProviderId,
		RequestedBySPUser: req.RequestedBySpUserId,
		Reason:            req.Reason,
		Details:           req.Details,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CreateCallbackRequestResponse{
		CallbackRequestId: result.ID,
		Status:            result.Status,
	}, nil
}

func (h *CommunicationHandler) ApproveCallbackRequest(ctx context.Context, req *pb.ApproveCallbackRequestRequest) (*pb.ApproveCallbackRequestResponse, error) {
	err := h.uc.ApproveCallbackRequest(ctx, req.CallbackRequestId, req.UserId,
		req.ApprovedSlotStart.AsTime(), req.ApprovedSlotEnd.AsTime(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ApproveCallbackRequestResponse{Success: true}, nil
}

func (h *CommunicationHandler) RejectCallbackRequest(ctx context.Context, req *pb.RejectCallbackRequestRequest) (*pb.RejectCallbackRequestResponse, error) {
	err := h.uc.RejectCallbackRequest(ctx, req.CallbackRequestId, req.UserId, req.Reason)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RejectCallbackRequestResponse{Success: true}, nil
}

func (h *CommunicationHandler) ListCallbackRequests(ctx context.Context, req *pb.ListCallbackRequestsRequest) (*pb.ListCallbackRequestsResponse, error) {
	requests, total, err := h.uc.ListCallbackRequests(ctx, req.UserId, req.Status, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbReqs := make([]*pb.CallbackRequest, len(requests))
	for i, r := range requests {
		cbReq := &pb.CallbackRequest{
			Id:                  r.ID,
			UserId:              r.UserID,
			ServiceProviderId:   r.ServiceProviderID,
			RequestedBySpUserId: r.RequestedBySPUser,
			Reason:              r.Reason,
			Details:             r.Details,
			Status:              r.Status,
			RequestedAt:         timestamppb.New(r.RequestedAt),
		}
		if r.RespondedAt != nil {
			cbReq.RespondedAt = timestamppb.New(*r.RespondedAt)
		}
		if r.ApprovedSlotStart != nil {
			cbReq.ApprovedSlotStart = timestamppb.New(*r.ApprovedSlotStart)
		}
		if r.ApprovedSlotEnd != nil {
			cbReq.ApprovedSlotEnd = timestamppb.New(*r.ApprovedSlotEnd)
		}
		pbReqs[i] = cbReq
	}
	return &pb.ListCallbackRequestsResponse{
		Requests: pbReqs,
		Total:    int32(total),
	}, nil
}

func (h *CommunicationHandler) GetCallbackRequest(ctx context.Context, req *pb.GetCallbackRequestRequest) (*pb.CallbackRequest, error) {
	r, err := h.uc.GetCallbackRequest(ctx, req.CallbackRequestId)
	if err != nil {
		return nil, mapError(err)
	}
	cbReq := &pb.CallbackRequest{
		Id:                  r.ID,
		UserId:              r.UserID,
		ServiceProviderId:   r.ServiceProviderID,
		RequestedBySpUserId: r.RequestedBySPUser,
		Reason:              r.Reason,
		Details:             r.Details,
		Status:              r.Status,
		RequestedAt:         timestamppb.New(r.RequestedAt),
	}
	if r.RespondedAt != nil {
		cbReq.RespondedAt = timestamppb.New(*r.RespondedAt)
	}
	if r.ApprovedSlotStart != nil {
		cbReq.ApprovedSlotStart = timestamppb.New(*r.ApprovedSlotStart)
	}
	if r.ApprovedSlotEnd != nil {
		cbReq.ApprovedSlotEnd = timestamppb.New(*r.ApprovedSlotEnd)
	}
	return cbReq, nil
}

func (h *CommunicationHandler) CreateConversation(ctx context.Context, req *pb.CreateConversationRequest) (*pb.Conversation, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) GetConversation(ctx context.Context, req *pb.GetConversationRequest) (*pb.Conversation, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) ListConversations(ctx context.Context, req *pb.ListConversationsRequest) (*pb.ListConversationsResponse, error) {
	conversations, total, err := h.uc.ListConversations(ctx, req.UserId, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbConvos := make([]*pb.Conversation, len(conversations))
	for i, c := range conversations {
		pbConvos[i] = &pb.Conversation{
			Id:                c.ID,
			UserId:            c.UserID,
			ServiceProviderId: c.ServiceProviderID,
			Status:            c.Status,
			CreatedAt:         timestamppb.New(c.CreatedAt),
			UpdatedAt:         timestamppb.New(c.UpdatedAt),
		}
	}
	return &pb.ListConversationsResponse{
		Conversations: pbConvos,
		Total:         int32(total),
	}, nil
}

func (h *CommunicationHandler) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.Message, error) {
	msg, err := h.uc.SendMessage(ctx, &entity.Message{
		ConversationID: req.ConversationId,
		SenderType:     req.SenderType,
		SenderRefID:    req.SenderRefId,
		MessageType:    req.MessageType,
		Content:        req.Content,
		Metadata:       req.Metadata,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.Message{
		Id:             msg.ID,
		ConversationId: msg.ConversationID,
		SenderType:     msg.SenderType,
		SenderRefId:    msg.SenderRefID,
		MessageType:    msg.MessageType,
		Content:        msg.Content,
		Metadata:       msg.Metadata,
		CreatedAt:      timestamppb.New(msg.CreatedAt),
	}, nil
}

func (h *CommunicationHandler) ListMessages(ctx context.Context, req *pb.ListMessagesRequest) (*pb.ListMessagesResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) CloseConversation(ctx context.Context, req *pb.CloseConversationRequest) (*pb.CloseConversationResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) ShareDocument(ctx context.Context, req *pb.ShareDocumentRequest) (*pb.ShareDocumentResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) ListDocumentShares(ctx context.Context, req *pb.ListDocumentSharesRequest) (*pb.ListDocumentSharesResponse, error) {
	shares, total, err := h.uc.ListDocumentShares(ctx, req.UserId, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbShares := make([]*pb.DocumentShare, len(shares))
	for i, s := range shares {
		ds := &pb.DocumentShare{
			Id:                s.ID,
			DocumentId:        s.DocumentID,
			UserId:            s.UserID,
			ServiceProviderId: s.ServiceProviderID,
			ShareContext:      s.ShareContext,
			FileName:          s.FileName,
			FileType:          s.FileType,
			CreatedAt:         timestamppb.New(s.CreatedAt),
		}
		if s.OpenedAt != nil {
			ds.OpenedAt = timestamppb.New(*s.OpenedAt)
		}
		pbShares[i] = ds
	}
	return &pb.ListDocumentSharesResponse{Shares: pbShares, Total: int32(total)}, nil
}

func (h *CommunicationHandler) ReportSpam(ctx context.Context, req *pb.ReportSpamRequest) (*pb.ReportSpamResponse, error) {
	err := h.uc.ReportSpam(ctx, &entity.SpamReport{
		UserID:            req.UserId,
		ServiceProviderID: req.OrganizationId,
		NotificationID:    req.NotificationId,
		CallbackRequestID: req.CallbackRequestId,
		Reason:            req.Reason,
		Details:           req.Details,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ReportSpamResponse{Success: true}, nil
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
	case bizerr.IsPolicyDenied(err):
		return status.Errorf(codes.PermissionDenied, err.Error())
	default:
		return status.Errorf(codes.Internal, err.Error())
	}
}
