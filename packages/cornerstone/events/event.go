package events

import (
	"time"

	"github.com/google/uuid"
)

// EventType identifies the kind of domain event.
type EventType string

// ──────────────────────────────────────────────
// Auth events
// ──────────────────────────────────────────────
const (
	UserRegistered  EventType = "user.registered"
	UserLoggedIn    EventType = "user.logged_in"
	UserLoggedOut   EventType = "user.logged_out"
	TokenRefreshed  EventType = "user.token_refreshed"
	PasswordChanged EventType = "user.password_changed"
)

// ──────────────────────────────────────────────
// Organization events
// ──────────────────────────────────────────────
const (
	OrganizationCreated     EventType = "organization.created"
	OrganizationVerified    EventType = "organization.verified"
	OrganizationRejected    EventType = "organization.rejected"
	OrganizationSuspended   EventType = "organization.suspended"
	OrganizationUserAdded   EventType = "organization.user_added"
	OrganizationUserRemoved EventType = "organization.user_removed"
)

// ──────────────────────────────────────────────
// Policy events
// ──────────────────────────────────────────────
const (
	PolicyEvaluated EventType = "policy.evaluated"
	PolicyAllowed   EventType = "policy.allowed"
	PolicyDenied    EventType = "policy.denied"
)

// ──────────────────────────────────────────────
// Communication events
// ──────────────────────────────────────────────
const (
	CallbackRequestCreated  EventType = "callback.request_created"
	CallbackRequestApproved EventType = "callback.request_approved"
	CallbackRequestRejected EventType = "callback.request_rejected"
	CallbackRequestExpired  EventType = "callback.request_expired"
	MessageSent             EventType = "message.sent"
	ConversationCreated     EventType = "conversation.created"
	SpamReported            EventType = "spam.reported"
)

// ──────────────────────────────────────────────
// Notification events
// ──────────────────────────────────────────────
const (
	NotificationCreated   EventType = "notification.created"
	NotificationDelivered EventType = "notification.delivered"
	NotificationRead      EventType = "notification.read"
	NotificationArchived  EventType = "notification.archived"
)

// ──────────────────────────────────────────────
// Delivery events
// ──────────────────────────────────────────────
const (
	DeliveryAttempted EventType = "delivery.attempted"
	DeliverySucceeded EventType = "delivery.succeeded"
	DeliveryFailed    EventType = "delivery.failed"
)

// ──────────────────────────────────────────────
// Campaign events
// ──────────────────────────────────────────────
const (
	CampaignStarted   EventType = "campaign.started"
	CampaignCompleted EventType = "campaign.completed"
	CampaignPaused    EventType = "campaign.paused"
)

// ──────────────────────────────────────────────
// System / worker events
// ──────────────────────────────────────────────
const (
	CleanupStarted   EventType = "system.cleanup_started"
	CleanupCompleted EventType = "system.cleanup_completed"
)

// AllEventTypes returns every registered event type. Useful for
// services that want to subscribe to all events (e.g. webhook service).
func AllEventTypes() []EventType {
	return []EventType{
		// auth
		UserRegistered, UserLoggedIn, UserLoggedOut, TokenRefreshed, PasswordChanged,
		// organization
		OrganizationCreated, OrganizationVerified, OrganizationRejected,
		OrganizationSuspended, OrganizationUserAdded, OrganizationUserRemoved,
		// policy
		PolicyEvaluated, PolicyAllowed, PolicyDenied,
		// communication
		CallbackRequestCreated, CallbackRequestApproved, CallbackRequestRejected,
		CallbackRequestExpired, MessageSent, ConversationCreated, SpamReported,
		// notification
		NotificationCreated, NotificationDelivered, NotificationRead, NotificationArchived,
		// delivery
		DeliveryAttempted, DeliverySucceeded, DeliveryFailed,
		// campaign
		CampaignStarted, CampaignCompleted, CampaignPaused,
		// system
		CleanupStarted, CleanupCompleted,
	}
}

// Event is the canonical domain event envelope.
type Event struct {
	ID            string            `json:"id"`
	Type          EventType         `json:"type"`
	Source        string            `json:"source"`
	Subject       string            `json:"subject"`
	Time          time.Time         `json:"time"`
	Data          map[string]string `json:"data"`
	CorrelationID string            `json:"correlation_id,omitempty"`
	UserID        string            `json:"user_id,omitempty"`
	OrgID         string            `json:"org_id,omitempty"`
}

// NewEvent creates a new event with a generated UUID and the current time.
func NewEvent(eventType EventType, source string, data map[string]string) Event {
	return Event{
		ID:     uuid.New().String(),
		Type:   eventType,
		Source: source,
		Time:   time.Now(),
		Data:   data,
	}
}

// WithSubject sets the subject field and returns the event.
func (e Event) WithSubject(subject string) Event {
	e.Subject = subject
	return e
}

// WithCorrelation sets the correlation ID and returns the event.
func (e Event) WithCorrelation(id string) Event {
	e.CorrelationID = id
	return e
}

// WithUser sets the user ID and returns the event.
func (e Event) WithUser(userID string) Event {
	e.UserID = userID
	return e
}

// WithOrg sets the organization ID and returns the event.
func (e Event) WithOrg(orgID string) Event {
	e.OrgID = orgID
	return e
}
