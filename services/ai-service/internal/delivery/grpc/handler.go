package grpc

import (
	"context"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/ai/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// AIHandler implements the AIServiceServer gRPC interface.
type AIHandler struct {
	pb.UnimplementedAIServiceServer
	orch *usecase.Orchestrator
}

// NewAIHandler creates a new AIHandler.
func NewAIHandler(orch *usecase.Orchestrator) *AIHandler {
	return &AIHandler{orch: orch}
}

func (h *AIHandler) ChatCompletion(ctx context.Context, req *pb.ChatCompletionRequest) (*pb.ChatCompletionResponse, error) {
	if req.GetModel() == "" && req.GetProvider() == "" {
		return nil, status.Error(codes.InvalidArgument, "model or provider is required")
	}

	msgs := make([]entity.ChatMessage, len(req.GetMessages()))
	for i, m := range req.GetMessages() {
		msgs[i] = entity.ChatMessage{
			Role:       entity.MessageRole(m.GetRole()),
			Content:    m.GetContent(),
			Name:       m.GetName(),
			ToolCallID: m.GetToolCallId(),
		}
	}

	tools := make([]entity.ToolDefinition, len(req.GetTools()))
	for i, t := range req.GetTools() {
		tools[i] = entity.ToolDefinition{
			Name:           t.GetName(),
			Description:    t.GetDescription(),
			ParametersJSON: t.GetParametersJson(),
		}
	}

	domainReq := &entity.CompletionRequest{
		Provider:          entity.LLMProvider(req.GetProvider()),
		Model:             req.GetModel(),
		Messages:          msgs,
		Tools:             tools,
		Temperature:       req.GetTemperature(),
		MaxTokens:         int(req.GetMaxTokens()),
		BotID:             req.GetBotId(),
		ServiceProviderID: req.GetServiceProviderId(),
	}

	resp, err := h.orch.ChatCompletion(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	pbToolCalls := make([]*pb.ToolCall, len(resp.ToolCalls))
	for i, tc := range resp.ToolCalls {
		pbToolCalls[i] = &pb.ToolCall{
			Id:            tc.ID,
			Name:          tc.Name,
			ArgumentsJson: tc.ArgumentsJSON,
		}
	}

	return &pb.ChatCompletionResponse{
		Content:          resp.Content,
		ToolCalls:        pbToolCalls,
		FinishReason:     resp.FinishReason,
		PromptTokens:     int32(resp.PromptTokens),
		CompletionTokens: int32(resp.CompletionTokens),
		Model:            resp.Model,
		Provider:         string(resp.Provider),
	}, nil
}

func (h *AIHandler) ExecuteTool(ctx context.Context, req *pb.ExecuteToolRequest) (*pb.ExecuteToolResponse, error) {
	if req.GetToolName() == "" {
		return nil, status.Error(codes.InvalidArgument, "tool_name is required")
	}

	domainReq := &entity.ToolExecutionRequest{
		BotID:             req.GetBotId(),
		ServiceProviderID: req.GetServiceProviderId(),
		ConversationID:    req.GetConversationId(),
		UserID:            req.GetUserId(),
		ToolName:          req.GetToolName(),
		ArgumentsJSON:     req.GetArgumentsJson(),
	}

	resp, err := h.orch.ExecuteTool(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	return &pb.ExecuteToolResponse{
		Success:      resp.Success,
		ResultJson:   resp.ResultJSON,
		ErrorMessage: resp.ErrorMessage,
		DurationMs:   int32(resp.DurationMS),
	}, nil
}

func (h *AIHandler) QueryKnowledge(ctx context.Context, req *pb.QueryKnowledgeRequest) (*pb.QueryKnowledgeResponse, error) {
	if req.GetBotId() == "" {
		return nil, status.Error(codes.InvalidArgument, "bot_id is required")
	}
	if req.GetQuery() == "" {
		return nil, status.Error(codes.InvalidArgument, "query is required")
	}
	if req.GetServiceProviderId() == "" {
		return nil, status.Error(codes.InvalidArgument, "service_provider_id is required")
	}

	domainReq := &entity.RAGQueryRequest{
		BotID:             req.GetBotId(),
		ServiceProviderID: req.GetServiceProviderId(),
		Query:             req.GetQuery(),
		TopK:              int(req.GetTopK()),
		MinScore:          req.GetMinScore(),
	}

	resp, err := h.orch.QueryKnowledge(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	pbChunks := make([]*pb.KnowledgeChunk, len(resp.Chunks))
	for i, c := range resp.Chunks {
		pbChunks[i] = &pb.KnowledgeChunk{
			ChunkId:        c.ChunkID,
			SourceId:       c.SourceID,
			SourceName:     c.SourceName,
			Content:        c.Content,
			RelevanceScore: c.RelevanceScore,
			Metadata:       c.Metadata,
		}
	}

	return &pb.QueryKnowledgeResponse{
		Chunks:              pbChunks,
		AugmentedPrompt:     resp.AugmentedPrompt,
		TotalChunksSearched: int32(resp.TotalChunksSearched),
	}, nil
}

func (h *AIHandler) SummarizeConversation(ctx context.Context, req *pb.SummarizeConversationRequest) (*pb.SummarizeConversationResponse, error) {
	if req.GetConversationId() == "" {
		return nil, status.Error(codes.InvalidArgument, "conversation_id is required")
	}

	msgs := make([]entity.ConversationMessage, len(req.GetMessages()))
	for i, m := range req.GetMessages() {
		msgs[i] = entity.ConversationMessage{
			Role:    m.GetRole(),
			Content: m.GetContent(),
		}
		if m.GetTimestamp() != nil {
			msgs[i].Timestamp = m.GetTimestamp().AsTime()
		}
	}

	domainReq := &entity.SummarizeRequest{
		BotID:             req.GetBotId(),
		ServiceProviderID: req.GetServiceProviderId(),
		ConversationID:    req.GetConversationId(),
		Messages:          msgs,
		SummaryType:       entity.SummaryType(req.GetSummaryType()),
	}

	resp, err := h.orch.SummarizeConversation(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	return &pb.SummarizeConversationResponse{
		Summary:      resp.Summary,
		KeyTopics:    resp.KeyTopics,
		ActionItems:  resp.ActionItems,
		Sentiment:    resp.Sentiment,
		MessageCount: int32(resp.MessageCount),
	}, nil
}

func (h *AIHandler) CategorizeMessage(ctx context.Context, req *pb.CategorizeMessageRequest) (*pb.CategorizeMessageResponse, error) {
	if req.GetContent() == "" {
		return nil, status.Error(codes.InvalidArgument, "content is required")
	}

	domainReq := &entity.CategorizeRequest{
		Content:         req.GetContent(),
		SenderID:        req.GetSenderId(),
		SenderType:      req.GetSenderType(),
		ContextMetadata: req.GetContextMetadata(),
	}

	resp, err := h.orch.CategorizeMessage(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	pbAllCategories := make([]*pb.CategoryResult, len(resp.AllCategories))
	for i, c := range resp.AllCategories {
		pbAllCategories[i] = &pb.CategoryResult{
			Category:    string(c.Category),
			Confidence:  c.Confidence,
			Subcategory: c.Subcategory,
		}
	}

	return &pb.CategorizeMessageResponse{
		PrimaryCategory: &pb.CategoryResult{
			Category:    string(resp.PrimaryCategory.Category),
			Confidence:  resp.PrimaryCategory.Confidence,
			Subcategory: resp.PrimaryCategory.Subcategory,
		},
		AllCategories: pbAllCategories,
		Reasoning:     resp.Reasoning,
	}, nil
}

func (h *AIHandler) DetectSpam(ctx context.Context, req *pb.DetectSpamRequest) (*pb.DetectSpamResponse, error) {
	if req.GetContent() == "" {
		return nil, status.Error(codes.InvalidArgument, "content is required")
	}

	domainReq := &entity.SpamDetectRequest{
		Content:        req.GetContent(),
		SenderID:       req.GetSenderId(),
		SenderType:     req.GetSenderType(),
		Metadata:       req.GetMetadata(),
		RecentMessages: req.GetRecentMessages(),
	}

	resp, err := h.orch.DetectSpam(ctx, domainReq)
	if err != nil {
		return nil, mapError(err)
	}

	pbSignals := make([]*pb.SpamSignal, len(resp.Signals))
	for i, s := range resp.Signals {
		pbSignals[i] = &pb.SpamSignal{
			SignalType:  s.SignalType,
			Weight:      s.Weight,
			Description: s.Description,
		}
	}

	return &pb.DetectSpamResponse{
		IsSpam:      resp.IsSpam,
		SpamScore:   resp.SpamScore,
		Decision:    string(resp.Decision),
		Signals:     pbSignals,
		Explanation: resp.Explanation,
	}, nil
}

// mapError converts internal business errors to gRPC status errors.
func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Error(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Error(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Error(codes.PermissionDenied, err.Error())
	case bizerr.IsPolicyDenied(err):
		return status.Error(codes.PermissionDenied, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}

// timestamppb is used for proto timestamp conversions.
var _ = timestamppb.Now
