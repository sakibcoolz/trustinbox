package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/notification-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/notification/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// NotificationHandler implements the NotificationService gRPC server.
type NotificationHandler struct {
	pb.UnimplementedNotificationServiceServer
	uc *usecase.NotificationUseCase
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(uc *usecase.NotificationUseCase) *NotificationHandler {
	return &NotificationHandler{uc: uc}
}

func (h *NotificationHandler) CreateNotification(ctx context.Context, req *pb.CreateNotificationRequest) (*pb.CreateNotificationResponse, error) {
	result, err := h.uc.CreateNotification(ctx, req.UserId, req.OrganizationId, req.Category, req.Title, req.Body, req.Priority, req.Metadata)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CreateNotificationResponse{
		NotificationId:  result.NotificationID,
		Status:          result.Status,
		RejectionReason: result.RejectionReason,
	}, nil
}

func (h *NotificationHandler) GetNotification(ctx context.Context, req *pb.GetNotificationRequest) (*pb.Notification, error) {
	// TODO: implement get notification
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *NotificationHandler) ListNotifications(ctx context.Context, req *pb.ListNotificationsRequest) (*pb.ListNotificationsResponse, error) {
	notifs, total, err := h.uc.ListNotifications(ctx, req.UserId, req.Category, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbNotifs := make([]*pb.Notification, len(notifs))
	for i, n := range notifs {
		pbNotif := &pb.Notification{
			Id:             n.ID,
			UserId:         n.UserID,
			OrganizationId: n.OrganizationID,
			Category:       n.Category,
			Title:          n.Title,
			Body:           n.Body,
			Priority:       n.Priority,
			Status:         n.Status,
			Metadata:       n.Metadata,
			CreatedAt:      timestamppb.New(n.CreatedAt),
		}
		if n.ReadAt != nil {
			pbNotif.ReadAt = timestamppb.New(*n.ReadAt)
		}
		pbNotifs[i] = pbNotif
	}
	return &pb.ListNotificationsResponse{
		Notifications: pbNotifs,
		Total:         int32(total),
	}, nil
}

func (h *NotificationHandler) MarkAsRead(ctx context.Context, req *pb.MarkAsReadRequest) (*pb.MarkAsReadResponse, error) {
	err := h.uc.MarkAsRead(ctx, req.NotificationId, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.MarkAsReadResponse{Success: true}, nil
}

func (h *NotificationHandler) ArchiveNotification(ctx context.Context, req *pb.ArchiveNotificationRequest) (*pb.ArchiveNotificationResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *NotificationHandler) GetDeliveryStatus(ctx context.Context, req *pb.GetDeliveryStatusRequest) (*pb.GetDeliveryStatusResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
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
