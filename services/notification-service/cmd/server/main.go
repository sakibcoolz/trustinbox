package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcdelivery "github.com/trustinbox/notification-service/internal/delivery/grpc"
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

	log.Info("starting notification service", zap.String("grpc_port", cfg.GRPCPort))

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	// TODO: Replace nil with PostgreSQL repository implementations and real PolicyChecker/QueuePublisher
	notifUC := usecase.NewNotificationUseCase(nil, nil, nil, nil, log)
	handler := grpcdelivery.NewNotificationHandler(notifUC)

	srv := grpc.NewServer()
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
	srv.GracefulStop()
}
