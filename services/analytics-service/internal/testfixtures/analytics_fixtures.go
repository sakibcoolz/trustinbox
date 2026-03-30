package testfixtures

import (
	"time"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
)

type DashboardStatsBuilder struct {
	stats *entity.DashboardStats
}

func NewDashboardStatsBuilder() *DashboardStatsBuilder {
	return &DashboardStatsBuilder{
		stats: &entity.DashboardStats{
			ServiceProviderID:      "sp-test-001",
			TotalCustomers:         1000,
			ActiveCustomers:        800,
			TotalNotificationsSent: 5000,
			NotificationsDelivered: 4800,
			NotificationsFailed:    200,
			TotalCallbackRequests:  300,
			CallbacksApproved:      250,
			CallbacksCompleted:     200,
			CallbacksDenied:        50,
			TotalCampaignsSent:     20,
			PolicyDenials:          100,
			AvgResponseTimeMS:      150,
			BotActionsExecuted:     1000,
			BotEscalations:         50,
			WebhookDeliveries:      2000,
			WebhookFailures:        20,
			ActiveBots:             3,
			ActiveWebhooks:         5,
			CustomerSatisfaction:   4.5,
		},
	}
}

func (b *DashboardStatsBuilder) WithSPID(id string) *DashboardStatsBuilder {
	b.stats.ServiceProviderID = id
	return b
}

func (b *DashboardStatsBuilder) Build() *entity.DashboardStats {
	return b.stats
}

type DailyAnalyticsBuilder struct {
	daily *entity.DailyAnalytics
}

func NewDailyAnalyticsBuilder() *DailyAnalyticsBuilder {
	return &DailyAnalyticsBuilder{
		daily: &entity.DailyAnalytics{
			ID:                     "daily-test-001",
			ServiceProviderID:      "sp-test-001",
			Date:                   time.Now().UTC().Truncate(24 * time.Hour),
			NotificationsSent:      100,
			NotificationsDelivered: 95,
			NotificationsFailed:    5,
			CallbacksRequested:     10,
			CallbacksApproved:      8,
			CallbacksCompleted:     7,
			CallbacksDenied:        2,
			PolicyDenials:          3,
			PolicyApprovals:        90,
			CampaignsSent:          2,
			CampaignsDelivered:     1,
			BotConversations:       20,
			BotActions:             50,
			BotEscalations:         2,
			WebhooksSent:           40,
			WebhooksDelivered:      39,
			WebhooksFailed:         1,
			NewCustomers:           5,
			ChurnedCustomers:       1,
			AvgResponseTimeMS:      120,
		},
	}
}

func (b *DailyAnalyticsBuilder) WithSPID(id string) *DailyAnalyticsBuilder {
	b.daily.ServiceProviderID = id
	return b
}

func (b *DailyAnalyticsBuilder) WithDate(d time.Time) *DailyAnalyticsBuilder {
	b.daily.Date = d
	return b
}

func (b *DailyAnalyticsBuilder) Build() *entity.DailyAnalytics {
	return b.daily
}

type NotificationAnalyticsBuilder struct {
	na *entity.NotificationAnalytics
}

func NewNotificationAnalyticsBuilder() *NotificationAnalyticsBuilder {
	return &NotificationAnalyticsBuilder{
		na: &entity.NotificationAnalytics{
			TotalSent:         500,
			TotalDelivered:    480,
			TotalFailed:       20,
			DeliveryRate:      0.96,
			AvgDeliveryTimeMS: 200,
			ByCategory:        map[string]int64{"personal": 200, "service_provider": 250, "advertisement": 50},
			ByChannel:         map[string]int64{"push": 300, "sms": 100, "email": 100},
		},
	}
}

func (b *NotificationAnalyticsBuilder) Build() *entity.NotificationAnalytics {
	return b.na
}

type CallbackAnalyticsBuilder struct {
	ca *entity.CallbackAnalytics
}

func NewCallbackAnalyticsBuilder() *CallbackAnalyticsBuilder {
	return &CallbackAnalyticsBuilder{
		ca: &entity.CallbackAnalytics{
			TotalRequested:      100,
			TotalApproved:       80,
			TotalCompleted:      70,
			TotalDenied:         20,
			ApprovalRate:        0.80,
			CompletionRate:      0.875,
			AvgApprovalTimeMS:   30000,
			AvgCompletionTimeMS: 120000,
		},
	}
}

func (b *CallbackAnalyticsBuilder) Build() *entity.CallbackAnalytics {
	return b.ca
}

type CampaignAnalyticsBuilder struct {
	ca *entity.CampaignAnalytics
}

func NewCampaignAnalyticsBuilder() *CampaignAnalyticsBuilder {
	return &CampaignAnalyticsBuilder{
		ca: &entity.CampaignAnalytics{
			TotalCampaigns: 10,
			TotalTargeted:  5000,
			TotalDelivered: 4500,
			TotalOptedOut:  100,
			DeliveryRate:   0.90,
			OptOutRate:     0.02,
		},
	}
}

func (b *CampaignAnalyticsBuilder) Build() *entity.CampaignAnalytics {
	return b.ca
}

type BotAnalyticsBuilder struct {
	ba *entity.BotAnalytics
}

func NewBotAnalyticsBuilder() *BotAnalyticsBuilder {
	return &BotAnalyticsBuilder{
		ba: &entity.BotAnalytics{
			TotalConversations:      500,
			TotalActions:            2000,
			TotalEscalations:        50,
			EscalationRate:          0.10,
			AvgTurnsPerConversation: 5.5,
			AvgResponseTimeMS:       200,
			TopToolsUsed:            map[string]int64{"send_notification": 800, "send_message": 600, "get_customer_profile": 400, "escalate_to_human": 50},
		},
	}
}

func (b *BotAnalyticsBuilder) Build() *entity.BotAnalytics {
	return b.ba
}

type DateRangeBuilder struct {
	dr entity.DateRange
}

func NewDateRangeBuilder() *DateRangeBuilder {
	now := time.Now().UTC()
	return &DateRangeBuilder{
		dr: entity.DateRange{
			Start: now.AddDate(0, 0, -30),
			End:   now,
		},
	}
}

func (b *DateRangeBuilder) WithStart(t time.Time) *DateRangeBuilder {
	b.dr.Start = t
	return b
}

func (b *DateRangeBuilder) WithEnd(t time.Time) *DateRangeBuilder {
	b.dr.End = t
	return b
}

func (b *DateRangeBuilder) Build() entity.DateRange {
	return b.dr
}
