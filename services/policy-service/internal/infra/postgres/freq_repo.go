package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type frequencyRepo struct {
	client *redis.Client
}

// NewFrequencyRepository creates a new FrequencyRepository backed by Redis.
func NewFrequencyRepository(client *redis.Client) repository.FrequencyRepository {
	return &frequencyRepo{client: client}
}

func adCountKey(userID, orgID string) string {
	date := time.Now().Format("2006-01-02")
	return fmt.Sprintf("ad_count:%s:%s:%s", userID, orgID, date)
}

func (r *frequencyRepo) GetAdCountForUser(ctx context.Context, userID, orgID string) (int, error) {
	key := adCountKey(userID, orgID)
	count, err := r.client.Get(ctx, key).Int()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func (r *frequencyRepo) IncrementAdCount(ctx context.Context, userID, orgID string) error {
	key := adCountKey(userID, orgID)
	if err := r.client.Incr(ctx, key).Err(); err != nil {
		return err
	}
	now := time.Now()
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	ttl := time.Until(nextMidnight)
	return r.client.Expire(ctx, key, ttl).Err()
}
