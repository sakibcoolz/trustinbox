package usecase_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
	"github.com/trustinbox/analytics-service/internal/domain/repository"
	"github.com/trustinbox/analytics-service/internal/testfixtures"
	"github.com/trustinbox/analytics-service/internal/usecase"
)

// ─── Mock Repository ────────────────────────────────────────

type mockAnalyticsRepo struct {
	dashboardStats        *entity.DashboardStats
	dailyAnalytics        []*entity.DailyAnalytics
	notificationAnalytics *entity.NotificationAnalytics
	callbackAnalytics     *entity.CallbackAnalytics
	campaignAnalytics     *entity.CampaignAnalytics
	botAnalytics          *entity.BotAnalytics
	errDashboard          error
	errDaily              error
}

var _ repository.AnalyticsRepository = (*mockAnalyticsRepo)(nil)

func (m *mockAnalyticsRepo) GetDashboardStats(_ context.Context, spID string) (*entity.DashboardStats, error) {
	if m.errDashboard != nil {
		return nil, m.errDashboard
	}
	return m.dashboardStats, nil
}

func (m *mockAnalyticsRepo) GetDailyAnalytics(_ context.Context, spID string, dr entity.DateRange) ([]*entity.DailyAnalytics, error) {
	if m.errDaily != nil {
		return nil, m.errDaily
	}
	return m.dailyAnalytics, nil
}

func (m *mockAnalyticsRepo) UpsertDailyMetrics(_ context.Context, analytics *entity.DailyAnalytics) error {
	return nil
}

func (m *mockAnalyticsRepo) GetNotificationAnalytics(_ context.Context, spID string, dr entity.DateRange) (*entity.NotificationAnalytics, error) {
	return m.notificationAnalytics, nil
}

func (m *mockAnalyticsRepo) GetCallbackAnalytics(_ context.Context, spID string, dr entity.DateRange) (*entity.CallbackAnalytics, error) {
	return m.callbackAnalytics, nil
}

func (m *mockAnalyticsRepo) GetCampaignAnalytics(_ context.Context, spID, campaignID string, dr entity.DateRange) (*entity.CampaignAnalytics, error) {
	return m.campaignAnalytics, nil
}

func (m *mockAnalyticsRepo) GetBotAnalytics(_ context.Context, spID, botID string, dr entity.DateRange) (*entity.BotAnalytics, error) {
	return m.botAnalytics, nil
}

// ─── Tests ──────────────────────────────────────────────────

func TestGetDashboardStats_Success(t *testing.T) {
	stats := testfixtures.NewDashboardStatsBuilder().WithSPID("sp-1").Build()
	repo := &mockAnalyticsRepo{dashboardStats: stats}
	uc := usecase.NewAnalyticsUseCase(repo)

	result, err := uc.GetDashboardStats(context.Background(), "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalCustomers != 1000 {
		t.Errorf("expected 1000 customers, got %d", result.TotalCustomers)
	}
	if result.ActiveBots != 3 {
		t.Errorf("expected 3 active bots, got %d", result.ActiveBots)
	}
}

func TestGetDashboardStats_EmptySPID(t *testing.T) {
	repo := &mockAnalyticsRepo{}
	uc := usecase.NewAnalyticsUseCase(repo)

	_, err := uc.GetDashboardStats(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty SP ID")
	}
}

func TestGetDashboardStats_RepoError(t *testing.T) {
	repo := &mockAnalyticsRepo{errDashboard: fmt.Errorf("db connection refused")}
	uc := usecase.NewAnalyticsUseCase(repo)

	_, err := uc.GetDashboardStats(context.Background(), "sp-1")
	if err == nil {
		t.Fatal("expected error from repository")
	}
}

func TestGetDailyAnalytics_Success(t *testing.T) {
	now := time.Now().UTC()
	daily1 := testfixtures.NewDailyAnalyticsBuilder().WithSPID("sp-1").WithDate(now.AddDate(0, 0, -1)).Build()
	daily2 := testfixtures.NewDailyAnalyticsBuilder().WithSPID("sp-1").WithDate(now).Build()
	repo := &mockAnalyticsRepo{dailyAnalytics: []*entity.DailyAnalytics{daily1, daily2}}
	uc := usecase.NewAnalyticsUseCase(repo)

	dr := testfixtures.NewDateRangeBuilder().WithStart(now.AddDate(0, 0, -7)).WithEnd(now).Build()
	result, err := uc.GetDailyAnalytics(context.Background(), "sp-1", dr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 daily records, got %d", len(result))
	}
}

func TestGetDailyAnalytics_InvalidDateRange(t *testing.T) {
	repo := &mockAnalyticsRepo{}
	uc := usecase.NewAnalyticsUseCase(repo)

	now := time.Now().UTC()
	dr := entity.DateRange{Start: now, End: now.AddDate(0, 0, -7)}
	_, err := uc.GetDailyAnalytics(context.Background(), "sp-1", dr)
	if err == nil {
		t.Fatal("expected error for invalid date range (start after end)")
	}
}

func TestGetNotificationAnalytics_Success(t *testing.T) {
	na := testfixtures.NewNotificationAnalyticsBuilder().Build()
	repo := &mockAnalyticsRepo{notificationAnalytics: na}
	uc := usecase.NewAnalyticsUseCase(repo)

	dr := testfixtures.NewDateRangeBuilder().Build()
	result, err := uc.GetNotificationAnalytics(context.Background(), "sp-1", dr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalSent != 500 {
		t.Errorf("expected 500 sent, got %d", result.TotalSent)
	}
	if result.DeliveryRate != 0.96 {
		t.Errorf("expected 0.96 delivery rate, got %f", result.DeliveryRate)
	}
}

func TestGetCallbackAnalytics_Success(t *testing.T) {
	ca := testfixtures.NewCallbackAnalyticsBuilder().Build()
	repo := &mockAnalyticsRepo{callbackAnalytics: ca}
	uc := usecase.NewAnalyticsUseCase(repo)

	dr := testfixtures.NewDateRangeBuilder().Build()
	result, err := uc.GetCallbackAnalytics(context.Background(), "sp-1", dr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalRequested != 100 {
		t.Errorf("expected 100 requested, got %d", result.TotalRequested)
	}
	if result.ApprovalRate != 0.80 {
		t.Errorf("expected 0.80 approval rate, got %f", result.ApprovalRate)
	}
}

func TestGetCampaignAnalytics_Success(t *testing.T) {
	ca := testfixtures.NewCampaignAnalyticsBuilder().Build()
	repo := &mockAnalyticsRepo{campaignAnalytics: ca}
	uc := usecase.NewAnalyticsUseCase(repo)

	dr := testfixtures.NewDateRangeBuilder().Build()
	result, err := uc.GetCampaignAnalytics(context.Background(), "sp-1", "camp-1", dr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalCampaigns != 10 {
		t.Errorf("expected 10 campaigns, got %d", result.TotalCampaigns)
	}
}

func TestGetBotAnalytics_Success(t *testing.T) {
	ba := testfixtures.NewBotAnalyticsBuilder().Build()
	repo := &mockAnalyticsRepo{botAnalytics: ba}
	uc := usecase.NewAnalyticsUseCase(repo)

	dr := testfixtures.NewDateRangeBuilder().Build()
	result, err := uc.GetBotAnalytics(context.Background(), "sp-1", "bot-1", dr)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalConversations != 500 {
		t.Errorf("expected 500 conversations, got %d", result.TotalConversations)
	}
	if result.EscalationRate != 0.10 {
		t.Errorf("expected 0.10 escalation rate, got %f", result.EscalationRate)
	}
}
