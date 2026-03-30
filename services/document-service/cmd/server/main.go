package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	grpcdelivery "github.com/trustinbox/document-service/internal/delivery/grpc"
	"github.com/trustinbox/document-service/internal/infra/postgres"
	"github.com/trustinbox/document-service/internal/usecase"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	pb "github.com/trustinbox/proto/gen/document/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("document-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting document service", zap.String("grpc_port", cfg.GRPCPort))

	// Database connection
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping database", zap.Error(err))
	}

	// Repositories
	docRepo := postgres.NewDocumentRepository(db)
	versionRepo := postgres.NewDocumentVersionRepository(db)
	classRepo := postgres.NewDocumentClassificationRepository(db)
	downloadRepo := postgres.NewDownloadRecordRepository(db)

	// Use case (presigner is nil; replace with real S3 client in production)
	docUC := usecase.NewDocumentUseCase(docRepo, versionRepo, classRepo, downloadRepo, nil)

	// gRPC handler
	handler := grpcdelivery.NewDocumentHandler(docUC)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer()
	pb.RegisterDocumentServiceServer(srv, handler)
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

	log.Info("shutting down document service")
	srv.GracefulStop()
}
