package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/communication-service/internal/usecase"
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
	result, err := h.uc.CreateCallbackRequest(ctx, req.UserId, req.OrganizationId, req.RequestedByOrgUserId, req.Reason, req.Details)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CreateCallbackRequestResponse{
		CallbackRequestId: result.ID,
		Status:            result.Status,
		RejectionReason:   result.RejectionReason,
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
			Id:                    r.ID,
			UserId:                r.UserID,
			OrganizationId:        r.OrganizationID,
			RequestedByOrgUserId:  r.RequestedByOrgUserID,
			Reason:                r.Reason,
			Details:               r.Details,
			Status:                r.Status,
			RequestedAt:           timestamppb.New(r.RequestedAt),
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
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
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
			Id:             c.ID,
			UserId:         c.UserID,
			OrganizationId: c.OrganizationID,
			Status:         c.Status,
			CreatedAt:      timestamppb.New(c.CreatedAt),
		}
	}
	return &pb.ListConversationsResponse{
		Conversations: pbConvos,
		Total:         int32(total),
	}, nil
}

func (h *CommunicationHandler) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.Message, error) {
	msg, err := h.uc.SendMessage(ctx, req.ConversationId, req.SenderId, req.Body, req.MessageType)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.Message{
		Id:             msg.ID,
		ConversationId: msg.ConversationID,
		SenderId:       msg.SenderID,
		Body:           msg.Body,
		MessageType:    msg.MessageType,
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
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *CommunicationHandler) ReportSpam(ctx context.Context, req *pb.ReportSpamRequest) (*pb.ReportSpamResponse, error) {
	err := h.uc.ReportSpam(ctx, req.ReportedBy, req.ConversationId, req.Reason)
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
	default:
		return status.Errorf(codes.Internal, err.Error())
	}
}
