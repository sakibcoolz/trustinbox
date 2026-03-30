package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	grpcdelivery "github.com/trustinbox/ai-service/internal/delivery/grpc"
	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	"github.com/trustinbox/ai-service/internal/usecase"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
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

	// Knowledge chunk repository (in-memory for now)
	chunkRepo := NewInMemoryKnowledgeChunkRepo()

	// Sub-components
	rag := usecase.NewRAGPipeline(chunkRepo, router)
	summarizer := usecase.NewSummarizer(router)
	categorizer := usecase.NewCategorizer(router)
	spamDetector := usecase.NewSpamDetector(router, 0.5, 0.8)

	// Orchestrator
	orch := usecase.NewOrchestrator(router, toolExecutor, rag, summarizer, categorizer, spamDetector)

	// gRPC handler
	handler := grpcdelivery.NewAIHandler(orch)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatal("failed to listen", zap.Error(err))
	}

	srv := grpc.NewServer()
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
