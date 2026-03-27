package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
)

func main() {
	cfg := config.LoadServiceConfig("worker-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting worker service")

	// TODO: Initialize queue consumer
	// TODO: Initialize job processors
	// TODO: Start consuming messages

	log.Info("worker service ready, waiting for jobs")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down worker service")
}
