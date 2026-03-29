package repository

import (
	"context"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
)

// AnalyticsRepository defines persistence for analytics data.
type AnalyticsRepository interface {
	GetDashboardStats(ctx context.Context, spID string) (*entity.DashboardStats, error)
	GetDailyAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) ([]*entity.DailyAnalytics, error)
	UpsertDailyMetrics(ctx context.Context, analytics *entity.DailyAnalytics) error
	GetNotificationAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.NotificationAnalytics, error)
	GetCallbackAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.CallbackAnalytics, error)
	GetCampaignAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.CampaignAnalytics, error)
	GetBotAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.BotAnalytics, error)
}
