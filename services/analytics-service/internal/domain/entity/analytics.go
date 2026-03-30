package entity

import "time"

// EventMetric represents an aggregated metric derived from domain events.
type EventMetric struct {
	ID        string
	EventType string
	OrgID     string
	Period    string // HOURLY, DAILY, WEEKLY, MONTHLY
	Count     int64
	Metadata  map[string]string
	CreatedAt time.Time
}

// DeliveryStats holds aggregated delivery statistics.
type DeliveryStats struct {
	OrgID          string
	TotalSent      int64
	TotalDelivered int64
	TotalFailed    int64
	TotalRead      int64
	Period         string
	PeriodStart    time.Time
	PeriodEnd      time.Time
}

// PolicyStats holds aggregated policy decision statistics.
type PolicyStats struct {
	OrgID        string
	TotalAllowed int64
	TotalDenied  int64
	TopDenyCodes map[string]int64
	Period       string
	PeriodStart  time.Time
	PeriodEnd    time.Time
}
