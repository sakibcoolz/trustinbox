package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/analytics-service/internal/consumer"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
)

func main() {
	cfg := config.LoadServiceConfig("analytics-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting analytics service")

	// Initialize event router
	router := events.NewEventRouter(256, log)

	// Initialize and register analytics event consumer
	analyticsConsumer := consumer.NewEventConsumer(log)
	analyticsConsumer.Register(router)

	// Start event router
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go router.Start(ctx)

	log.Info("analytics service ready, aggregating events")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down analytics service")
	cancel()
	router.Stop()
}
