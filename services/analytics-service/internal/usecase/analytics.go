package usecase

import (
	"context"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
	"github.com/trustinbox/analytics-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// AnalyticsUseCase implements analytics query operations.
type AnalyticsUseCase struct {
	repo repository.AnalyticsRepository
}

// NewAnalyticsUseCase creates a new AnalyticsUseCase.
func NewAnalyticsUseCase(repo repository.AnalyticsRepository) *AnalyticsUseCase {
	return &AnalyticsUseCase{repo: repo}
}

// GetDashboardStats returns the summary dashboard for a service provider.
func (uc *AnalyticsUseCase) GetDashboardStats(ctx context.Context, spID string) (*entity.DashboardStats, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetDashboardStats",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if spID == "" {
		return nil, bizerr.InvalidInput("service_provider_id is required")
	}
	return uc.repo.GetDashboardStats(ctx, spID)
}

// GetDailyAnalytics returns daily breakdowns for a date range.
func (uc *AnalyticsUseCase) GetDailyAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) ([]*entity.DailyAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetDailyAnalytics",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if dateRange.Start.After(dateRange.End) {
		return nil, bizerr.InvalidInput("start date must be before end date")
	}
	return uc.repo.GetDailyAnalytics(ctx, spID, dateRange)
}

// GetNotificationAnalytics returns notification-specific metrics.
func (uc *AnalyticsUseCase) GetNotificationAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.NotificationAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetNotificationAnalytics",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.repo.GetNotificationAnalytics(ctx, spID, dateRange)
}

// GetCallbackAnalytics returns callback-specific metrics.
func (uc *AnalyticsUseCase) GetCallbackAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.CallbackAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetCallbackAnalytics",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.repo.GetCallbackAnalytics(ctx, spID, dateRange)
}

// GetCampaignAnalytics returns campaign-specific metrics.
func (uc *AnalyticsUseCase) GetCampaignAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.CampaignAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetCampaignAnalytics",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.repo.GetCampaignAnalytics(ctx, spID, dateRange)
}

// GetBotAnalytics returns bot-specific metrics.
func (uc *AnalyticsUseCase) GetBotAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.BotAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "analytics-service", "AnalyticsUseCase.GetBotAnalytics",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.repo.GetBotAnalytics(ctx, spID, dateRange)
}
