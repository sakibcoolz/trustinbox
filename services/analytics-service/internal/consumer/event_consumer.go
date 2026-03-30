package consumer

import (
"context"
"time"

"github.com/google/uuid"
"github.com/trustinbox/analytics-service/internal/domain/entity"
"github.com/trustinbox/analytics-service/internal/domain/repository"
"github.com/trustinbox/cornerstone/events"
"go.uber.org/zap"
)

const (
StreamName    = "trustinbox:events"
ConsumerGroup = "analytics-service"
)

type EventConsumer struct {
repo   repository.AnalyticsRepository
logger *zap.Logger
}

func NewEventConsumer(repo repository.AnalyticsRepository, logger *zap.Logger) *EventConsumer {
return &EventConsumer{repo: repo, logger: logger}
}

func (c *EventConsumer) Handle(ctx context.Context, event *events.Event) error {
spID := event.ServiceProviderID
if spID == "" {
c.logger.Debug("skipping event without service_provider_id", zap.String("type", string(event.Type)))
return nil
}

now := time.Now().UTC().Truncate(24 * time.Hour)
d := &entity.DailyAnalytics{
ID:                uuid.New().String(),
ServiceProviderID: spID,
Date:              now,
}

switch event.Type {
case events.NotificationCreated:
d.NotificationsSent = 1
case events.NotificationDelivered:
d.NotificationsDelivered = 1
case events.NotificationArchived:
d.NotificationsFailed = 1

case events.CallbackRequested:
d.CallbacksRequested = 1
case events.CallbackApproved:
d.CallbacksApproved = 1
case events.CallbackRejected:
d.CallbacksDenied = 1

case events.CampaignLaunched:
d.CampaignsSent = 1
case events.CampaignCompleted:
d.CampaignsDelivered = 1

case events.BotActionExecuted:
d.BotActions = 1
case events.BotEscalated:
d.BotEscalations = 1

case events.WebhookDeliverySucceeded:
d.WebhooksSent = 1
case events.WebhookDeliveryFailed:
d.WebhooksFailed = 1

case events.PolicyEvaluated:
d.PolicyApprovals = 1

case events.SpamReported:
d.PolicyApprovals = 0 // Track as separate metric via spam counter in future

default:
c.logger.Debug("unhandled event type", zap.String("type", string(event.Type)))
return nil
}

if err := c.repo.UpsertDailyMetrics(ctx, d); err != nil {
c.logger.Error("upsert daily metrics failed",
zap.String("type", string(event.Type)),
zap.String("service_provider_id", spID),
zap.Error(err),
)
return err
}

c.logger.Debug("analytics metric recorded",
zap.String("type", string(event.Type)),
zap.String("service_provider_id", spID),
)
return nil
}
