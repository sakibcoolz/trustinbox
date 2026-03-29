package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/trustinbox/auth-service/internal/infra/postgres"
	"github.com/trustinbox/auth-service/internal/usecase"
	grpchandler "github.com/trustinbox/auth-service/internal/delivery/grpc"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	authv1 "github.com/trustinbox/proto/gen/auth/v1"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("auth-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting auth service", zap.String("grpc_port", cfg.GRPCPort))

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()

	tokenSvc := jwt.NewTokenService(cfg.JWTSecret, 15*time.Minute, 7*24*time.Hour)
	userRepo := postgres.NewUserRepository(db)
	tokenRepo := postgres.NewTokenRepository(db)

	uc := usecase.NewAuthUseCase(userRepo, tokenRepo, tokenSvc, log)
	authHandler := grpchandler.NewAuthGRPCHandler(uc, tokenSvc, tokenRepo)

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

	authv1.RegisterAuthServiceServer(srv, authHandler)
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

	log.Info("shutting down auth service")
	srv.GracefulStop()
}
