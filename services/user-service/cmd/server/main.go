package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	grpchandler "github.com/trustinbox/user-service/internal/delivery/grpc"
	"github.com/trustinbox/user-service/internal/infra/postgres"
	"github.com/trustinbox/user-service/internal/usecase"

	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	userv1 "github.com/trustinbox/proto/gen/user/v1"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("user-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting user service", zap.String("grpc_port", cfg.GRPCPort))

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()

	profileRepo := postgres.NewUserProfileRepository(db)
	privacyRepo := postgres.NewPrivacyPreferenceRepository(db)
	dndRepo := postgres.NewDNDRuleRepository(db)
	availabilityRepo := postgres.NewAvailabilitySlotRepository(db)
	blockRepo := postgres.NewBlockedOrganizationRepository(db)

	uc := usecase.NewUserUseCase(profileRepo, privacyRepo, dndRepo, availabilityRepo, blockRepo, log)
	handler := grpchandler.NewUserGRPCHandler(uc)

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

	userv1.RegisterUserServiceServer(srv, handler)
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

	log.Info("shutting down user service")
	srv.GracefulStop()
}

