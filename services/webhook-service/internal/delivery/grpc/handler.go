package grpc

import (
	"context"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/webhook/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// WebhookHandler implements the WebhookServiceServer gRPC interface.
type WebhookHandler struct {
	pb.UnimplementedWebhookServiceServer
	uc *usecase.WebhookUseCase
}

// NewWebhookHandler creates a new WebhookHandler.
func NewWebhookHandler(uc *usecase.WebhookUseCase) *WebhookHandler {
	return &WebhookHandler{uc: uc}
}

func (h *WebhookHandler) CreateSubscription(ctx context.Context, req *pb.CreateSubscriptionRequest) (*pb.WebhookSubscription, error) {
	sub, _, err := h.uc.CreateSubscription(ctx,
		req.GetServiceProviderId(), req.GetUrl(),
		req.GetDescription(), req.GetEvents(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return subscriptionToProto(sub), nil
}

func (h *WebhookHandler) GetSubscription(ctx context.Context, req *pb.GetSubscriptionRequest) (*pb.WebhookSubscription, error) {
	sub, err := h.uc.GetSubscription(ctx, req.GetSubscriptionId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return subscriptionToProto(sub), nil
}

func (h *WebhookHandler) UpdateSubscription(ctx context.Context, req *pb.UpdateSubscriptionRequest) (*pb.WebhookSubscription, error) {
	sub, err := h.uc.UpdateSubscription(ctx,
		req.GetSubscriptionId(), req.GetServiceProviderId(),
		req.GetUrl(), req.GetDescription(), req.GetStatus(),
		req.GetEvents(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return subscriptionToProto(sub), nil
}

func (h *WebhookHandler) DeleteSubscription(ctx context.Context, req *pb.DeleteSubscriptionRequest) (*pb.DeleteSubscriptionResponse, error) {
	if err := h.uc.DeleteSubscription(ctx, req.GetSubscriptionId(), req.GetServiceProviderId()); err != nil {
		return nil, mapError(err)
	}
	return &pb.DeleteSubscriptionResponse{Success: true}, nil
}

func (h *WebhookHandler) ListSubscriptions(ctx context.Context, req *pb.ListSubscriptionsRequest) (*pb.ListSubscriptionsResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	subs, total, err := h.uc.ListSubscriptions(ctx,
		req.GetServiceProviderId(), limit, int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbSubs := make([]*pb.WebhookSubscription, len(subs))
	for i, s := range subs {
		pbSubs[i] = subscriptionToProto(s)
	}
	return &pb.ListSubscriptionsResponse{Subscriptions: pbSubs, Total: int32(total)}, nil
}

func (h *WebhookHandler) TestSubscription(ctx context.Context, req *pb.TestSubscriptionRequest) (*pb.TestSubscriptionResponse, error) {
	result, err := h.uc.TestSubscription(ctx, req.GetSubscriptionId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.TestSubscriptionResponse{
		Success:        result.Success,
		ResponseStatus: int32(result.ResponseStatus),
		ResponseBody:   result.ResponseBody,
		DurationMs:     int32(result.DurationMs),
	}, nil
}

func (h *WebhookHandler) ListDeliveries(ctx context.Context, req *pb.ListDeliveriesRequest) (*pb.ListDeliveriesResponse, error) {
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 20
	}
	deliveries, total, err := h.uc.ListDeliveries(ctx,
		req.GetSubscriptionId(), limit, int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbDeliveries := make([]*pb.WebhookDelivery, len(deliveries))
	for i, d := range deliveries {
		pbDeliveries[i] = deliveryToProto(d)
	}
	return &pb.ListDeliveriesResponse{Deliveries: pbDeliveries, Total: int32(total)}, nil
}

func (h *WebhookHandler) RetryDelivery(ctx context.Context, req *pb.RetryDeliveryRequest) (*pb.RetryDeliveryResponse, error) {
	_, err := h.uc.RetryDelivery(ctx, req.GetDeliveryId())
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RetryDeliveryResponse{Success: true}, nil
}

// --- Proto mapping helpers ---

func subscriptionToProto(s *entity.WebhookSubscription) *pb.WebhookSubscription {
	return &pb.WebhookSubscription{
		Id:                s.ID,
		ServiceProviderId: s.ServiceProviderID,
		Url:               s.URL,
		Description:       s.Description,
		Events:            s.Events,
		Status:            string(s.Status),
		CreatedAt:         timestamppb.New(s.CreatedAt),
		UpdatedAt:         timestamppb.New(s.UpdatedAt),
	}
}

func deliveryToProto(d *entity.WebhookDelivery) *pb.WebhookDelivery {
	proto := &pb.WebhookDelivery{
		Id:             d.ID,
		SubscriptionId: d.SubscriptionID,
		EventType:      d.EventType,
		ResponseStatus: int32(d.ResponseStatus),
		AttemptCount:   int32(d.Attempts),
		Status:         string(d.Status),
		CreatedAt:      timestamppb.New(d.CreatedAt),
	}
	if d.DeliveredAt != nil {
		proto.CompletedAt = timestamppb.New(*d.DeliveredAt)
	}
	return proto
}

// --- Error mapping ---

func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Error(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Error(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Error(codes.PermissionDenied, err.Error())
	case bizerr.IsPolicyDenied(err):
		return status.Error(codes.PermissionDenied, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}
