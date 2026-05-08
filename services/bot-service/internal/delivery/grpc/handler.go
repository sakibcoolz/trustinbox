package grpc

import (
	"context"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/bot/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// BotHandler implements the BotServiceServer gRPC interface.
type BotHandler struct {
	pb.UnimplementedBotServiceServer
	uc *usecase.BotUseCase
}

// NewBotHandler creates a new BotHandler.
func NewBotHandler(uc *usecase.BotUseCase) *BotHandler {
	return &BotHandler{uc: uc}
}

func (h *BotHandler) CreateBot(ctx context.Context, req *pb.CreateBotRequest) (*pb.Bot, error) {
	bot, err := h.uc.CreateBot(ctx,
		req.GetServiceProviderId(), req.GetName(), req.GetPurpose(),
		req.GetDepartment(), req.GetIndustryProfileId(),
		req.GetCreatedBySpUserId(), req.GetAvatarUrl(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return botToProto(bot), nil
}

func (h *BotHandler) GetBot(ctx context.Context, req *pb.GetBotRequest) (*pb.Bot, error) {
	bot, err := h.uc.GetBot(ctx, req.GetBotId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return botToProto(bot), nil
}

func (h *BotHandler) UpdateBot(ctx context.Context, req *pb.UpdateBotRequest) (*pb.Bot, error) {
	bot, err := h.uc.UpdateBot(ctx,
		req.GetBotId(), req.GetServiceProviderId(),
		req.GetName(), req.GetPurpose(), req.GetDepartment(),
		req.GetAvatarUrl(), req.GetStatus(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return botToProto(bot), nil
}

func (h *BotHandler) ListBots(ctx context.Context, req *pb.ListBotsRequest) (*pb.ListBotsResponse, error) {
	bots, total, err := h.uc.ListBots(ctx,
		req.GetServiceProviderId(), req.GetStatus(), req.GetAgentType(),
		int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbBots := make([]*pb.Bot, len(bots))
	for i, b := range bots {
		pbBots[i] = botToProto(b)
	}
	return &pb.ListBotsResponse{Bots: pbBots, Total: int32(total)}, nil
}

// GetManagerBot returns the SP's MANAGER bot. Per product rule #9 this is the
// only AI surface exposed to consumer apps (web, hybrid).
func (h *BotHandler) GetManagerBot(ctx context.Context, req *pb.GetManagerBotRequest) (*pb.Bot, error) {
	bot, err := h.uc.GetManagerBot(ctx, req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return botToProto(bot), nil
}

func (h *BotHandler) DeleteBot(ctx context.Context, req *pb.DeleteBotRequest) (*pb.DeleteBotResponse, error) {
	if err := h.uc.DeleteBot(ctx, req.GetBotId(), req.GetServiceProviderId()); err != nil {
		return nil, mapError(err)
	}
	return &pb.DeleteBotResponse{Success: true}, nil
}

func (h *BotHandler) GetBotConfiguration(ctx context.Context, req *pb.GetBotConfigurationRequest) (*pb.BotConfiguration, error) {
	config, err := h.uc.GetBotConfiguration(ctx, req.GetBotId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return configToProto(config), nil
}

func (h *BotHandler) UpdateBotConfiguration(ctx context.Context, req *pb.UpdateBotConfigurationRequest) (*pb.BotConfiguration, error) {
	domainConfig := configFromProto(req.GetBotId(), req.GetConfiguration())
	config, err := h.uc.UpdateBotConfiguration(ctx, req.GetBotId(), req.GetServiceProviderId(), domainConfig)
	if err != nil {
		return nil, mapError(err)
	}
	return configToProto(config), nil
}

func (h *BotHandler) SetBotPermission(ctx context.Context, req *pb.SetBotPermissionRequest) (*pb.SetBotPermissionResponse, error) {
	if err := h.uc.SetBotPermission(ctx,
		req.GetBotId(), req.GetServiceProviderId(),
		req.GetToolName(), req.GetIsAllowed(), req.GetConstraintsJson(),
	); err != nil {
		return nil, mapError(err)
	}
	return &pb.SetBotPermissionResponse{Success: true}, nil
}

func (h *BotHandler) ListBotPermissions(ctx context.Context, req *pb.ListBotPermissionsRequest) (*pb.ListBotPermissionsResponse, error) {
	perms, err := h.uc.ListBotPermissions(ctx, req.GetBotId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	pbPerms := make([]*pb.BotPermission, len(perms))
	for i, p := range perms {
		pbPerms[i] = permToProto(p)
	}
	return &pb.ListBotPermissionsResponse{Permissions: pbPerms}, nil
}

func (h *BotHandler) AddKnowledgeSource(ctx context.Context, req *pb.AddKnowledgeSourceRequest) (*pb.KnowledgeSource, error) {
	source, err := h.uc.AddKnowledgeSource(ctx,
		req.GetBotId(), req.GetServiceProviderId(),
		req.GetSourceType(), req.GetName(), req.GetDescription(),
		req.GetContent(), req.GetS3Key(), req.GetFileType(), req.GetFileSize(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return sourceToProto(source), nil
}

func (h *BotHandler) RemoveKnowledgeSource(ctx context.Context, req *pb.RemoveKnowledgeSourceRequest) (*pb.RemoveKnowledgeSourceResponse, error) {
	if err := h.uc.RemoveKnowledgeSource(ctx, req.GetKnowledgeSourceId(), req.GetBotId(), req.GetServiceProviderId()); err != nil {
		return nil, mapError(err)
	}
	return &pb.RemoveKnowledgeSourceResponse{Success: true}, nil
}

func (h *BotHandler) ListKnowledgeSources(ctx context.Context, req *pb.ListKnowledgeSourcesRequest) (*pb.ListKnowledgeSourcesResponse, error) {
	sources, err := h.uc.ListKnowledgeSources(ctx, req.GetBotId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	pbSources := make([]*pb.KnowledgeSource, len(sources))
	for i, s := range sources {
		pbSources[i] = sourceToProto(s)
	}
	return &pb.ListKnowledgeSourcesResponse{Sources: pbSources}, nil
}

func (h *BotHandler) ExecuteBotAction(ctx context.Context, req *pb.ExecuteBotActionRequest) (*pb.ExecuteBotActionResponse, error) {
	outputJSON, escalated, err := h.uc.ExecuteAction(ctx,
		req.GetBotId(), req.GetServiceProviderId(),
		req.GetConversationId(), req.GetUserId(),
		req.GetActionType(), req.GetToolName(), req.GetInputJson(),
	)
	if err != nil {
		if bizerr.IsPolicyDenied(err) {
			return &pb.ExecuteBotActionResponse{
				Success:        false,
				PolicyDecision: "DENY",
				PolicyReason:   err.Error(),
			}, nil
		}
		return nil, mapError(err)
	}
	return &pb.ExecuteBotActionResponse{
		Success:        true,
		OutputJson:     outputJSON,
		PolicyDecision: "ALLOW",
		Escalated:      escalated,
	}, nil
}

func (h *BotHandler) ListBotActionLogs(ctx context.Context, req *pb.ListBotActionLogsRequest) (*pb.ListBotActionLogsResponse, error) {
	logs, total, err := h.uc.ListBotActionLogs(ctx,
		req.GetBotId(), req.GetServiceProviderId(),
		req.GetConversationId(),
		int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbLogs := make([]*pb.BotActionLog, len(logs))
	for i, l := range logs {
		pbLogs[i] = actionLogToProto(l)
	}
	return &pb.ListBotActionLogsResponse{Logs: pbLogs, Total: int32(total)}, nil
}

func (h *BotHandler) GetBotAnalytics(ctx context.Context, req *pb.GetBotAnalyticsRequest) (*pb.BotAnalytics, error) {
	analytics, err := h.uc.GetBotAnalytics(ctx, req.GetBotId(), req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return analyticsToProto(analytics), nil
}

// --- Proto mapping helpers ---

func botToProto(b *entity.Bot) *pb.Bot {
	return &pb.Bot{
		Id:                b.ID,
		ServiceProviderId: b.ServiceProviderID,
		Name:              b.Name,
		AvatarUrl:         b.AvatarURL,
		Purpose:           b.Purpose,
		Department:        b.Department,
		IndustryProfileId: b.IndustryProfileID,
		Status:            string(b.Status),
		CreatedBySpUserId: b.CreatedBySPUserID,
		CreatedAt:         timestamppb.New(b.CreatedAt),
		UpdatedAt:         timestamppb.New(b.UpdatedAt),
		AgentType:         string(b.AgentType),
		ManagerBotId:      b.ManagerBotID,
	}
}

func configToProto(c *entity.BotConfiguration) *pb.BotConfiguration {
	days := make([]int32, len(c.WorkingDays))
	for i, d := range c.WorkingDays {
		days[i] = int32(d)
	}
	return &pb.BotConfiguration{
		BotId:                      c.BotID,
		Tone:                       c.Tone,
		WritingStyle:               c.WritingStyle,
		SupportedLanguages:         c.SupportedLanguages,
		WorkingHoursStart:          c.WorkingHoursStart,
		WorkingHoursEnd:            c.WorkingHoursEnd,
		WorkingDays:                days,
		MaxTurnsBeforeEscalation:   int32(c.MaxTurnsBeforeEscalation),
		EscalationRulesJson:        c.EscalationRules,
		HumanHandoffPolicyJson:     c.HumanHandoffPolicy,
		ApprovalPolicyJson:         c.ApprovalPolicy,
		FallbackActionsJson:        c.FallbackActions,
		ComplianceRestrictionsJson: c.ComplianceRestrictions,
		CustomSystemPrompt:         c.CustomSystemPrompt,
	}
}

func configFromProto(botID string, c *pb.BotConfiguration) *entity.BotConfiguration {
	if c == nil {
		return &entity.BotConfiguration{BotID: botID}
	}
	days := make([]int, len(c.GetWorkingDays()))
	for i, d := range c.GetWorkingDays() {
		days[i] = int(d)
	}
	return &entity.BotConfiguration{
		BotID:                    botID,
		Tone:                     c.GetTone(),
		WritingStyle:             c.GetWritingStyle(),
		SupportedLanguages:       c.GetSupportedLanguages(),
		WorkingHoursStart:        c.GetWorkingHoursStart(),
		WorkingHoursEnd:          c.GetWorkingHoursEnd(),
		WorkingDays:              days,
		MaxTurnsBeforeEscalation: int(c.GetMaxTurnsBeforeEscalation()),
		EscalationRules:          c.GetEscalationRulesJson(),
		HumanHandoffPolicy:       c.GetHumanHandoffPolicyJson(),
		ApprovalPolicy:           c.GetApprovalPolicyJson(),
		FallbackActions:          c.GetFallbackActionsJson(),
		ComplianceRestrictions:   c.GetComplianceRestrictionsJson(),
		CustomSystemPrompt:       c.GetCustomSystemPrompt(),
	}
}

func permToProto(p *entity.BotPermission) *pb.BotPermission {
	return &pb.BotPermission{
		Id:              p.ID,
		BotId:           p.BotID,
		ToolName:        p.ToolName,
		IsAllowed:       p.IsAllowed,
		ConstraintsJson: p.Constraints,
	}
}

func sourceToProto(s *entity.KnowledgeSource) *pb.KnowledgeSource {
	return &pb.KnowledgeSource{
		Id:          s.ID,
		BotId:       s.BotID,
		SourceType:  string(s.SourceType),
		Name:        s.Name,
		Description: s.Description,
		Content:     s.Content,
		S3Key:       s.S3Key,
		FileType:    s.FileType,
		FileSize:    s.FileSize,
		ChunkCount:  int32(s.ChunkCount),
		Status:      string(s.Status),
		CreatedAt:   timestamppb.New(s.CreatedAt),
	}
}

func actionLogToProto(l *entity.BotActionLog) *pb.BotActionLog {
	return &pb.BotActionLog{
		Id:             l.ID,
		BotId:          l.BotID,
		ConversationId: l.ConversationID,
		UserId:         l.UserID,
		ActionType:     l.ActionType,
		ToolUsed:       l.ToolUsed,
		InputSummary:   l.InputSummary,
		OutputSummary:  l.OutputSummary,
		PolicyDecision: l.PolicyDecision,
		DurationMs:     int32(l.DurationMS),
		Success:        l.Success,
		ErrorMessage:   l.ErrorMessage,
		CreatedAt:      timestamppb.New(l.CreatedAt),
	}
}

func analyticsToProto(a *entity.BotAnalytics) *pb.BotAnalytics {
	proto := &pb.BotAnalytics{
		BotId:                 a.BotID,
		TotalConversations:    int32(a.TotalConversations),
		TotalMessagesSent:     int32(a.TotalMessagesSent),
		TotalMessagesReceived: int32(a.TotalMessagesReceived),
		TotalActionsExecuted:  int32(a.TotalActionsExecuted),
		TotalEscalations:      int32(a.TotalEscalations),
		AvgResponseTimeMs:     int32(a.AvgResponseTimeMS),
		EscalationRate:        a.EscalationRate,
		ResolutionRate:        a.ResolutionRate,
		SatisfactionScore:     a.SatisfactionScore,
	}
	if a.LastActiveAt != nil {
		proto.LastActiveAt = timestamppb.New(*a.LastActiveAt)
	}
	return proto
}

// --- Error mapping ---

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

// ─── Agent Suite Handlers ─────────────────────────────────────────────────

func (h *BotHandler) ProvisionAgentSuite(ctx context.Context, req *pb.ProvisionAgentSuiteRequest) (*pb.ProvisionAgentSuiteResponse, error) {
	suite, err := h.uc.ProvisionAgentSuite(ctx, req.GetServiceProviderId(), req.GetCreatedBySpUserId())
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ProvisionAgentSuiteResponse{Suite: agentSuiteToProto(suite)}, nil
}

func (h *BotHandler) GetAgentSuite(ctx context.Context, req *pb.GetAgentSuiteRequest) (*pb.GetAgentSuiteResponse, error) {
	suite, err := h.uc.GetAgentSuite(ctx, req.GetServiceProviderId())
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.GetAgentSuiteResponse{Suite: agentSuiteToProto(suite)}, nil
}

func (h *BotHandler) DelegateToAgent(ctx context.Context, req *pb.DelegateToAgentRequest) (*pb.DelegateToAgentResponse, error) {
	out, err := h.uc.DelegateToAgent(ctx, usecase.DelegateInput{
		ManagerBotID:   req.GetManagerBotId(),
		SPID:           req.GetServiceProviderId(),
		UserID:         req.GetUserId(),
		ConversationID: req.GetConversationId(),
		AgentType:      req.GetAgentType(),
		TaskInput:      req.GetTaskInput(),
		ActionType:     req.GetActionType(),
	})
	if err != nil && out == nil {
		return nil, mapError(err)
	}
	if out == nil {
		out = &usecase.DelegateOutput{}
	}
	return &pb.DelegateToAgentResponse{
		Success:         out.Success,
		OutputJson:      out.OutputJSON,
		PolicyDecision:  out.PolicyDecision,
		PolicyReason:    out.PolicyReason,
		Escalated:       out.Escalated,
		DurationMs:      int32(out.DurationMS),
		IntentDetected:  out.IntentDetected,
		ConfidenceScore: out.ConfidenceScore,
	}, nil
}

func (h *BotHandler) ListDelegationLogs(ctx context.Context, req *pb.ListDelegationLogsRequest) (*pb.ListDelegationLogsResponse, error) {
	logs, total, err := h.uc.ListDelegationLogs(ctx,
		req.GetManagerBotId(), req.GetServiceProviderId(),
		int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	protoLogs := make([]*pb.AgentDelegationLog, 0, len(logs))
	for _, l := range logs {
		protoLogs = append(protoLogs, delegationLogToProto(l))
	}
	return &pb.ListDelegationLogsResponse{Logs: protoLogs, Total: int32(total)}, nil
}

// ─── Agent Suite Mappers ──────────────────────────────────────────────────

func agentSuiteToProto(s *entity.AgentSuite) *pb.AgentSuite {
	if s == nil {
		return nil
	}
	proto := &pb.AgentSuite{
		Id:                s.ID,
		ServiceProviderId: s.ServiceProviderID,
		ManagerBotId:      s.ManagerBotID,
		Status:            string(s.Status),
		ProvisionedAt:     timestamppb.New(s.ProvisionedAt),
	}
	if s.Manager != nil {
		proto.Manager = botToProto(s.Manager)
	}
	for _, a := range s.Agents {
		proto.Agents = append(proto.Agents, botToProto(a))
	}
	return proto
}

func delegationLogToProto(l *entity.AgentDelegationLog) *pb.AgentDelegationLog {
	return &pb.AgentDelegationLog{
		Id:              l.ID,
		ManagerBotId:    l.ManagerBotID,
		TargetBotId:     l.TargetBotID,
		UserId:          l.UserID,
		ConversationId:  l.ConversationID,
		IntentDetected:  l.IntentDetected,
		ConfidenceScore: l.ConfidenceScore,
		InputSummary:    l.InputSummary,
		OutputSummary:   l.OutputSummary,
		DurationMs:      int32(l.DurationMS),
		Success:         l.Success,
		ErrorMessage:    l.ErrorMessage,
		CreatedAt:       timestamppb.New(l.CreatedAt),
	}
}
