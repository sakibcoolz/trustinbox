package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/trustinbox/worker-service/internal/worker"
	"go.uber.org/zap"
)

const (
	queueKey = "trustinbox:jobs"
	maxRetry = 3
)

// RedisQueueConsumer polls a Redis list for background jobs and dispatches them
// to registered processors.
type RedisQueueConsumer struct {
	client     *redis.Client
	processors map[string]worker.JobProcessor
	log        *zap.Logger
	stopCh     chan struct{}
}

// NewRedisQueueConsumer creates a RedisQueueConsumer backed by the given client.
func NewRedisQueueConsumer(client *redis.Client, log *zap.Logger) *RedisQueueConsumer {
	return &RedisQueueConsumer{
		client:     client,
		processors: make(map[string]worker.JobProcessor),
		log:        log,
		stopCh:     make(chan struct{}),
	}
}

// Register associates a processor with a job type string.
func (c *RedisQueueConsumer) Register(jobType string, processor worker.JobProcessor) {
	c.processors[jobType] = processor
}

// Start begins polling the queue in a background goroutine. It blocks until ctx
// is cancelled or Stop is called, then drains and exits.
func (c *RedisQueueConsumer) Start(ctx context.Context) {
	go func() {
		c.log.Info("queue consumer started", zap.String("queue", queueKey))
		for {
			select {
			case <-c.stopCh:
				c.log.Info("queue consumer stopping")
				return
			case <-ctx.Done():
				c.log.Info("queue consumer context cancelled")
				return
			default:
			}

			// BRPOP blocks up to 1 s so we can check for stop regularly.
			result, err := c.client.BRPop(ctx, time.Second, queueKey).Result()
			if err != nil {
				if err == redis.Nil || err == context.DeadlineExceeded || err == context.Canceled {
					continue
				}
				c.log.Error("failed to pop job from queue", zap.Error(err))
				time.Sleep(time.Second)
				continue
			}

			// BRPOP returns [key, value].
			if len(result) < 2 {
				continue
			}

			raw := result[1]
			var job worker.Job
			if err := json.Unmarshal([]byte(raw), &job); err != nil {
				c.log.Error("failed to unmarshal job", zap.Error(err), zap.String("raw", raw))
				continue
			}

			go c.dispatch(ctx, &job)
		}
	}()
}

// Stop signals the consumer to stop polling.
func (c *RedisQueueConsumer) Stop() {
	close(c.stopCh)
}

func (c *RedisQueueConsumer) dispatch(ctx context.Context, job *worker.Job) {
	processor, ok := c.processors[job.Type]
	if !ok {
		c.log.Warn("no processor registered for job type", zap.String("type", job.Type), zap.String("job_id", job.ID))
		return
	}

	job.Status = "PROCESSING"
	job.Attempts++

	c.log.Info("processing job",
		zap.String("job_id", job.ID),
		zap.String("type", job.Type),
		zap.Int("attempt", job.Attempts),
	)

	if err := processor.Process(ctx, job); err != nil {
		c.log.Error("job failed",
			zap.String("job_id", job.ID),
			zap.String("type", job.Type),
			zap.Int("attempt", job.Attempts),
			zap.Error(err),
		)
		if job.Attempts < maxRetry {
			job.Status = "RETRY"
			c.enqueue(ctx, job)
		} else {
			job.Status = "FAILED"
			c.log.Error("job exhausted retries",
				zap.String("job_id", job.ID),
				zap.String("type", job.Type),
			)
		}
		return
	}

	job.Status = "COMPLETED"
	c.log.Info("job completed",
		zap.String("job_id", job.ID),
		zap.String("type", job.Type),
	)
}

func (c *RedisQueueConsumer) enqueue(ctx context.Context, job *worker.Job) {
	data, err := json.Marshal(job)
	if err != nil {
		c.log.Error("failed to marshal job for re-enqueue", zap.Error(err), zap.String("job_id", job.ID))
		return
	}
	if err := c.client.LPush(ctx, queueKey, data).Err(); err != nil {
		c.log.Error("failed to re-enqueue job", zap.Error(err), zap.String("job_id", job.ID))
	}
}
