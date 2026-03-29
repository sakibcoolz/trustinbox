package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType identifies the type of domain event.
type EventType string

// Domain event types.
const (
	// Organization events
	OrganizationCreated  EventType = "organization.created"
	OrganizationVerified EventType = "organization.verified"
	OrganizationSuspended EventType = "organization.suspended"

	// Customer events
	CustomerSynced       EventType = "customer.synced"
	CustomerBlockedOrg   EventType = "customer.blocked_org"
	CustomerUnblockedOrg EventType = "customer.unblocked_org"

	// Consent events
	ConsentUpdated EventType = "consent.updated"

	// Policy events
	PolicyEvaluated EventType = "policy.evaluated"

	// Notification events
	NotificationCreated   EventType = "notification.created"
	NotificationDelivered EventType = "notification.delivered"
	NotificationRead      EventType = "notification.read"
	NotificationArchived  EventType = "notification.archived"

	// Callback events
	CallbackRequested EventType = "callback.requested"
	CallbackApproved  EventType = "callback.approved"
	CallbackRejected  EventType = "callback.rejected"
	CallbackExpired   EventType = "callback.expired"

	// Message events
	MessageSent EventType = "message.sent"
	MessageRead EventType = "message.read"

	// Document events
	DocumentShared EventType = "document.shared"
	DocumentOpened EventType = "document.opened"

	// Campaign events
	CampaignLaunched  EventType = "campaign.launched"
	CampaignCompleted EventType = "campaign.completed"

	// Bot events
	BotCreated        EventType = "bot.created"
	BotActionExecuted EventType = "bot.action.executed"
	BotEscalated      EventType = "bot.escalated"

	// Webhook events
	WebhookDeliverySucceeded EventType = "webhook.delivery.succeeded"
	WebhookDeliveryFailed    EventType = "webhook.delivery.failed"

	// Spam events
	SpamReported EventType = "spam.reported"
)

// Event is the standard domain event envelope.
type Event struct {
	ID              string          `json:"id"`
	Type            EventType       `json:"type"`
	TenantID        string          `json:"tenant_id,omitempty"`
	ActorID         string          `json:"actor_id,omitempty"`
	ServiceProviderID string        `json:"service_provider_id,omitempty"`
	UserID          string          `json:"user_id,omitempty"`
	EntityID        string          `json:"entity_id,omitempty"`
	TraceID         string          `json:"trace_id,omitempty"`
	Payload         json.RawMessage `json:"payload"`
	OccurredAt      time.Time       `json:"occurred_at"`
}

// NewEvent creates a new event with a generated ID and timestamp.
func NewEvent(eventType EventType, payload interface{}) (*Event, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return &Event{
		ID:         uuid.New().String(),
		Type:       eventType,
		Payload:    data,
		OccurredAt: time.Now().UTC(),
	}, nil
}

// WithTenant sets the tenant context on the event.
func (e *Event) WithTenant(tenantID string) *Event {
	e.TenantID = tenantID
	return e
}

// WithActor sets the actor context on the event.
func (e *Event) WithActor(actorID string) *Event {
	e.ActorID = actorID
	return e
}

// WithServiceProvider sets the service provider context.
func (e *Event) WithServiceProvider(spID string) *Event {
	e.ServiceProviderID = spID
	return e
}

// WithUser sets the user context.
func (e *Event) WithUser(userID string) *Event {
	e.UserID = userID
	return e
}

// WithEntity sets the entity being acted upon.
func (e *Event) WithEntity(entityID string) *Event {
	e.EntityID = entityID
	return e
}

// WithTrace sets the trace ID for observability correlation.
func (e *Event) WithTrace(traceID string) *Event {
	e.TraceID = traceID
	return e
}

// Publisher publishes domain events.
type Publisher interface {
	Publish(ctx context.Context, event *Event) error
	PublishBatch(ctx context.Context, events []*Event) error
	Close() error
}

// Subscriber receives domain events.
type Subscriber interface {
	Subscribe(ctx context.Context, eventTypes []EventType, handler Handler) error
	Close() error
}

// Handler processes a received event.
type Handler func(ctx context.Context, event *Event) error
