package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
	"github.com/trustinbox/worker-service/internal/clients"
	"github.com/trustinbox/worker-service/internal/worker"
	"go.uber.org/zap"

	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadServiceConfig("worker-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting worker service")

	// --- Database ---
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		envOr("DB_USER", "trustinbox"),
		envOr("DB_PASSWORD", "trustinbox_dev"),
		envOr("DB_HOST", "localhost"),
		envOr("DB_PORT", "5432"),
		envOr("DB_NAME", "trustinbox"),
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("connect to postgres", zap.Error(err))
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("ping postgres", zap.Error(err))
	}
	log.Info("connected to postgres")

	// --- Redis ---
	redisAddr := envOr("REDIS_ADDR", "localhost:6379")
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal("connect to redis", zap.Error(err))
	}
	defer rdb.Close()
	log.Info("connected to redis", zap.String("addr", redisAddr))

	// --- gRPC Service Clients ---
	svc, err := clients.NewServiceClients(log)
	if err != nil {
		log.Fatal("create service clients", zap.Error(err))
	}
	defer svc.Close()

	// --- Processors ---
	deliveryProc := worker.NewDeliveryProcessor(svc, log)
	callbackProc := worker.NewCallbackReminderProcessor(svc, log)
	campaignProc := worker.NewCampaignSendProcessor(svc, db, log)
	cleanupProc := worker.NewCleanupProcessor(db, log)

	// --- Dispatcher ---
	dispatcher := worker.NewDispatcher(deliveryProc, callbackProc, campaignProc, log)

	// --- Redis Streams Consumer ---
	hostname, _ := os.Hostname()
	consumer := events.NewRedisStreamConsumer(
		rdb, log,
		worker.StreamName,
		worker.ConsumerGroup,
		worker.ConsumerName(hostname),
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := consumer.Start(ctx, dispatcher.Handle); err != nil {
		log.Fatal("start stream consumer", zap.Error(err))
	}
	log.Info("stream consumer started",
		zap.String("stream", worker.StreamName),
		zap.String("group", worker.ConsumerGroup),
	)

	// --- Cleanup Ticker ---
	cleanupTicker := time.NewTicker(1 * time.Hour)
	defer cleanupTicker.Stop()
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-cleanupTicker.C:
				if err := cleanupProc.RunAll(ctx); err != nil {
					log.Error("cleanup cycle failed", zap.Error(err))
				}
			}
		}
	}()

	log.Info("worker service ready, consuming events")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down worker service")
	cancel()
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
