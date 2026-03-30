package events

import "context"

// EventPublisher publishes domain events.
type EventPublisher interface {
	Publish(ctx context.Context, event Event) error
}

// NoopPublisher silently discards every event. Use as a safe default when
// event publishing is not configured.
type NoopPublisher struct{}

func (NoopPublisher) Publish(context.Context, Event) error { return nil }
