package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	grpchandler "github.com/trustinbox/organization-service/internal/delivery/grpc"
	"github.com/trustinbox/organization-service/internal/infra/postgres"
	"github.com/trustinbox/organization-service/internal/usecase"

	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	orgv1 "github.com/trustinbox/proto/gen/organization/v1"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("organization-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting organization service", zap.String("grpc_port", cfg.GRPCPort))

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()

	orgRepo := postgres.NewOrganizationRepository(db)
	orgUserRepo := postgres.NewOrganizationUserRepository(db)

	uc := usecase.NewOrgUseCase(orgRepo, orgUserRepo, log)
	handler := grpchandler.NewOrgGRPCHandler(uc)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)

	orgv1.RegisterServiceProviderServiceServer(srv, handler)
	grpc_health_v1.RegisterHealthServer(srv, health.NewServer())
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

	log.Info("shutting down organization service")
	srv.GracefulStop()
}

