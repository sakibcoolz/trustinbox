package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	notifv1 "github.com/trustinbox/proto/gen/notification/v1"
	grpchandler "github.com/trustinbox/notification-service/internal/delivery/grpc"
	grpcclient "github.com/trustinbox/notification-service/internal/infra/grpcclient"
	infrapostgres "github.com/trustinbox/notification-service/internal/infra/postgres"
	"github.com/trustinbox/notification-service/internal/infra/queue"
	"github.com/trustinbox/notification-service/internal/usecase"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("notification-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting notification service", zap.String("grpc_port", cfg.GRPCPort))

	// Connect to Postgres
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open postgres connection", zap.Error(err))
	}
	defer db.Close()
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping postgres", zap.Error(err))
	}
	log.Info("connected to postgres")

	// Connect to policy service
	policyAddr := config.GetEnv("POLICY_SERVICE_ADDR", "localhost:50053")
	policyConn, err := grpc.Dial(policyAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to policy service", zap.Error(err))
	}
	defer policyConn.Close()

	// Wire up repositories
	notifRepo := infrapostgres.NewNotificationRepository(db)
	deliveryRepo := infrapostgres.NewDeliveryRepository(db)

	// Wire up infra dependencies
	policyClient := grpcclient.NewPolicyGRPCClient(policyConn)
	memQueue := queue.NewMemoryQueue(log)

	// Wire up use case
	uc := usecase.NewNotificationUseCase(notifRepo, deliveryRepo, policyClient, memQueue, log)

	// Create handler
	handler := grpchandler.NewNotificationGRPCHandler(uc, log)

	// Create gRPC server with interceptors
	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)

	// Register services
	notifv1.RegisterNotificationServiceServer(srv, handler)
	healthSrv := health.NewServer()
	grpc_health_v1.RegisterHealthServer(srv, healthSrv)
	reflection.Register(srv)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

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
	srv.GracefulStop()
}
