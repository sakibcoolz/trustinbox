package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/crypto"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	"github.com/trustinbox/cornerstone/tracing"
	pb "github.com/trustinbox/proto/gen/user/v1"
	grpcdelivery "github.com/trustinbox/user-service/internal/delivery/grpc"
	"github.com/trustinbox/user-service/internal/infra/postgres"
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

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

	log.Info("starting user service", zap.String("grpc_port", cfg.GRPCPort))

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

	// PostgreSQL repository implementations
	_ = encryptor // will be used when encryption wrappers are wired
	profileRepo := postgres.NewUserProfileRepository(db)
	privacyRepo := postgres.NewPrivacyPreferenceRepository(db)
	dndRepo := postgres.NewDNDRuleRepository(db)
	availRepo := postgres.NewAvailabilitySlotRepository(db)
	blockRepo := postgres.NewBlockedServiceProviderRepository(db)
	addressRepo := postgres.NewUserAddressRepository(db)

	userUC := usecase.NewUserUseCase(profileRepo, privacyRepo, dndRepo, availRepo, blockRepo, addressRepo, log)
	handler := grpcdelivery.NewUserHandler(userUC)

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.TracingUnaryInterceptor(cfg.ServiceName),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)
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
