package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
	"github.com/trustinbox/webhook-service/internal/consumer"
)

func main() {
	cfg := config.LoadServiceConfig("webhook-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting webhook service")

	// Initialize event router
	router := events.NewEventRouter(256, log)

	// Initialize and register event consumer (consumes all event types)
	webhookConsumer := consumer.NewEventConsumer(nil, log)
	webhookConsumer.Register(router)

	// Start event router
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go router.Start(ctx)

	log.Info("webhook service ready, consuming all events")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down webhook service")
	cancel()
	router.Stop()
}
