package entity

import "time"

type Notification struct {
	ID             string
	UserID         string
	OrganizationID string
	Category       string // PERSONAL, ORGANIZATIONAL, ADVERTISEMENT
	Title          string
	Body           string
	Priority       string // LOW, NORMAL, HIGH, URGENT
	Status         string // PENDING, QUEUED, DELIVERED, READ, ARCHIVED, REJECTED
	Metadata       map[string]string
	CreatedAt      time.Time
}

type NotificationDelivery struct {
	ID              string
	NotificationID  string
	DeliveryChannel string // PUSH, INBOX, CHAT
	DeliveryStatus  string
	DeliveredAt     *time.Time
	ReadAt          *time.Time
	FailureReason   string
}

type Campaign struct {
	ID               string
	OrganizationID   string
	CreatedByOrgUser string
	Name             string
	Category         string
	Title            string
	Body             string
	Status           string // DRAFT, SCHEDULED, PROCESSING, COMPLETED, CANCELLED
	ScheduledAt      *time.Time
	Metadata         map[string]string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
