package repository

import (
	"context"

	"github.com/trustinbox/analytics-service/internal/domain/entity"
)

// EventMetricRepository persists aggregated event metrics.
type EventMetricRepository interface {
	IncrementCounter(ctx context.Context, eventType, orgID, period string) error
	GetMetrics(ctx context.Context, eventType, orgID, period string) (*entity.EventMetric, error)
	ListMetrics(ctx context.Context, orgID, period string, limit, offset int) ([]entity.EventMetric, error)
}

// DeliveryStatsRepository persists delivery statistics.
type DeliveryStatsRepository interface {
	GetStats(ctx context.Context, orgID, period string) (*entity.DeliveryStats, error)
}

// PolicyStatsRepository persists policy decision statistics.
type PolicyStatsRepository interface {
	GetStats(ctx context.Context, orgID, period string) (*entity.PolicyStats, error)
}
