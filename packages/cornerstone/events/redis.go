package events

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	channelPrefix = "trustinbox:events:"
	allChannel    = "trustinbox:events:*"
)

// ---------------------------------------------------------------------------
// RedisPublisher — fire-and-forget via Pub/Sub
// ---------------------------------------------------------------------------

// RedisPublisher publishes events via Redis Pub/Sub.
type RedisPublisher struct {
	client *redis.Client
	logger *zap.Logger
}

// NewRedisPublisher creates a new Redis-based event publisher.
func NewRedisPublisher(client *redis.Client, logger *zap.Logger) *RedisPublisher {
	return &RedisPublisher{
		client: client,
		logger: logger,
	}
}

func (p *RedisPublisher) Publish(ctx context.Context, event *Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	channel := channelPrefix + string(event.Type)
	if err := p.client.Publish(ctx, channel, data).Err(); err != nil {
		return fmt.Errorf("publish event to redis: %w", err)
	}
	p.logger.Debug("event published",
		zap.String("event_id", event.ID),
		zap.String("event_type", string(event.Type)),
		zap.String("channel", channel),
	)
	return nil
}

func (p *RedisPublisher) PublishBatch(ctx context.Context, events []*Event) error {
	pipe := p.client.Pipeline()
	for _, event := range events {
		data, err := json.Marshal(event)
		if err != nil {
			return fmt.Errorf("marshal event %s: %w", event.ID, err)
		}
		channel := channelPrefix + string(event.Type)
		pipe.Publish(ctx, channel, data)
	}
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("publish batch to redis: %w", err)
	}
	return nil
}

func (p *RedisPublisher) Close() error {
	return nil
}

// ---------------------------------------------------------------------------
// RedisSubscriber — Pub/Sub listener
// ---------------------------------------------------------------------------

// RedisSubscriber subscribes to events via Redis Pub/Sub.
type RedisSubscriber struct {
	client *redis.Client
	logger *zap.Logger
	pubsub *redis.PubSub
}

// NewRedisSubscriber creates a new Redis-based event subscriber.
func NewRedisSubscriber(client *redis.Client, logger *zap.Logger) *RedisSubscriber {
	return &RedisSubscriber{
		client: client,
		logger: logger,
	}
}

func (s *RedisSubscriber) Subscribe(ctx context.Context, eventTypes []EventType, handler Handler) error {
	channels := make([]string, len(eventTypes))
	for i, et := range eventTypes {
		channels[i] = channelPrefix + string(et)
	}
	s.pubsub = s.client.Subscribe(ctx, channels...)
	_, err := s.pubsub.Receive(ctx) // Wait for confirmation that subscription is created.
	if err != nil {
		return fmt.Errorf("subscribe to redis channels: %w", err)
	}
	s.logger.Info("subscribed to events",
		zap.String("channels", strings.Join(channels, ",")),
	)
	go s.listen(ctx, handler)
	return nil
}

func (s *RedisSubscriber) listen(ctx context.Context, handler Handler) {
	ch := s.pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var event Event
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				s.logger.Error("failed to unmarshal event",
					zap.Error(err),
					zap.String("channel", msg.Channel),
				)
				continue
			}
			if err := handler(ctx, &event); err != nil {
				s.logger.Error("event handler failed",
					zap.String("event_id", event.ID),
					zap.String("event_type", string(event.Type)),
					zap.Error(err),
				)
			}
		}
	}
}

func (s *RedisSubscriber) Close() error {
	if s.pubsub != nil {
		return s.pubsub.Close()
	}
	return nil
}

// ---------------------------------------------------------------------------
// RedisStreamPublisher — durable delivery via XADD
// ---------------------------------------------------------------------------

// RedisStreamPublisher uses Redis Streams for durable event delivery.
type RedisStreamPublisher struct {
	client     *redis.Client
	logger     *zap.Logger
	streamName string
}

// NewRedisStreamPublisher creates a publisher that uses Redis Streams for durability.
func NewRedisStreamPublisher(client *redis.Client, logger *zap.Logger, streamName string) *RedisStreamPublisher {
	return &RedisStreamPublisher{
		client:     client,
		logger:     logger,
		streamName: streamName,
	}
}

func (p *RedisStreamPublisher) Publish(ctx context.Context, event *Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	_, err = p.client.XAdd(ctx, &redis.XAddArgs{
		Stream: p.streamName,
		Values: map[string]interface{}{
			"event_type": string(event.Type),
			"data":       string(data),
		},
	}).Result()
	if err != nil {
		return fmt.Errorf("publish to redis stream: %w", err)
	}
	p.logger.Debug("event published to stream",
		zap.String("event_id", event.ID),
		zap.String("stream", p.streamName),
	)
	return nil
}

func (p *RedisStreamPublisher) PublishBatch(ctx context.Context, events []*Event) error {
	pipe := p.client.Pipeline()
	for _, event := range events {
		data, err := json.Marshal(event)
		if err != nil {
			return fmt.Errorf("marshal event %s: %w", event.ID, err)
		}
		pipe.XAdd(ctx, &redis.XAddArgs{
			Stream: p.streamName,
			Values: map[string]interface{}{
				"event_type": string(event.Type),
				"data":       string(data),
			},
		})
	}
	_, err := pipe.Exec(ctx)
	return err
}

func (p *RedisStreamPublisher) Close() error {
	return nil
}

// ---------------------------------------------------------------------------
// RedisStreamConsumer — consumer-group based stream reader
// ---------------------------------------------------------------------------

// RedisStreamConsumer consumes events from a Redis Stream using consumer groups.
type RedisStreamConsumer struct {
	client    *redis.Client
	logger    *zap.Logger
	stream    string
	group     string
	consumer  string
	batchSize int64
}

// NewRedisStreamConsumer creates a consumer for Redis Streams with consumer group support.
func NewRedisStreamConsumer(client *redis.Client, logger *zap.Logger, stream, group, consumer string) *RedisStreamConsumer {
	return &RedisStreamConsumer{
		client:    client,
		logger:    logger,
		stream:    stream,
		group:     group,
		consumer:  consumer,
		batchSize: 10,
	}
}

// Start begins consuming events from the stream.
func (c *RedisStreamConsumer) Start(ctx context.Context, handler Handler) error {
	// Create consumer group if it doesn't exist.
	err := c.client.XGroupCreateMkStream(ctx, c.stream, c.group, "0").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return fmt.Errorf("create consumer group: %w", err)
	}
	go c.consume(ctx, handler)
	return nil
}

func (c *RedisStreamConsumer) consume(ctx context.Context, handler Handler) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		streams, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    c.group,
			Consumer: c.consumer,
			Streams:  []string{c.stream, ">"},
			Count:    c.batchSize,
			Block:    2 * time.Second,
		}).Result()
		if err != nil {
			if err == redis.Nil {
				continue
			}
			c.logger.Error("stream read error", zap.Error(err))
			time.Sleep(time.Second)
			continue
		}

		for _, stream := range streams {
			for _, msg := range stream.Messages {
				data, ok := msg.Values["data"].(string)
				if !ok {
					continue
				}
				var event Event
				if err := json.Unmarshal([]byte(data), &event); err != nil {
					c.logger.Error("unmarshal stream event", zap.Error(err))
					continue
				}
				if err := handler(ctx, &event); err != nil {
					c.logger.Error("handler failed",
						zap.String("event_id", event.ID),
						zap.Error(err),
					)
				}
				c.client.XAck(ctx, c.stream, c.group, msg.ID)
			}
		}
	}
}

// ---------------------------------------------------------------------------
// DualPublisher — publishes to both Stream (durable) and Pub/Sub (real-time)
// ---------------------------------------------------------------------------

// DualPublisher writes each event to a Redis Stream (for worker consumption)
// and also publishes it to a Pub/Sub channel (for real-time SSE delivery).
type DualPublisher struct {
	stream *RedisStreamPublisher
	pubsub *RedisPublisher
	logger *zap.Logger
}

// NewDualPublisher creates a publisher that writes to both Redis Streams and Pub/Sub.
func NewDualPublisher(client *redis.Client, logger *zap.Logger, streamName string) *DualPublisher {
	return &DualPublisher{
		stream: NewRedisStreamPublisher(client, logger, streamName),
		pubsub: NewRedisPublisher(client, logger),
		logger: logger,
	}
}

func (d *DualPublisher) Publish(ctx context.Context, event *Event) error {
	// Stream publish is the primary (durable) path
	if err := d.stream.Publish(ctx, event); err != nil {
		return err
	}
	// Pub/Sub publish is best-effort for real-time SSE delivery
	if err := d.pubsub.Publish(ctx, event); err != nil {
		d.logger.Warn("pubsub publish failed (SSE delivery may be delayed)",
			zap.String("event_id", event.ID),
			zap.Error(err),
		)
	}
	return nil
}

func (d *DualPublisher) PublishBatch(ctx context.Context, evts []*Event) error {
	if err := d.stream.PublishBatch(ctx, evts); err != nil {
		return err
	}
	// Best-effort Pub/Sub for real-time
	if err := d.pubsub.PublishBatch(ctx, evts); err != nil {
		d.logger.Warn("pubsub batch publish failed", zap.Error(err))
	}
	return nil
}

func (d *DualPublisher) Close() error {
	_ = d.stream.Close()
	_ = d.pubsub.Close()
	return nil
}
