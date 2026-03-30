package events

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

// EventHandler processes a single domain event.
type EventHandler func(ctx context.Context, event Event) error

// EventConsumer receives events and dispatches them to registered handlers.
type EventConsumer interface {
	// Subscribe registers a handler for specific event types.
	Subscribe(handler EventHandler, eventTypes ...EventType)
	// Start begins consuming events (blocking).
	Start(ctx context.Context) error
	// Stop gracefully shuts down the consumer.
	Stop() error
}

// EventRouter dispatches events to matching handlers. It also implements
// EventPublisher so it can be used as a local in-memory event bus.
type EventRouter struct {
	mu       sync.RWMutex
	handlers map[EventType][]EventHandler
	ch       chan Event
	log      *zap.Logger
	done     chan struct{}
}

// NewEventRouter creates a new in-memory event router with the given channel
// buffer size.
func NewEventRouter(bufferSize int, log *zap.Logger) *EventRouter {
	return &EventRouter{
		handlers: make(map[EventType][]EventHandler),
		ch:       make(chan Event, bufferSize),
		log:      log,
		done:     make(chan struct{}),
	}
}

// Subscribe registers a handler for one or more event types.
func (r *EventRouter) Subscribe(handler EventHandler, eventTypes ...EventType) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, et := range eventTypes {
		r.handlers[et] = append(r.handlers[et], handler)
	}
}

// Publish enqueues an event into the router for async dispatch.
func (r *EventRouter) Publish(ctx context.Context, event Event) error {
	select {
	case r.ch <- event:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Start processes events until the context is cancelled.
func (r *EventRouter) Start(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			close(r.done)
			return nil
		case evt := <-r.ch:
			r.dispatch(ctx, evt)
		}
	}
}

// Stop signals the router to shut down and waits for completion.
func (r *EventRouter) Stop() error {
	<-r.done
	return nil
}

func (r *EventRouter) dispatch(ctx context.Context, evt Event) {
	r.mu.RLock()
	handlers := r.handlers[evt.Type]
	r.mu.RUnlock()

	for _, h := range handlers {
		if err := h(ctx, evt); err != nil {
			r.log.Error("event handler failed",
				zap.String("event_type", string(evt.Type)),
				zap.String("event_id", evt.ID),
				zap.Error(err),
			)
		}
	}
}

// Pending returns the number of events waiting in the channel buffer.
// Useful for tests and metrics.
func (r *EventRouter) Pending() int {
	return len(r.ch)
}
