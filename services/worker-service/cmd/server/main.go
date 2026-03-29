package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-redis/redis/v8"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	"github.com/trustinbox/worker-service/internal/queue"
	"github.com/trustinbox/worker-service/internal/scheduler"
	"github.com/trustinbox/worker-service/internal/worker"
	"go.uber.org/zap"
)

func main() {
	cfg := config.LoadServiceConfig("worker-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting worker service")

	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("invalid redis URL", zap.Error(err))
	}
	redisClient := redis.NewClient(opt)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	consumer := queue.NewRedisQueueConsumer(redisClient, log)
	consumer.Register("DELIVERY", worker.NewDeliveryProcessor(log))
	consumer.Register("CALLBACK_REMINDER", worker.NewCallbackReminderProcessor(log))
	consumer.Register("CLEANUP", worker.NewCleanupProcessor(log))

	consumer.Start(ctx)

	sched := scheduler.New(log)
	sched.Start(ctx)

	log.Info("worker service ready, waiting for jobs")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down worker service")
	consumer.Stop()
	sched.Stop()
}
