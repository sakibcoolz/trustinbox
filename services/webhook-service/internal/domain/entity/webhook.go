package entity

import "time"

// WebhookSubscriptionStatus represents the lifecycle of a subscription.
type WebhookSubscriptionStatus string

const (
	WebhookStatusActive   WebhookSubscriptionStatus = "ACTIVE"
	WebhookStatusPaused   WebhookSubscriptionStatus = "PAUSED"
	WebhookStatusDisabled WebhookSubscriptionStatus = "DISABLED"
)

// WebhookSubscription stores a URL that events should be delivered to.
type WebhookSubscription struct {
	ID                string
	ServiceProviderID string
	URL               string
	Events            []string
	SecretHash        string
	Headers           map[string]string
	Status            WebhookSubscriptionStatus
	Description       string
	RetryPolicy       string // JSON
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// WebhookDeliveryStatus represents the delivery outcome.
type WebhookDeliveryStatus string

const (
	DeliveryPending WebhookDeliveryStatus = "PENDING"
	DeliverySuccess WebhookDeliveryStatus = "SUCCESS"
	DeliveryFailed  WebhookDeliveryStatus = "FAILED"
)

// WebhookDelivery records each delivery attempt.
type WebhookDelivery struct {
	ID             string
	SubscriptionID string
	EventType      string
	Payload        string // JSON
	ResponseStatus int
	ResponseBody   string
	Attempts       int
	MaxRetries     int
	NextRetryAt    *time.Time
	Status         WebhookDeliveryStatus
	Error          string
	DeliveredAt    *time.Time
	CreatedAt      time.Time
}

// SupportedWebhookEvents lists event types available for subscription.
var SupportedWebhookEvents = []string{
	"notification.sent",
	"notification.delivered",
	"notification.failed",
	"callback.requested",
	"callback.approved",
	"callback.denied",
	"callback.completed",
	"policy.denied",
	"campaign.sent",
	"campaign.completed",
	"bot.action.executed",
	"bot.escalated",
	"customer.opted_in",
	"customer.opted_out",
}
