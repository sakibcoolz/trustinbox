package main

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	"github.com/trustinbox/cornerstone/tracing"
	pb "github.com/trustinbox/proto/gen/webhook/v1"
	"github.com/trustinbox/webhook-service/internal/consumer"
	grpcdelivery "github.com/trustinbox/webhook-service/internal/delivery/grpc"
	httpdelivery "github.com/trustinbox/webhook-service/internal/delivery/http"
	"github.com/trustinbox/webhook-service/internal/infra/postgres"
	"github.com/trustinbox/webhook-service/internal/usecase"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("webhook-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

	log.Info("starting webhook service", zap.String("grpc_port", cfg.GRPCPort))

	// Database
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping database", zap.Error(err))
	}

	// Redis
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("invalid redis url", zap.Error(err))
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	// Repositories
	subRepo := postgres.NewSubscriptionRepository(db)
	deliveryRepo := postgres.NewDeliveryRepository(db)

	// Use case
	webhookUC := usecase.NewWebhookUseCase(subRepo, deliveryRepo)

	// gRPC handler
	handler := grpcdelivery.NewWebhookHandler(webhookUC)

	// Event consumer (Redis Streams → match subscriptions)
	hostname, _ := os.Hostname()
	ec := consumer.NewEventConsumer(webhookUC, log)
	streamConsumer := events.NewRedisStreamConsumer(
		rdb, log,
		consumer.StreamName,
		consumer.ConsumerGroup,
		fmt.Sprintf("webhook-%s", hostname),
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := streamConsumer.Start(ctx, ec.Handle); err != nil {
		log.Fatal("start stream consumer", zap.Error(err))
	}
	log.Info("event consumer started",
		zap.String("stream", consumer.StreamName),
		zap.String("group", consumer.ConsumerGroup),
	)

	// HTTP delivery worker (POST to subscriber URLs with HMAC signing)
	deliveryWorker := httpdelivery.NewDeliveryWorker(subRepo, deliveryRepo, log)
	go deliveryWorker.Start(ctx)

	// gRPC server
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.TracingUnaryInterceptor(cfg.ServiceName),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)
	pb.RegisterWebhookServiceServer(srv, handler)
	healthSrv := health.NewServer()
	grpc_health_v1.RegisterHealthServer(srv, healthSrv)
	reflection.Register(srv)

	go func() {
		log.Info("gRPC server listening", zap.String("addr", lis.Addr().String()))
		if err := srv.Serve(lis); err != nil {
			log.Fatal("gRPC server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down webhook service")
	cancel()
	srv.GracefulStop()
}
