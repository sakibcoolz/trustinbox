package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/crypto"
	logger "github.com/trustinbox/cornerstone/logging"
	pb "github.com/trustinbox/proto/gen/user/v1"
	grpcdelivery "github.com/trustinbox/user-service/internal/delivery/grpc"
	"github.com/trustinbox/user-service/internal/usecase"
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

	// Field-level encryption for PII data.
	// The master key MUST be injected via ENCRYPTION_MASTER_KEY env var in
	// production.  A deterministic dev-only fallback is used when unset.
	masterKey := config.GetEnv("ENCRYPTION_MASTER_KEY", "dev-master-key-change-in-production")
	encryptor := crypto.NewEncryptor(masterKey)
	log.Info("PII field encryption initialised",
		zap.Bool("production_key", os.Getenv("ENCRYPTION_MASTER_KEY") != ""),
	)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	// TODO: Replace nil with PostgreSQL repository implementations.
	// When ready, wrap profile and identity repos with encryption:
	//   profileRepo = encryption.NewEncryptedUserProfileRepository(pgProfileRepo, encryptor)
	//   identityRepo = encryption.NewEncryptedUserIdentityRepository(pgIdentityRepo, encryptor)
	_ = encryptor // will be used when repo implementations are wired
	userUC := usecase.NewUserUseCase(nil, nil, nil, nil, nil, log)
	handler := grpcdelivery.NewUserHandler(userUC)

	srv := grpc.NewServer()
	pb.RegisterUserServiceServer(srv, handler)

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

	log.Info("shutting down user service")
	srv.GracefulStop()
}
