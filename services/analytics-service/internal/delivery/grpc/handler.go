package grpc

import (
	"context"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
	"github.com/trustinbox/analytics-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/analytics/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type AnalyticsHandler struct {
	pb.UnimplementedAnalyticsServiceServer
	uc *usecase.AnalyticsUseCase
}

func NewAnalyticsHandler(uc *usecase.AnalyticsUseCase) *AnalyticsHandler {
	return &AnalyticsHandler{uc: uc}
}

func (h *AnalyticsHandler) GetDashboardStats(ctx context.Context, req *pb.GetDashboardStatsRequest) (*pb.DashboardStats, error) {
	stats, err := h.uc.GetDashboardStats(ctx, req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.DashboardStats{
		NotificationsSent:      stats.TotalNotificationsSent,
		NotificationsDelivered: stats.NotificationsDelivered,
		NotificationsRejected:  stats.NotificationsFailed,
		CallbacksRequested:     stats.TotalCallbackRequests,
		CallbacksApproved:      stats.CallbacksApproved,
		CallbacksRejected:      stats.CallbacksDenied,
		CampaignsLaunched:      stats.TotalCampaignsSent,
		BotActions:             stats.BotActionsExecuted,
		BotEscalations:         stats.BotEscalations,
		PolicyDenials:          stats.PolicyDenials,
		WebhookDeliveries:      stats.WebhookDeliveries,
		WebhookFailures:        stats.WebhookFailures,
		DeliveryRate:           stats.CustomerSatisfaction,
	}, nil
}

func (h *AnalyticsHandler) GetDailyAnalytics(ctx context.Context, req *pb.GetDailyAnalyticsRequest) (*pb.GetDailyAnalyticsResponse, error) {
	dr := toDateRange(req.GetFrom(), req.GetTo())
	days, err := h.uc.GetDailyAnalytics(ctx, req.GetServiceProviderId(), dr)
	if err != nil {
		return nil, mapError(err)
	}
	entries := make([]*pb.DailyAnalyticsEntry, len(days))
	for i, d := range days {
		entries[i] = &pb.DailyAnalyticsEntry{
			Date:                   d.Date.Format("2006-01-02"),
			NotificationsSent:      int64(d.NotificationsSent),
			NotificationsDelivered: int64(d.NotificationsDelivered),
			CallbacksRequested:     int64(d.CallbacksRequested),
			CallbacksApproved:      int64(d.CallbacksApproved),
			MessagesSent:           int64(d.NewCustomers),
			DocumentsShared:        int64(d.ChurnedCustomers),
			BotActions:             int64(d.BotActions),
			SpamReports:            int64(d.AvgResponseTimeMS),
			PolicyDenials:          int64(d.PolicyDenials),
		}
	}
	return &pb.GetDailyAnalyticsResponse{Entries: entries}, nil
}

func (h *AnalyticsHandler) GetNotificationAnalytics(ctx context.Context, req *pb.GetNotificationAnalyticsRequest) (*pb.NotificationAnalytics, error) {
	dr := toDateRange(req.GetFrom(), req.GetTo())
	n, err := h.uc.GetNotificationAnalytics(ctx, req.GetServiceProviderId(), dr)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.NotificationAnalytics{
		TotalSent:      n.TotalSent,
		TotalDelivered: n.TotalDelivered,
		TotalRejected:  n.TotalFailed,
		DeliveryRate:   n.DeliveryRate,
		ByCategory:     n.ByCategory,
	}, nil
}

func (h *AnalyticsHandler) GetCallbackAnalytics(ctx context.Context, req *pb.GetCallbackAnalyticsRequest) (*pb.CallbackAnalytics, error) {
	dr := toDateRange(req.GetFrom(), req.GetTo())
	c, err := h.uc.GetCallbackAnalytics(ctx, req.GetServiceProviderId(), dr)
	if err != nil {
		return nil, mapError(err)
	}
	avgHours := float64(c.AvgApprovalTimeMS) / 3600000.0
	return &pb.CallbackAnalytics{
		TotalRequested:       c.TotalRequested,
		TotalApproved:        c.TotalApproved,
		TotalRejected:        c.TotalDenied,
		TotalExpired:         c.TotalCompleted,
		ApprovalRate:         c.ApprovalRate,
		AvgResponseTimeHours: avgHours,
	}, nil
}

func (h *AnalyticsHandler) GetCampaignAnalytics(ctx context.Context, req *pb.GetCampaignAnalyticsRequest) (*pb.CampaignAnalytics, error) {
	dr := toDateRange(req.GetFrom(), req.GetTo())
	c, err := h.uc.GetCampaignAnalytics(ctx, req.GetServiceProviderId(), req.GetCampaignId(), dr)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CampaignAnalytics{
		TotalTargets:   c.TotalTargeted,
		TotalSent:      c.TotalCampaigns,
		TotalDelivered: c.TotalDelivered,
		DeliveryRate:   c.DeliveryRate,
	}, nil
}

func (h *AnalyticsHandler) GetBotPerformanceAnalytics(ctx context.Context, req *pb.GetBotPerformanceAnalyticsRequest) (*pb.BotPerformanceAnalytics, error) {
	dr := toDateRange(req.GetFrom(), req.GetTo())
	b, err := h.uc.GetBotAnalytics(ctx, req.GetServiceProviderId(), req.GetBotId(), dr)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.BotPerformanceAnalytics{
		TotalConversations: b.TotalConversations,
		TotalActions:       b.TotalActions,
		TotalEscalations:   b.TotalEscalations,
		EscalationRate:     b.EscalationRate,
		AvgResponseTimeMs:  float64(b.AvgResponseTimeMS),
		ActionsByTool:      b.TopToolsUsed,
	}, nil
}

func toDateRange(from, to *timestamppb.Timestamp) entity.DateRange {
	dr := entity.DateRange{}
	if from != nil {
		dr.Start = from.AsTime()
	}
	if to != nil {
		dr.End = to.AsTime()
	}
	return dr
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
