package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-redis/redis/v8"
	_ "github.com/lib/pq"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	policyv1 "github.com/trustinbox/proto/gen/policy/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	grpchandler "github.com/trustinbox/policy-service/internal/delivery/grpc"
	infrapostgres "github.com/trustinbox/policy-service/internal/infra/postgres"
	"github.com/trustinbox/policy-service/internal/usecase"
)

func main() {
	cfg := config.LoadServiceConfig("policy-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting policy service", zap.String("grpc_port", cfg.GRPCPort))

	// Connect to Postgres
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open postgres connection", zap.Error(err))
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping postgres", zap.Error(err))
	}
	log.Info("connected to postgres")

	// Connect to Redis
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("failed to parse redis URL", zap.Error(err))
	}
	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()
	log.Info("connected to redis")

	// Wire up repositories and use cases
	userPrefRepo := infrapostgres.NewUserPreferenceRepository(db)
	orgRepo := infrapostgres.NewOrganizationRepository(db)
	freqRepo := infrapostgres.NewFrequencyRepository(redisClient)

	evaluator := usecase.NewPolicyEvaluator(userPrefRepo, orgRepo, freqRepo, log)
	handler := grpchandler.NewPolicyGRPCHandler(evaluator, log)

	// Create gRPC server with interceptors
	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)

	// Register services
	policyv1.RegisterPolicyServiceServer(srv, handler)
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

	log.Info("shutting down policy service")
	srv.GracefulStop()
}
