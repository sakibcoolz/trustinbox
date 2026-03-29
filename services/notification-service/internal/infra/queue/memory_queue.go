package queue

import (
	"context"

	"go.uber.org/zap"
)

// MemoryQueue is an in-memory implementation of usecase.QueuePublisher.
// It logs the publish request and is intended to be replaced with SQS/Kafka in production.
type MemoryQueue struct {
	log *zap.Logger
}

// NewMemoryQueue creates a new MemoryQueue.
func NewMemoryQueue(log *zap.Logger) *MemoryQueue {
	return &MemoryQueue{log: log}
}

// PublishDeliveryJob logs a delivery job publish request.
func (q *MemoryQueue) PublishDeliveryJob(ctx context.Context, notificationID string) error {
	q.log.Info("queue: publish delivery job",
		zap.String("notification_id", notificationID),
	)
	return nil
}
