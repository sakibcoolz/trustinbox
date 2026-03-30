package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	grpcdelivery "github.com/trustinbox/communication-service/internal/delivery/grpc"
	"github.com/trustinbox/communication-service/internal/infra/postgres"
	"github.com/trustinbox/communication-service/internal/usecase"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
	pb "github.com/trustinbox/proto/gen/communication/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("communication-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting communication service", zap.String("grpc_port", cfg.GRPCPort))

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

	// Redis for event publishing
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("invalid redis url", zap.Error(err))
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	publisher := events.NewRedisStreamPublisher(rdb, log, "trustinbox:events")
	defer publisher.Close()

	// PostgreSQL repository implementations
	callbackRepo := postgres.NewCallbackRequestRepository(db)
	convRepo := postgres.NewConversationRepository(db)
	msgRepo := postgres.NewMessageRepository(db)
	spamRepo := postgres.NewSpamReportRepository(db)

	// PolicyChecker left nil for now — will be wired when cross-service integration is ready
	commUC := usecase.NewCommunicationUseCase(callbackRepo, convRepo, msgRepo, spamRepo, nil, publisher, log)
	handler := grpcdelivery.NewCommunicationHandler(commUC)

	srv := grpc.NewServer()
	pb.RegisterCommunicationServiceServer(srv, handler)

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

	log.Info("shutting down communication service")
	srv.GracefulStop()
}
