package worker

import (
	"context"
	"testing"

	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

func TestEventConsumer_SubscribedEventTypes(t *testing.T) {
	log := zap.NewNop()
	c := NewEventConsumer(
		NewDeliveryProcessor(log),
		NewCallbackReminderProcessor(log),
		NewCleanupProcessor(log),
		log,
	)
	types := c.SubscribedEventTypes()
	if len(types) == 0 {
		t.Error("expected at least one subscribed event type")
	}
	// Verify delivery, campaign, and cleanup events are included
	want := map[events.EventType]bool{
		events.NotificationCreated:    false,
		events.CampaignStarted:        false,
		events.CleanupStarted:         false,
		events.CallbackRequestExpired: false,
	}
	for _, et := range types {
		if _, ok := want[et]; ok {
			want[et] = true
		}
	}
	for et, found := range want {
		if !found {
			t.Errorf("expected event type %s in subscriptions", et)
		}
	}
}

func TestEventConsumer_HandleDeliveryEvent(t *testing.T) {
	log := zap.NewNop()
	c := NewEventConsumer(
		NewDeliveryProcessor(log),
		NewCallbackReminderProcessor(log),
		NewCleanupProcessor(log),
		log,
	)

	evt := events.NewEvent(events.NotificationCreated, "test", map[string]string{
		"notification_id": "notif-1",
	})
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEventConsumer_HandleCampaignEvent(t *testing.T) {
	log := zap.NewNop()
	c := NewEventConsumer(
		NewDeliveryProcessor(log),
		NewCallbackReminderProcessor(log),
		NewCleanupProcessor(log),
		log,
	)

	evt := events.NewEvent(events.CampaignStarted, "test", map[string]string{
		"campaign_id": "camp-1",
	})
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEventConsumer_HandleCleanupEvent(t *testing.T) {
	log := zap.NewNop()
	c := NewEventConsumer(
		NewDeliveryProcessor(log),
		NewCallbackReminderProcessor(log),
		NewCleanupProcessor(log),
		log,
	)

	evt := events.NewEvent(events.CleanupStarted, "test", nil)
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestEventConsumer_HandleUnsubscribedEvent(t *testing.T) {
	log := zap.NewNop()
	c := NewEventConsumer(
		NewDeliveryProcessor(log),
		NewCallbackReminderProcessor(log),
		NewCleanupProcessor(log),
		log,
	)

	// UserRegistered is not in the worker's subscribed types
	evt := events.NewEvent(events.UserRegistered, "test", nil)
	if err := c.Handle(context.Background(), evt); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
