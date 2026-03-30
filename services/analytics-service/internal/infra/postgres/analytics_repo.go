package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
	"github.com/trustinbox/analytics-service/internal/domain/repository"
)

type analyticsRepo struct {
	db *sql.DB
}

func NewAnalyticsRepository(db *sql.DB) repository.AnalyticsRepository {
	return &analyticsRepo{db: db}
}

func (r *analyticsRepo) GetDashboardStats(ctx context.Context, spID string) (*entity.DashboardStats, error) {
	s := &entity.DashboardStats{ServiceProviderID: spID}

	err := r.db.QueryRowContext(ctx,
		`SELECT
			COALESCE(SUM(notifications_sent), 0),
			COALESCE(SUM(notifications_delivered), 0),
			COALESCE(SUM(notifications_rejected), 0),
			COALESCE(SUM(callbacks_requested), 0),
			COALESCE(SUM(callbacks_approved), 0),
			COALESCE(SUM(callbacks_rejected), 0),
			COALESCE(SUM(campaigns_launched), 0),
			COALESCE(SUM(campaign_targets_sent), 0),
			COALESCE(SUM(policy_denials), 0),
			COALESCE(SUM(bot_actions_executed), 0),
			COALESCE(SUM(bot_escalations), 0),
			COALESCE(SUM(webhook_deliveries), 0),
			COALESCE(SUM(webhook_failures), 0)
		 FROM analytics_daily WHERE service_provider_id = $1`, spID,
	).Scan(
		&s.TotalNotificationsSent, &s.NotificationsDelivered, &s.NotificationsFailed,
		&s.TotalCallbackRequests, &s.CallbacksApproved, &s.CallbacksDenied,
		&s.TotalCampaignsSent, &s.TotalCampaignsSent,
		&s.PolicyDenials,
		&s.BotActionsExecuted, &s.BotEscalations,
		&s.WebhookDeliveries, &s.WebhookFailures,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get dashboard stats: %w", err)
	}

	if s.TotalNotificationsSent > 0 {
		s.CustomerSatisfaction = float64(s.NotificationsDelivered) / float64(s.TotalNotificationsSent)
	}

	return s, nil
}

func (r *analyticsRepo) GetDailyAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) ([]*entity.DailyAnalytics, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, service_provider_id, date,
			notifications_sent, notifications_delivered, notifications_rejected,
			callbacks_requested, callbacks_approved, callbacks_rejected, callbacks_expired,
			policy_denials, policy_evaluations,
			campaigns_launched, campaign_targets_sent,
			bot_actions_executed, bot_escalations,
			webhook_deliveries, webhook_failures,
			messages_sent, documents_shared, spam_reports
		 FROM analytics_daily
		 WHERE service_provider_id = $1 AND date >= $2 AND date <= $3
		 ORDER BY date DESC`, spID, dateRange.Start, dateRange.End,
	)
	if err != nil {
		return nil, fmt.Errorf("query daily analytics: %w", err)
	}
	defer rows.Close()

	var results []*entity.DailyAnalytics
	for rows.Next() {
		var d entity.DailyAnalytics
		var cbExpired int // read but unused — table has it, entity doesn't
		if err := rows.Scan(
			&d.ID, &d.ServiceProviderID, &d.Date,
			&d.NotificationsSent, &d.NotificationsDelivered, &d.NotificationsFailed,
			&d.CallbacksRequested, &d.CallbacksApproved, &d.CallbacksDenied, &cbExpired,
			&d.PolicyDenials, &d.PolicyApprovals,
			&d.CampaignsSent, &d.CampaignsDelivered,
			&d.BotActions, &d.BotEscalations,
			&d.WebhooksSent, &d.WebhooksFailed,
			&d.NewCustomers, &d.ChurnedCustomers, &d.AvgResponseTimeMS,
		); err != nil {
			return nil, fmt.Errorf("scan daily analytics: %w", err)
		}
		results = append(results, &d)
	}
	return results, rows.Err()
}

func (r *analyticsRepo) UpsertDailyMetrics(ctx context.Context, a *entity.DailyAnalytics) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO analytics_daily (
			id, service_provider_id, date,
			notifications_sent, notifications_delivered, notifications_rejected,
			callbacks_requested, callbacks_approved, callbacks_rejected, callbacks_expired,
			messages_sent, messages_received, documents_shared, documents_opened,
			campaigns_launched, campaign_targets_sent,
			bot_actions_executed, bot_escalations,
			spam_reports, policy_evaluations, policy_denials,
			webhook_deliveries, webhook_failures,
			created_at, updated_at
		 ) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, 0,
			$10, 0, $11, 0,
			$12, $13,
			$14, $15,
			$16, $17, $18,
			$19, $20,
			NOW(), NOW()
		 ) ON CONFLICT (service_provider_id, date) DO UPDATE SET
			notifications_sent = analytics_daily.notifications_sent + EXCLUDED.notifications_sent,
			notifications_delivered = analytics_daily.notifications_delivered + EXCLUDED.notifications_delivered,
			notifications_rejected = analytics_daily.notifications_rejected + EXCLUDED.notifications_rejected,
			callbacks_requested = analytics_daily.callbacks_requested + EXCLUDED.callbacks_requested,
			callbacks_approved = analytics_daily.callbacks_approved + EXCLUDED.callbacks_approved,
			callbacks_rejected = analytics_daily.callbacks_rejected + EXCLUDED.callbacks_rejected,
			campaigns_launched = analytics_daily.campaigns_launched + EXCLUDED.campaigns_launched,
			campaign_targets_sent = analytics_daily.campaign_targets_sent + EXCLUDED.campaign_targets_sent,
			bot_actions_executed = analytics_daily.bot_actions_executed + EXCLUDED.bot_actions_executed,
			bot_escalations = analytics_daily.bot_escalations + EXCLUDED.bot_escalations,
			messages_sent = analytics_daily.messages_sent + EXCLUDED.messages_sent,
			documents_shared = analytics_daily.documents_shared + EXCLUDED.documents_shared,
			spam_reports = analytics_daily.spam_reports + EXCLUDED.spam_reports,
			policy_evaluations = analytics_daily.policy_evaluations + EXCLUDED.policy_evaluations,
			policy_denials = analytics_daily.policy_denials + EXCLUDED.policy_denials,
			webhook_deliveries = analytics_daily.webhook_deliveries + EXCLUDED.webhook_deliveries,
			webhook_failures = analytics_daily.webhook_failures + EXCLUDED.webhook_failures,
			updated_at = NOW()`,
		a.ID, a.ServiceProviderID, a.Date,
		a.NotificationsSent, a.NotificationsDelivered, a.NotificationsFailed,
		a.CallbacksRequested, a.CallbacksApproved, a.CallbacksDenied,
		a.NewCustomers, a.ChurnedCustomers,
		a.CampaignsSent, a.CampaignsDelivered,
		a.BotActions, a.BotEscalations,
		a.AvgResponseTimeMS, a.PolicyApprovals, a.PolicyDenials,
		a.WebhooksSent, a.WebhooksFailed,
	)
	if err != nil {
		return fmt.Errorf("upsert daily metrics: %w", err)
	}
	return nil
}

func (r *analyticsRepo) GetNotificationAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.NotificationAnalytics, error) {
	n := &entity.NotificationAnalytics{
		ByCategory: make(map[string]int64),
		ByChannel:  make(map[string]int64),
	}
	err := r.db.QueryRowContext(ctx,
		`SELECT
			COALESCE(SUM(notifications_sent), 0),
			COALESCE(SUM(notifications_delivered), 0),
			COALESCE(SUM(notifications_rejected), 0)
		 FROM analytics_daily
		 WHERE service_provider_id = $1 AND date >= $2 AND date <= $3`,
		spID, dateRange.Start, dateRange.End,
	).Scan(&n.TotalSent, &n.TotalDelivered, &n.TotalFailed)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get notification analytics: %w", err)
	}
	if n.TotalSent > 0 {
		n.DeliveryRate = float64(n.TotalDelivered) / float64(n.TotalSent)
	}
	return n, nil
}

func (r *analyticsRepo) GetCallbackAnalytics(ctx context.Context, spID string, dateRange entity.DateRange) (*entity.CallbackAnalytics, error) {
	c := &entity.CallbackAnalytics{}
	err := r.db.QueryRowContext(ctx,
		`SELECT
			COALESCE(SUM(callbacks_requested), 0),
			COALESCE(SUM(callbacks_approved), 0),
			COALESCE(SUM(callbacks_rejected), 0),
			COALESCE(SUM(callbacks_expired), 0)
		 FROM analytics_daily
		 WHERE service_provider_id = $1 AND date >= $2 AND date <= $3`,
		spID, dateRange.Start, dateRange.End,
	).Scan(&c.TotalRequested, &c.TotalApproved, &c.TotalDenied, &c.TotalCompleted)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get callback analytics: %w", err)
	}
	if c.TotalRequested > 0 {
		c.ApprovalRate = float64(c.TotalApproved) / float64(c.TotalRequested)
		c.CompletionRate = float64(c.TotalCompleted) / float64(c.TotalRequested)
	}
	return c, nil
}

func (r *analyticsRepo) GetCampaignAnalytics(ctx context.Context, spID, campaignID string, dateRange entity.DateRange) (*entity.CampaignAnalytics, error) {
	c := &entity.CampaignAnalytics{}
	err := r.db.QueryRowContext(ctx,
		`SELECT
			COALESCE(SUM(campaigns_launched), 0),
			COALESCE(SUM(campaign_targets_sent), 0)
		 FROM analytics_daily
		 WHERE service_provider_id = $1 AND date >= $2 AND date <= $3`,
		spID, dateRange.Start, dateRange.End,
	).Scan(&c.TotalCampaigns, &c.TotalTargeted)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get campaign analytics: %w", err)
	}
	c.TotalDelivered = c.TotalTargeted
	if c.TotalTargeted > 0 {
		c.DeliveryRate = float64(c.TotalDelivered) / float64(c.TotalTargeted)
	}
	return c, nil
}

func (r *analyticsRepo) GetBotAnalytics(ctx context.Context, spID, botID string, dateRange entity.DateRange) (*entity.BotAnalytics, error) {
	b := &entity.BotAnalytics{
		TopToolsUsed: make(map[string]int64),
	}
	err := r.db.QueryRowContext(ctx,
		`SELECT
			COALESCE(SUM(bot_actions_executed), 0),
			COALESCE(SUM(bot_escalations), 0)
		 FROM analytics_daily
		 WHERE service_provider_id = $1 AND date >= $2 AND date <= $3`,
		spID, dateRange.Start, dateRange.End,
	).Scan(&b.TotalActions, &b.TotalEscalations)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("get bot analytics: %w", err)
	}
	if b.TotalActions > 0 {
		b.EscalationRate = float64(b.TotalEscalations) / float64(b.TotalActions)
	}
	return b, nil
}
