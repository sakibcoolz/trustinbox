package entity

import "time"

// DashboardStats holds summary statistics for an SP's dashboard.
type DashboardStats struct {
	ServiceProviderID      string
	TotalCustomers         int64
	ActiveCustomers        int64
	TotalNotificationsSent int64
	NotificationsDelivered int64
	NotificationsFailed    int64
	TotalCallbackRequests  int64
	CallbacksApproved      int64
	CallbacksCompleted     int64
	CallbacksDenied        int64
	TotalCampaignsSent     int64
	PolicyDenials          int64
	AvgResponseTimeMS      int64
	BotActionsExecuted     int64
	BotEscalations         int64
	WebhookDeliveries      int64
	WebhookFailures        int64
	ActiveBots             int64
	ActiveWebhooks         int64
	CustomerSatisfaction   float64
}

// DailyAnalytics represents a single day's aggregated metrics per SP.
type DailyAnalytics struct {
	ID                     string
	ServiceProviderID      string
	Date                   time.Time
	NotificationsSent      int
	NotificationsDelivered int
	NotificationsFailed    int
	CallbacksRequested     int
	CallbacksApproved      int
	CallbacksCompleted     int
	CallbacksDenied        int
	PolicyDenials          int
	PolicyApprovals        int
	CampaignsSent          int
	CampaignsDelivered     int
	BotConversations       int
	BotActions             int
	BotEscalations         int
	WebhooksSent           int
	WebhooksDelivered      int
	WebhooksFailed         int
	NewCustomers           int
	ChurnedCustomers       int
	AvgResponseTimeMS      int
}

// NotificationAnalytics provides notification-specific analytics.
type NotificationAnalytics struct {
	TotalSent         int64
	TotalDelivered    int64
	TotalFailed       int64
	DeliveryRate      float64
	AvgDeliveryTimeMS int64
	ByCategory        map[string]int64
	ByChannel         map[string]int64
}

// CallbackAnalytics provides callback-specific analytics.
type CallbackAnalytics struct {
	TotalRequested       int64
	TotalApproved        int64
	TotalCompleted       int64
	TotalDenied          int64
	ApprovalRate         float64
	CompletionRate       float64
	AvgApprovalTimeMS    int64
	AvgCompletionTimeMS  int64
}

// CampaignAnalytics provides campaign-specific analytics.
type CampaignAnalytics struct {
	TotalCampaigns   int64
	TotalTargeted    int64
	TotalDelivered   int64
	TotalOptedOut    int64
	DeliveryRate     float64
	OptOutRate       float64
}

// BotAnalytics provides bot-specific analytics.
type BotAnalytics struct {
	TotalConversations     int64
	TotalActions           int64
	TotalEscalations       int64
	EscalationRate         float64
	AvgTurnsPerConversation float64
	AvgResponseTimeMS      int64
	TopToolsUsed           map[string]int64
}

// DateRange specifies a time window for analytics queries.
type DateRange struct {
	Start time.Time
	End   time.Time
}
