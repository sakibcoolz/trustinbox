package grpc

import (
	"context"

	notifv1 "github.com/trustinbox/proto/gen/notification/v1"
	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/usecase"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// NotificationGRPCHandler implements the gRPC NotificationService server.
type NotificationGRPCHandler struct {
	notifv1.UnimplementedNotificationServiceServer
	uc  *usecase.NotificationUseCase
	log *zap.Logger
}

// NewNotificationGRPCHandler creates a new NotificationGRPCHandler.
func NewNotificationGRPCHandler(uc *usecase.NotificationUseCase, log *zap.Logger) *NotificationGRPCHandler {
	return &NotificationGRPCHandler{uc: uc, log: log}
}

// CreateNotification handles the CreateNotification RPC.
func (h *NotificationGRPCHandler) CreateNotification(ctx context.Context, req *notifv1.CreateNotificationRequest) (*notifv1.CreateNotificationResponse, error) {
	result, err := h.uc.CreateNotification(ctx, usecase.CreateNotificationInput{
		UserID:         req.GetUserId(),
		OrganizationID: req.GetOrganizationId(),
		Category:       req.GetCategory(),
		Title:          req.GetTitle(),
		Body:           req.GetBody(),
		Priority:       req.GetPriority(),
		Metadata:       req.GetMetadata(),
	})
	if err != nil {
		h.log.Error("CreateNotification failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to create notification")
	}

	return &notifv1.CreateNotificationResponse{
		NotificationId:  result.NotificationID,
		Status:          result.Status,
		RejectionReason: result.RejectionReason,
	}, nil
}

// GetNotification handles the GetNotification RPC.
func (h *NotificationGRPCHandler) GetNotification(ctx context.Context, req *notifv1.GetNotificationRequest) (*notifv1.Notification, error) {
	notif, err := h.uc.GetNotification(ctx, req.GetNotificationId(), req.GetUserId())
	if err != nil {
		h.log.Error("GetNotification failed", zap.Error(err))
		return nil, status.Error(codes.NotFound, "notification not found")
	}
	return entityToProto(notif), nil
}

// ListNotifications handles the ListNotifications RPC.
func (h *NotificationGRPCHandler) ListNotifications(ctx context.Context, req *notifv1.ListNotificationsRequest) (*notifv1.ListNotificationsResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	offset := int(req.GetOffset())

	notifications, total, err := h.uc.ListNotifications(ctx, req.GetUserId(), req.GetCategory(), req.GetStatus(), limit, offset)
	if err != nil {
		h.log.Error("ListNotifications failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to list notifications")
	}

	protoNotifs := make([]*notifv1.Notification, 0, len(notifications))
	for i := range notifications {
		protoNotifs = append(protoNotifs, entityToProto(&notifications[i]))
	}

	return &notifv1.ListNotificationsResponse{
		Notifications: protoNotifs,
		Total:         int32(total),
	}, nil
}

// MarkAsRead handles the MarkAsRead RPC.
func (h *NotificationGRPCHandler) MarkAsRead(ctx context.Context, req *notifv1.MarkAsReadRequest) (*notifv1.MarkAsReadResponse, error) {
	if err := h.uc.MarkAsRead(ctx, req.GetNotificationId(), req.GetUserId()); err != nil {
		h.log.Error("MarkAsRead failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to mark notification as read")
	}
	return &notifv1.MarkAsReadResponse{Success: true}, nil
}

// ArchiveNotification handles the ArchiveNotification RPC.
func (h *NotificationGRPCHandler) ArchiveNotification(ctx context.Context, req *notifv1.ArchiveNotificationRequest) (*notifv1.ArchiveNotificationResponse, error) {
	if err := h.uc.ArchiveNotification(ctx, req.GetNotificationId(), req.GetUserId()); err != nil {
		h.log.Error("ArchiveNotification failed", zap.Error(err))
		return nil, status.Error(codes.Internal, "failed to archive notification")
	}
	return &notifv1.ArchiveNotificationResponse{Success: true}, nil
}

// GetDeliveryStatus handles the GetDeliveryStatus RPC.
func (h *NotificationGRPCHandler) GetDeliveryStatus(ctx context.Context, req *notifv1.GetDeliveryStatusRequest) (*notifv1.GetDeliveryStatusResponse, error) {
	delivery, err := h.uc.GetDeliveryStatus(ctx, req.GetNotificationId())
	if err != nil {
		h.log.Error("GetDeliveryStatus failed", zap.Error(err))
		return nil, status.Error(codes.NotFound, "delivery record not found")
	}

	resp := &notifv1.GetDeliveryStatusResponse{
		NotificationId: req.GetNotificationId(),
		DeliveryStatus: delivery.DeliveryStatus,
		FailureReason:  delivery.FailureReason,
	}
	if delivery.DeliveredAt != nil {
		resp.DeliveredAt = timestamppb.New(*delivery.DeliveredAt)
	}
	return resp, nil
}

func entityToProto(n *entity.Notification) *notifv1.Notification {
	proto := &notifv1.Notification{
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
	return proto
}
