package usecase_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	"github.com/trustinbox/bot-service/internal/testfixtures"
	"github.com/trustinbox/bot-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// ─── Mock Repositories ─────────────────────────────────────

type mockBotRepo struct {
	bots map[string]*entity.Bot
}

func newMockBotRepo() *mockBotRepo {
	return &mockBotRepo{bots: make(map[string]*entity.Bot)}
}

func (m *mockBotRepo) Create(_ context.Context, bot *entity.Bot) error {
	m.bots[bot.ID] = bot
	return nil
}

func (m *mockBotRepo) GetByID(_ context.Context, id string) (*entity.Bot, error) {
	bot, ok := m.bots[id]
	if !ok {
		return nil, bizerr.NotFound("bot", id)
	}
	return bot, nil
}

func (m *mockBotRepo) Update(_ context.Context, bot *entity.Bot) error {
	if _, ok := m.bots[bot.ID]; !ok {
		return bizerr.NotFound("bot", bot.ID)
	}
	m.bots[bot.ID] = bot
	return nil
}

func (m *mockBotRepo) Delete(_ context.Context, id string) error {
	delete(m.bots, id)
	return nil
}

func (m *mockBotRepo) ListBySP(_ context.Context, spID, status string, limit, offset int) ([]*entity.Bot, int, error) {
	var result []*entity.Bot
	for _, b := range m.bots {
		if b.ServiceProviderID != spID {
			continue
		}
		if status != "" && string(b.Status) != status {
			continue
		}
		result = append(result, b)
	}
	total := len(result)
	if offset > len(result) {
		return nil, total, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

type mockConfigRepo struct {
	configs map[string]*entity.BotConfiguration
}

func newMockConfigRepo() *mockConfigRepo {
	return &mockConfigRepo{configs: make(map[string]*entity.BotConfiguration)}
}

func (m *mockConfigRepo) Get(_ context.Context, botID string) (*entity.BotConfiguration, error) {
	cfg, ok := m.configs[botID]
	if !ok {
		return nil, bizerr.NotFound("bot_configuration", botID)
	}
	return cfg, nil
}

func (m *mockConfigRepo) Upsert(_ context.Context, config *entity.BotConfiguration) error {
	m.configs[config.BotID] = config
	return nil
}

type mockPermRepo struct {
	perms map[string]map[string]*entity.BotPermission // botID -> toolName -> perm
}

func newMockPermRepo() *mockPermRepo {
	return &mockPermRepo{perms: make(map[string]map[string]*entity.BotPermission)}
}

func (m *mockPermRepo) Set(_ context.Context, perm *entity.BotPermission) error {
	if m.perms[perm.BotID] == nil {
		m.perms[perm.BotID] = make(map[string]*entity.BotPermission)
	}
	m.perms[perm.BotID][perm.ToolName] = perm
	return nil
}

func (m *mockPermRepo) ListByBot(_ context.Context, botID string) ([]*entity.BotPermission, error) {
	var result []*entity.BotPermission
	for _, p := range m.perms[botID] {
		result = append(result, p)
	}
	return result, nil
}

func (m *mockPermRepo) IsToolAllowed(_ context.Context, botID, toolName string) (bool, error) {
	if tools, ok := m.perms[botID]; ok {
		if p, ok := tools[toolName]; ok {
			return p.IsAllowed, nil
		}
	}
	return false, nil
}

type mockSourceRepo struct {
	sources map[string]*entity.KnowledgeSource
}

func newMockSourceRepo() *mockSourceRepo {
	return &mockSourceRepo{sources: make(map[string]*entity.KnowledgeSource)}
}

func (m *mockSourceRepo) Create(_ context.Context, src *entity.KnowledgeSource) error {
	m.sources[src.ID] = src
	return nil
}

func (m *mockSourceRepo) GetByID(_ context.Context, id string) (*entity.KnowledgeSource, error) {
	src, ok := m.sources[id]
	if !ok {
		return nil, bizerr.NotFound("knowledge_source", id)
	}
	return src, nil
}

func (m *mockSourceRepo) Delete(_ context.Context, id string) error {
	delete(m.sources, id)
	return nil
}

func (m *mockSourceRepo) ListByBot(_ context.Context, botID string) ([]*entity.KnowledgeSource, error) {
	var result []*entity.KnowledgeSource
	for _, s := range m.sources {
		if s.BotID == botID {
			result = append(result, s)
		}
	}
	return result, nil
}

func (m *mockSourceRepo) UpdateStatus(_ context.Context, id string, status entity.KnowledgeSourceStatus) error {
	if s, ok := m.sources[id]; ok {
		s.Status = status
		return nil
	}
	return bizerr.NotFound("knowledge_source", id)
}

type mockActionLogRepo struct {
	logs []*entity.BotActionLog
}

func newMockActionLogRepo() *mockActionLogRepo {
	return &mockActionLogRepo{}
}

func (m *mockActionLogRepo) Create(_ context.Context, log *entity.BotActionLog) error {
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockActionLogRepo) ListByBot(_ context.Context, botID string, limit, offset int) ([]*entity.BotActionLog, int, error) {
	var result []*entity.BotActionLog
	for _, l := range m.logs {
		if l.BotID == botID {
			result = append(result, l)
		}
	}
	total := len(result)
	if offset > total {
		return nil, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return result[offset:end], total, nil
}

func (m *mockActionLogRepo) ListByConversation(_ context.Context, convID string, limit, offset int) ([]*entity.BotActionLog, int, error) {
	var result []*entity.BotActionLog
	for _, l := range m.logs {
		if l.ConversationID == convID {
			result = append(result, l)
		}
	}
	total := len(result)
	if offset > total {
		return nil, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return result[offset:end], total, nil
}

type mockStatsRepo struct {
	analytics map[string]*entity.BotAnalytics
	actionInc int
	escInc    int
}

func newMockStatsRepo() *mockStatsRepo {
	return &mockStatsRepo{analytics: make(map[string]*entity.BotAnalytics)}
}

func (m *mockStatsRepo) Get(_ context.Context, botID string) (*entity.BotAnalytics, error) {
	stats, ok := m.analytics[botID]
	if !ok {
		return &entity.BotAnalytics{BotID: botID}, nil
	}
	return stats, nil
}

func (m *mockStatsRepo) IncrementConversations(_ context.Context, botID string) error { return nil }
func (m *mockStatsRepo) IncrementMessages(_ context.Context, botID string, sent, received int) error {
	return nil
}
func (m *mockStatsRepo) IncrementActions(_ context.Context, botID string) error {
	m.actionInc++
	return nil
}
func (m *mockStatsRepo) IncrementEscalations(_ context.Context, botID string) error {
	m.escInc++
	return nil
}

type mockPolicyChecker struct {
	allowed bool
	reason  string
	err     error
}

func (m *mockPolicyChecker) EvaluateBotAction(_ context.Context, botID, userID, toolName string) (bool, string, error) {
	return m.allowed, m.reason, m.err
}

type mockPublisher struct {
	published []*events.Event
}

func (m *mockPublisher) Publish(_ context.Context, evt *events.Event) error {
	m.published = append(m.published, evt)
	return nil
}

func (m *mockPublisher) PublishBatch(_ context.Context, evts []*events.Event) error {
	m.published = append(m.published, evts...)
	return nil
}

func (m *mockPublisher) Close() error { return nil }

// ─── Helpers ────────────────────────────────────────────────

// compliant with all interfaces
var (
	_ repository.BotRepository              = (*mockBotRepo)(nil)
	_ repository.BotConfigurationRepository = (*mockConfigRepo)(nil)
	_ repository.BotPermissionRepository    = (*mockPermRepo)(nil)
	_ repository.KnowledgeSourceRepository  = (*mockSourceRepo)(nil)
	_ repository.BotActionLogRepository     = (*mockActionLogRepo)(nil)
	_ repository.BotAnalyticsRepository     = (*mockStatsRepo)(nil)
	_ usecase.PolicyChecker                 = (*mockPolicyChecker)(nil)
	_ events.Publisher                      = (*mockPublisher)(nil)
)

func newTestUseCase(
	botRepo *mockBotRepo,
	configRepo *mockConfigRepo,
	permRepo *mockPermRepo,
	sourceRepo *mockSourceRepo,
	actionRepo *mockActionLogRepo,
	statsRepo *mockStatsRepo,
	policy *mockPolicyChecker,
	pub *mockPublisher,
) *usecase.BotUseCase {
	return usecase.NewBotUseCase(
		botRepo, configRepo, permRepo, sourceRepo,
		actionRepo, statsRepo, nil, nil, policy, nil, nil, "", pub, zap.NewNop(),
	)
}

// ─── Tests ──────────────────────────────────────────────────

func TestCreateBot_Success(t *testing.T) {
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	bot, err := uc.CreateBot(context.Background(), "sp-1", "My Bot", "support", "support", "", "user-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if bot.Name != "My Bot" {
		t.Errorf("expected name 'My Bot', got %q", bot.Name)
	}
	if bot.Status != entity.BotStatusDraft {
		t.Errorf("expected DRAFT status, got %s", bot.Status)
	}
	if bot.ServiceProviderID != "sp-1" {
		t.Errorf("expected SP 'sp-1', got %q", bot.ServiceProviderID)
	}
}

func TestCreateBot_MissingName(t *testing.T) {
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, err := uc.CreateBot(context.Background(), "sp-1", "", "support", "", "", "user-1", "")
	if err == nil {
		t.Fatal("expected error for missing name")
	}
	if !bizerr.IsInvalidInput(err) {
		t.Errorf("expected INVALID_INPUT, got %v", err)
	}
}

func TestCreateBot_MissingPurpose(t *testing.T) {
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, err := uc.CreateBot(context.Background(), "sp-1", "Bot", "", "", "", "user-1", "")
	if err == nil {
		t.Fatal("expected error for missing purpose")
	}
	if !bizerr.IsInvalidInput(err) {
		t.Errorf("expected INVALID_INPUT, got %v", err)
	}
}

func TestCreateBot_PublishesEvent(t *testing.T) {
	pub := &mockPublisher{}
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, pub,
	)

	_, err := uc.CreateBot(context.Background(), "sp-1", "Bot", "purpose", "", "", "user-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pub.published) != 1 {
		t.Fatalf("expected 1 event published, got %d", len(pub.published))
	}
	if pub.published[0].Type != events.BotCreated {
		t.Errorf("expected event type %s, got %s", events.BotCreated, pub.published[0].Type)
	}
}

func TestCreateBot_SetsDefaultPermissions(t *testing.T) {
	permRepo := newMockPermRepo()
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), permRepo,
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	bot, err := uc.CreateBot(context.Background(), "sp-1", "Bot", "purpose", "", "", "user-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	botPerms := permRepo.perms[bot.ID]
	if len(botPerms) != len(entity.AllowedBotTools) {
		t.Errorf("expected %d default permissions, got %d", len(entity.AllowedBotTools), len(botPerms))
	}
}

func TestGetBot_NotFound(t *testing.T) {
	uc := newTestUseCase(
		newMockBotRepo(), newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, err := uc.GetBot(context.Background(), "nonexistent", "sp-1")
	if err == nil {
		t.Fatal("expected error for nonexistent bot")
	}
	if !bizerr.IsNotFound(err) {
		t.Errorf("expected NOT_FOUND, got %v", err)
	}
}

func TestGetBot_WrongSP(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, err := uc.GetBot(context.Background(), "bot-1", "sp-other")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
	if !bizerr.IsForbidden(err) {
		t.Errorf("expected FORBIDDEN, got %v", err)
	}
}

func TestUpdateBot_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	updated, err := uc.UpdateBot(context.Background(), "bot-1", "sp-1", "New Name", "new purpose", "", "", "PAUSED")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.Name != "New Name" {
		t.Errorf("expected name 'New Name', got %q", updated.Name)
	}
	if updated.Status != entity.BotStatusPaused {
		t.Errorf("expected PAUSED, got %s", updated.Status)
	}
}

func TestDeleteBot_Archives(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	err := uc.DeleteBot(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if botRepo.bots["bot-1"].Status != entity.BotStatusArchived {
		t.Errorf("expected ARCHIVED, got %s", botRepo.bots["bot-1"].Status)
	}
}

func TestExecuteAction_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusActive).Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	permRepo.perms["bot-1"] = map[string]*entity.BotPermission{
		"send_notification": testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("send_notification").WithAllowed(true).Build(),
	}

	actionRepo := newMockActionLogRepo()
	statsRepo := newMockStatsRepo()
	pub := &mockPublisher{}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), actionRepo, statsRepo,
		&mockPolicyChecker{allowed: true, reason: "all checks passed"},
		pub,
	)

	output, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "tool_call", "send_notification", `{"target":"user-1"}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if output == "" {
		t.Error("expected non-empty output")
	}
	if len(actionRepo.logs) != 1 {
		t.Errorf("expected 1 action log, got %d", len(actionRepo.logs))
	}
	if actionRepo.logs[0].PolicyDecision != "ALLOW" {
		t.Errorf("expected ALLOW decision, got %s", actionRepo.logs[0].PolicyDecision)
	}
	if statsRepo.actionInc != 1 {
		t.Errorf("expected 1 action increment, got %d", statsRepo.actionInc)
	}
	if len(pub.published) != 1 {
		t.Errorf("expected 1 event, got %d", len(pub.published))
	}
}

func TestExecuteAction_BotNotActive(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusDraft).Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "tool_call", "send_notification", `{}`)
	if err == nil {
		t.Fatal("expected error for inactive bot")
	}
	if !bizerr.IsInvalidInput(err) {
		t.Errorf("expected INVALID_INPUT, got %v", err)
	}
}

func TestExecuteAction_ToolNotAllowed(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusActive).Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	permRepo.perms["bot-1"] = map[string]*entity.BotPermission{
		"send_notification": testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("send_notification").WithAllowed(false).Build(),
	}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "tool_call", "send_notification", `{}`)
	if err == nil {
		t.Fatal("expected error for forbidden tool")
	}
	if !bizerr.IsForbidden(err) {
		t.Errorf("expected FORBIDDEN, got %v", err)
	}
}

func TestExecuteAction_PolicyDenied(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusActive).Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	permRepo.perms["bot-1"] = map[string]*entity.BotPermission{
		"send_notification": testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("send_notification").WithAllowed(true).Build(),
	}
	actionRepo := newMockActionLogRepo()

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), actionRepo, newMockStatsRepo(),
		&mockPolicyChecker{allowed: false, reason: "DND is active"},
		&mockPublisher{},
	)

	_, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "tool_call", "send_notification", `{}`)
	if err == nil {
		t.Fatal("expected error from policy denial")
	}
	if !bizerr.IsPolicyDenied(err) {
		t.Errorf("expected POLICY_DENIED, got %v", err)
	}
	// Action log should still be created with DENY decision
	if len(actionRepo.logs) != 1 {
		t.Fatalf("expected 1 action log, got %d", len(actionRepo.logs))
	}
	if actionRepo.logs[0].PolicyDecision != "DENY" {
		t.Errorf("expected DENY decision in log, got %s", actionRepo.logs[0].PolicyDecision)
	}
}

func TestExecuteAction_PolicyEvaluationError(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusActive).Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	permRepo.perms["bot-1"] = map[string]*entity.BotPermission{
		"send_notification": testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("send_notification").WithAllowed(true).Build(),
	}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{err: fmt.Errorf("service unavailable")},
		&mockPublisher{},
	)

	_, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "tool_call", "send_notification", `{}`)
	if err == nil {
		t.Fatal("expected error from policy evaluation failure")
	}
}

func TestSetBotPermission_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	err := uc.SetBotPermission(context.Background(), "bot-1", "sp-1", "send_notification", false, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if permRepo.perms["bot-1"]["send_notification"].IsAllowed {
		t.Error("expected tool permission to be false")
	}
}

func TestAddKnowledgeSource_WrongSP(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	_, err := uc.AddKnowledgeSource(context.Background(), "bot-1", "sp-wrong", "DOCUMENT", "doc", "desc", "content", "", "txt", 100)
	if err == nil {
		t.Fatal("expected forbidden error")
	}
	if !bizerr.IsForbidden(err) {
		t.Errorf("expected FORBIDDEN, got %v", err)
	}
}

func TestListBots_FilterByStatus(t *testing.T) {
	botRepo := newMockBotRepo()
	botRepo.bots["bot-1"] = testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").WithStatus(entity.BotStatusActive).Build()
	botRepo.bots["bot-2"] = testfixtures.NewBotBuilder().WithID("bot-2").WithSPID("sp-1").WithStatus(entity.BotStatusDraft).Build()
	botRepo.bots["bot-3"] = testfixtures.NewBotBuilder().WithID("bot-3").WithSPID("sp-2").WithStatus(entity.BotStatusActive).Build()

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	bots, total, err := uc.ListBots(context.Background(), "sp-1", "ACTIVE", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected 1 active bot for sp-1, got %d", total)
	}
	if len(bots) != 1 || bots[0].ID != "bot-1" {
		t.Errorf("expected bot-1, got %v", bots)
	}
}

func TestGetBotConfiguration_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	configRepo := newMockConfigRepo()
	cfg := testfixtures.NewBotConfigBuilder().WithBotID("bot-1").WithTone("friendly").Build()
	configRepo.configs["bot-1"] = cfg

	uc := newTestUseCase(
		botRepo, configRepo, newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	result, err := uc.GetBotConfiguration(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Tone != "friendly" {
		t.Errorf("expected tone 'friendly', got %q", result.Tone)
	}
}

func TestGetBotAnalytics_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	statsRepo := newMockStatsRepo()
	stats := testfixtures.NewBotAnalyticsBuilder().WithBotID("bot-1").Build()
	statsRepo.analytics["bot-1"] = stats

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), statsRepo,
		&mockPolicyChecker{}, &mockPublisher{},
	)

	result, err := uc.GetBotAnalytics(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalConversations != 100 {
		t.Errorf("expected 100 conversations, got %d", result.TotalConversations)
	}
}

func TestUpdateBotConfiguration_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	configRepo := newMockConfigRepo()
	cfg := testfixtures.NewBotConfigBuilder().WithBotID("bot-1").WithTone("professional").Build()
	configRepo.configs["bot-1"] = cfg

	uc := newTestUseCase(
		botRepo, configRepo, newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	newConfig := testfixtures.NewBotConfigBuilder().WithBotID("bot-1").WithTone("casual").Build()
	result, err := uc.UpdateBotConfiguration(context.Background(), "bot-1", "sp-1", newConfig)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Tone != "casual" {
		t.Errorf("expected tone 'casual', got %q", result.Tone)
	}
}

func TestListBotPermissions_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	permRepo := newMockPermRepo()
	permRepo.perms["bot-1"] = map[string]*entity.BotPermission{
		"send_notification": testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("send_notification").WithAllowed(true).Build(),
		"share_document":    testfixtures.NewBotPermissionBuilder().WithBotID("bot-1").WithTool("share_document").WithAllowed(false).Build(),
	}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), permRepo,
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	perms, err := uc.ListBotPermissions(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(perms) != 2 {
		t.Errorf("expected 2 permissions, got %d", len(perms))
	}
}

func TestRemoveKnowledgeSource_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	sourceRepo := newMockSourceRepo()
	sourceRepo.sources["ks-1"] = &entity.KnowledgeSource{ID: "ks-1", BotID: "bot-1", Name: "FAQ"}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		sourceRepo, newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	err := uc.RemoveKnowledgeSource(context.Background(), "ks-1", "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := sourceRepo.sources["ks-1"]; ok {
		t.Error("knowledge source should be deleted")
	}
}

func TestListKnowledgeSources_Success(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	sourceRepo := newMockSourceRepo()
	sourceRepo.sources["ks-1"] = &entity.KnowledgeSource{ID: "ks-1", BotID: "bot-1", Name: "FAQ"}
	sourceRepo.sources["ks-2"] = &entity.KnowledgeSource{ID: "ks-2", BotID: "bot-1", Name: "Docs"}

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		sourceRepo, newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	sources, err := uc.ListKnowledgeSources(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sources) != 2 {
		t.Errorf("expected 2 knowledge sources, got %d", len(sources))
	}
}

func TestListBotActionLogs_ByBot(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	actionRepo := newMockActionLogRepo()
	actionRepo.logs = append(actionRepo.logs, &entity.BotActionLog{
		ID: "log-1", BotID: "bot-1", ActionType: "TOOL_CALL", ToolUsed: "send_notification",
	})

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), actionRepo, newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	logs, total, err := uc.ListBotActionLogs(context.Background(), "bot-1", "sp-1", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected 1 log, got %d", total)
	}
	if len(logs) != 1 {
		t.Errorf("expected 1 log entry, got %d", len(logs))
	}
}

func TestListBotActionLogs_ByConversation(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	actionRepo := newMockActionLogRepo()
	actionRepo.logs = append(actionRepo.logs,
		&entity.BotActionLog{ID: "log-1", BotID: "bot-1", ConversationID: "conv-1"},
		&entity.BotActionLog{ID: "log-2", BotID: "bot-1", ConversationID: "conv-2"},
	)

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), actionRepo, newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	logs, total, err := uc.ListBotActionLogs(context.Background(), "bot-1", "sp-1", "conv-1", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected 1 log for conv-1, got %d", total)
	}
	if len(logs) != 1 {
		t.Errorf("expected 1 log entry, got %d", len(logs))
	}
}

func TestDeleteBot_WrongSP(t *testing.T) {
	botRepo := newMockBotRepo()
	bot := testfixtures.NewBotBuilder().WithID("bot-1").WithSPID("sp-1").Build()
	botRepo.bots["bot-1"] = bot

	uc := newTestUseCase(
		botRepo, newMockConfigRepo(), newMockPermRepo(),
		newMockSourceRepo(), newMockActionLogRepo(), newMockStatsRepo(),
		&mockPolicyChecker{}, &mockPublisher{},
	)

	err := uc.DeleteBot(context.Background(), "bot-1", "sp-wrong")
	if err == nil {
		t.Fatal("expected forbidden error")
	}
	if !bizerr.IsForbidden(err) {
		t.Errorf("expected FORBIDDEN, got %v", err)
	}
}
