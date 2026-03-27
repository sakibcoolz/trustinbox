package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("policy-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting policy service",
		zap.String("grpc_port", cfg.GRPCPort),
	)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer()

	// Register health check
	healthSrv := health.NewServer()
	grpc_health_v1.RegisterHealthServer(srv, healthSrv)

	// Enable reflection for dev
	reflection.Register(srv)

	// TODO: Register policy gRPC service handler
	// policyv1.RegisterPolicyServiceServer(srv, handler)

	go func() {
		log.Info("gRPC server listening", zap.String("addr", lis.Addr().String()))
		if err := srv.Serve(lis); err != nil {
			log.Fatal("gRPC server failed", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down policy service")
	srv.GracefulStop()
}
