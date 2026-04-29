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
	"github.com/trustinbox/notification-service/internal/consumer"
	grpcdelivery "github.com/trustinbox/notification-service/internal/delivery/grpc"
	"github.com/trustinbox/notification-service/internal/infra/postgres"
	"github.com/trustinbox/notification-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/notification/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("notification-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

	log.Info("starting notification service", zap.String("grpc_port", cfg.GRPCPort))

	// Database connection
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping database", zap.Error(err))
	}
	log.Info("connected to database")

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	// Redis for event publishing + consuming
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("invalid redis url", zap.Error(err))
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	publisher := events.NewDualPublisher(rdb, log, "trustinbox:events")
	defer publisher.Close()

	// PostgreSQL repository implementations
	notifRepo := postgres.NewNotificationRepository(db)
	deliveryRepo := postgres.NewDeliveryRepository(db)

	// PolicyChecker and QueuePublisher left nil for now — will be wired when policy integration is ready
	notifUC := usecase.NewNotificationUseCase(notifRepo, deliveryRepo, nil, nil, publisher, log)
	handler := grpcdelivery.NewNotificationHandler(notifUC)

	// Event consumer for real-time push notifications
	hostname, _ := os.Hostname()
	ec := consumer.NewEventConsumer(nil, log) // TODO: Replace nil with real PushNotifier
	streamConsumer := events.NewRedisStreamConsumer(
		rdb, log,
		consumer.StreamName,
		consumer.ConsumerGroup,
		fmt.Sprintf("notification-%s", hostname),
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

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.TracingUnaryInterceptor(cfg.ServiceName),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)
	pb.RegisterNotificationServiceServer(srv, handler)

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

	log.Info("shutting down notification service")
	cancel()
	srv.GracefulStop()
}
