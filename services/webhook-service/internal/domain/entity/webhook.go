package entity

import "time"

// WebhookSubscription represents a registered webhook endpoint.
type WebhookSubscription struct {
	ID             string
	OrganizationID string
	URL            string
	Secret         string
	EventTypes     []string // e.g., ["notification.created", "callback.request_created"]
	Status         string   // ACTIVE, PAUSED, DISABLED
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// WebhookDelivery records an attempt to deliver an event to a webhook endpoint.
type WebhookDelivery struct {
	ID             string
	SubscriptionID string
	EventID        string
	EventType      string
	StatusCode     int
	ResponseBody   string
	Attempts       int
	Status         string // PENDING, DELIVERED, FAILED
	CreatedAt      time.Time
	DeliveredAt    *time.Time
}
