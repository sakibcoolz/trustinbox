package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/redis/go-redis/v9"
	grpcdelivery "github.com/trustinbox/ai-service/internal/delivery/grpc"
	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/domain/repository"
	chromainfra "github.com/trustinbox/ai-service/internal/infra/chromadb"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	redisinfra "github.com/trustinbox/ai-service/internal/infra/redis"
	"github.com/trustinbox/ai-service/internal/usecase"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	grpcinterceptors "github.com/trustinbox/cornerstone/middleware"
	"github.com/trustinbox/cornerstone/tracing"
	pb "github.com/trustinbox/proto/gen/ai/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.LoadServiceConfig("ai-service")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

	log.Info("starting AI service", zap.String("grpc_port", cfg.GRPCPort))

	// LLM providers
	openaiKey := config.GetEnv("OPENAI_API_KEY", "")
	anthropicKey := config.GetEnv("ANTHROPIC_API_KEY", "")
	defaultProvider := config.GetEnv("DEFAULT_LLM_PROVIDER", "openai")

	var providers []llm.Provider
	if openaiKey != "" {
		providers = append(providers, llm.NewOpenAIProvider(openaiKey, config.GetEnv("OPENAI_BASE_URL", "")))
		log.Info("registered OpenAI provider")
	}
	if anthropicKey != "" {
		providers = append(providers, llm.NewAnthropicProvider(anthropicKey, config.GetEnv("ANTHROPIC_BASE_URL", "")))
		log.Info("registered Anthropic provider")
	}

	router := llm.NewRouter(providers, entity.LLMProvider(defaultProvider))

	// Tool registry and executor
	registry := usecase.NewToolRegistry()
	usecase.RegisterDefaultTools(registry)
	toolExecutor := usecase.NewToolExecutor(registry)

	// Knowledge chunk repository — ChromaDB with OpenAI embeddings.
	// Falls back to the in-memory store when CHROMADB_URL or OPENAI_API_KEY
	// is not set so local development without ChromaDB continues to work.
	chromaURL := config.GetEnv("CHROMADB_URL", "")
	var chunkRepo repository.KnowledgeChunkRepository
	if chromaURL != "" && openaiKey != "" {
		chromaClient := chromainfra.NewClient(chromaURL, openaiKey, log)
		chunkRepo = chromainfra.NewRepository(chromaClient, log)
		log.Info("using ChromaDB for knowledge storage",
			zap.String("chromadb_url", chromaURL),
			zap.String("embedding_model", "text-embedding-3-small"),
		)
	} else {
		chunkRepo = NewInMemoryKnowledgeChunkRepo()
		log.Warn("CHROMADB_URL or OPENAI_API_KEY not set — using in-memory knowledge store (not suitable for production)")
	}

	// Sub-components
	rag := usecase.NewRAGPipeline(chunkRepo, router)
	summarizer := usecase.NewSummarizer(router)
	categorizer := usecase.NewCategorizer(router)
	spamDetector := usecase.NewSpamDetector(router, 0.5, 0.8)

	// Orchestrator
	orch := usecase.NewOrchestrator(router, toolExecutor, rag, summarizer, categorizer, spamDetector)

	// Redis conversation repository — persists summaries and message history
	// partitioned by service_provider_id for tenant isolation.
	redisURL := config.GetEnv("REDIS_URL", "redis://localhost:6379")
	redisOpts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Warn("failed to parse REDIS_URL; conversation summaries will not be persisted", zap.Error(err))
	} else {
		rdb := redis.NewClient(redisOpts)
		convRepo := redisinfra.NewConversationRepository(rdb)
		orch = orch.WithConversationRepo(convRepo)
		log.Info("conversation repository wired to Redis", zap.String("redis_url", redisURL))
	}

	// gRPC handler
	handler := grpcdelivery.NewAIHandler(orch)

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
	pb.RegisterAIServiceServer(srv, handler)
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

	log.Info("shutting down AI service")
	srv.GracefulStop()
}
