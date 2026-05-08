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
	grpcdelivery "github.com/trustinbox/bot-service/internal/delivery/grpc"
	"github.com/trustinbox/bot-service/internal/infra/n8n"
	"github.com/trustinbox/bot-service/internal/infra/postgres"
	"github.com/trustinbox/bot-service/internal/usecase"
	"github.com/trustinbox/cornerstone/config"
	"github.com/trustinbox/cornerstone/events"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	"github.com/trustinbox/cornerstone/tracing"
	aiv1 "github.com/trustinbox/proto/gen/ai/v1"
	pb "github.com/trustinbox/proto/gen/bot/v1"
	communicationv1 "github.com/trustinbox/proto/gen/communication/v1"
	documentv1 "github.com/trustinbox/proto/gen/document/v1"
	notificationv1 "github.com/trustinbox/proto/gen/notification/v1"
	policyv1 "github.com/trustinbox/proto/gen/policy/v1"
	userv1 "github.com/trustinbox/proto/gen/user/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("bot-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

	log.Info("starting bot service", zap.String("grpc_port", cfg.GRPCPort))

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
	botRepo := postgres.NewBotRepository(db)
	configRepo := postgres.NewBotConfigurationRepository(db)
	permRepo := postgres.NewBotPermissionRepository(db)
	sourceRepo := postgres.NewKnowledgeSourceRepository(db)
	actionRepo := postgres.NewBotActionLogRepository(db)
	statsRepo := postgres.NewBotAnalyticsRepository(db)
	workflowRepo := postgres.NewBotWorkflowConfigRepository(db)
	suspensionRepo := postgres.NewBotWorkflowSuspensionRepository(db)
	agentSuiteRepo := postgres.NewAgentSuiteRepository(db)
	delegationRepo := postgres.NewAgentDelegationRepository(db)

	// Redis for event publishing
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatal("invalid redis url", zap.Error(err))
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	publisher := events.NewDualPublisher(rdb, log, "trustinbox:events")
	defer publisher.Close()

	// AI service gRPC client
	aiAddr := config.GetEnv("AI_SERVICE_ADDR", "localhost:50057")
	aiConn, err := grpc.NewClient(aiAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to ai-service", zap.Error(err))
	}
	defer aiConn.Close()
	aiClient := aiv1.NewAIServiceClient(aiConn)

	// User service gRPC client
	userAddr := config.GetEnv("USER_SERVICE_ADDR", "localhost:50052")
	userConn, err := grpc.NewClient(userAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to user-service", zap.Error(err))
	}
	defer userConn.Close()
	userClient := userv1.NewUserServiceClient(userConn)

	// Notification service gRPC client
	notifAddr := config.GetEnv("NOTIFICATION_SERVICE_ADDR", "localhost:50055")
	notifConn, err := grpc.NewClient(notifAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to notification-service", zap.Error(err))
	}
	defer notifConn.Close()
	notifClient := notificationv1.NewNotificationServiceClient(notifConn)

	// Communication service gRPC client
	commAddr := config.GetEnv("COMMUNICATION_SERVICE_ADDR", "localhost:50056")
	commConn, err := grpc.NewClient(commAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to communication-service", zap.Error(err))
	}
	defer commConn.Close()
	commClient := communicationv1.NewCommunicationServiceClient(commConn)

	// Policy service gRPC client
	policyAddr := config.GetEnv("POLICY_SERVICE_ADDR", "localhost:50053")
	policyConn, err := grpc.NewClient(policyAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to policy-service", zap.Error(err))
	}
	defer policyConn.Close()
	botPolicyClient := policyv1.NewPolicyServiceClient(policyConn)

	// Document service gRPC client
	docAddr := config.GetEnv("DOCUMENT_SERVICE_ADDR", "localhost:50062")
	docConn, err := grpc.NewClient(docAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal("failed to connect to document-service", zap.Error(err))
	}
	defer docConn.Close()
	docClient := documentv1.NewDocumentServiceClient(docConn)

	// n8n workflow dispatcher (optional — disabled if N8N_BASE_URL is empty)
	var workflowDispatcher usecase.WorkflowDispatcher
	n8nBaseURL := config.GetEnv("N8N_BASE_URL", "")
	if n8nBaseURL != "" {
		n8nClient := n8n.NewClient(
			n8nBaseURL,
			config.GetEnv("N8N_WEBHOOK_SECRET", ""),
			log,
		)
		workflowDispatcher = n8n.NewDispatcher(n8nClient)
		log.Info("n8n workflow dispatcher enabled", zap.String("base_url", n8nBaseURL))
	} else {
		log.Info("n8n workflow dispatcher disabled (set N8N_BASE_URL to enable)")
	}
	resumeBaseURL := config.GetEnv("GATEWAY_PUBLIC_URL", "")

	// Use case
	botUC := usecase.NewBotUseCase(
		botRepo, configRepo, permRepo, sourceRepo, actionRepo, statsRepo,
		workflowRepo, suspensionRepo,
		agentSuiteRepo, delegationRepo,
		nil, aiClient,
		userClient, notifClient, commClient, botPolicyClient, docClient,
		workflowDispatcher, resumeBaseURL,
		publisher, log,
	)

	// gRPC handler
	handler := grpcdelivery.NewBotHandler(botUC)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcinterceptors.ContextPropagationUnaryInterceptor(),
			grpcinterceptors.TracingUnaryInterceptor(cfg.ServiceName),
			grpcinterceptors.LoggingUnaryInterceptor(log),
		),
	)
	pb.RegisterBotServiceServer(srv, handler)
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

	log.Info("shutting down bot service")
	srv.GracefulStop()
}
