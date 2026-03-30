package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// ── mock implementations ──────────────────────────────────────────────────────

type mockBotRepo struct {
	bot *entity.Bot
	err error
}

func (m *mockBotRepo) Create(ctx context.Context, bot *entity.Bot) error { return m.err }
func (m *mockBotRepo) GetByID(ctx context.Context, id string) (*entity.Bot, error) {
	if m.bot != nil {
		return m.bot, nil
	}
	return nil, errors.New("not found")
}
func (m *mockBotRepo) Update(ctx context.Context, bot *entity.Bot) error    { return m.err }
func (m *mockBotRepo) Delete(ctx context.Context, id string) error          { return m.err }
func (m *mockBotRepo) ListBySP(_ context.Context, _, _ string, _, _ int) ([]*entity.Bot, int, error) {
	return nil, 0, m.err
}

type mockConfigRepo struct{}

func (m *mockConfigRepo) Get(_ context.Context, _ string) (*entity.BotConfiguration, error) {
	return &entity.BotConfiguration{}, nil
}
func (m *mockConfigRepo) Upsert(_ context.Context, _ *entity.BotConfiguration) error { return nil }

type mockPermRepo struct{}

func (m *mockPermRepo) Set(_ context.Context, _ *entity.BotPermission) error        { return nil }
func (m *mockPermRepo) ListByBot(_ context.Context, _ string) ([]*entity.BotPermission, error) {
	return nil, nil
}
func (m *mockPermRepo) IsToolAllowed(_ context.Context, _, _ string) (bool, error) {
	return true, nil
}

type mockSourceRepo struct{}

func (m *mockSourceRepo) Create(_ context.Context, _ *entity.KnowledgeSource) error { return nil }
func (m *mockSourceRepo) GetByID(_ context.Context, _ string) (*entity.KnowledgeSource, error) {
	return nil, nil
}
func (m *mockSourceRepo) Delete(_ context.Context, _ string) error { return nil }
func (m *mockSourceRepo) ListByBot(_ context.Context, _ string) ([]*entity.KnowledgeSource, error) {
	return nil, nil
}
func (m *mockSourceRepo) UpdateStatus(_ context.Context, _ string, _ entity.KnowledgeSourceStatus) error {
	return nil
}

type mockActionRepo struct{}

func (m *mockActionRepo) Create(_ context.Context, _ *entity.BotActionLog) error { return nil }
func (m *mockActionRepo) ListByBot(_ context.Context, _ string, _, _ int) ([]*entity.BotActionLog, int, error) {
	return nil, 0, nil
}
func (m *mockActionRepo) ListByConversation(_ context.Context, _ string, _, _ int) ([]*entity.BotActionLog, int, error) {
	return nil, 0, nil
}

type mockAnalyticsRepo struct{}

func (m *mockAnalyticsRepo) Get(_ context.Context, _ string) (*entity.BotAnalytics, error) {
	return &entity.BotAnalytics{}, nil
}
func (m *mockAnalyticsRepo) IncrementConversations(_ context.Context, _ string) error { return nil }
func (m *mockAnalyticsRepo) IncrementMessages(_ context.Context, _ string, _, _ int) error {
	return nil
}
func (m *mockAnalyticsRepo) IncrementActions(_ context.Context, _ string) error     { return nil }
func (m *mockAnalyticsRepo) IncrementEscalations(_ context.Context, _ string) error { return nil }

type mockPolicyChecker struct {
	allowed bool
	reason  string
}

func (m *mockPolicyChecker) EvaluateBotAction(_ context.Context, _, _, _ string) (bool, string, error) {
	return m.allowed, m.reason, nil
}

// capturingPublisher records every published event.
type capturingPublisher struct {
	events []events.Event
}

func (p *capturingPublisher) Publish(_ context.Context, evt events.Event) error {
	p.events = append(p.events, evt)
	return nil
}

func newTestUseCase(botRepo *mockBotRepo, pub events.EventPublisher) *BotUseCase {
	return NewBotUseCase(
		botRepo,
		&mockConfigRepo{},
		&mockPermRepo{},
		&mockSourceRepo{},
		&mockActionRepo{},
		&mockAnalyticsRepo{},
		&mockPolicyChecker{allowed: true, reason: "ok"},
		pub,
		zap.NewNop(),
	)
}

// ── tests ─────────────────────────────────────────────────────────────────────

func TestNewBotUseCase_NilPublisherBecomesNoop(t *testing.T) {
	uc := NewBotUseCase(
		&mockBotRepo{},
		&mockConfigRepo{},
		&mockPermRepo{},
		&mockSourceRepo{},
		&mockActionRepo{},
		&mockAnalyticsRepo{},
		&mockPolicyChecker{allowed: true},
		nil, // nil publisher should become NoopPublisher
		zap.NewNop(),
	)
	if uc.publisher == nil {
		t.Error("publisher should not be nil after NewBotUseCase with nil publisher")
	}
}

func TestCreateBot_PublishesEvent(t *testing.T) {
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{}, pub)

	_, err := uc.CreateBot(context.Background(), "sp-1", "TestBot", "assist", "support", "", "user-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(pub.events) == 0 {
		t.Fatal("expected at least one event to be published")
	}
	evt := pub.events[len(pub.events)-1]
	if evt.Type != events.BotCreated {
		t.Errorf("expected event type %s, got %s", events.BotCreated, evt.Type)
	}
	if evt.OrgID != "sp-1" {
		t.Errorf("expected org_id sp-1, got %s", evt.OrgID)
	}
	if evt.Data["bot_name"] != "TestBot" {
		t.Errorf("expected bot_name TestBot, got %s", evt.Data["bot_name"])
	}
}

func TestCreateBot_RequiresName(t *testing.T) {
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{}, pub)

	_, err := uc.CreateBot(context.Background(), "sp-1", "", "assist", "", "", "user-1", "")
	if err == nil {
		t.Error("expected error for empty bot name")
	}
	if len(pub.events) > 0 {
		t.Error("no events should be published when validation fails")
	}
}

func TestCreateBot_RequiresPurpose(t *testing.T) {
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{}, pub)

	_, err := uc.CreateBot(context.Background(), "sp-1", "TestBot", "", "", "", "user-1", "")
	if err == nil {
		t.Error("expected error for empty bot purpose")
	}
	if len(pub.events) > 0 {
		t.Error("no events should be published when validation fails")
	}
}

func TestUpdateBot_PublishesActivationEvent(t *testing.T) {
	existing := &entity.Bot{
		ID:                "bot-1",
		ServiceProviderID: "sp-1",
		Name:              "OldName",
		Status:            entity.BotStatusDraft,
	}
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{bot: existing}, pub)

	_, err := uc.UpdateBot(context.Background(), "bot-1", "sp-1", "NewName", "", "", "", string(entity.BotStatusActive))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Find the BotActivated event
	var found bool
	for _, evt := range pub.events {
		if evt.Type == events.BotActivated {
			found = true
			if evt.Data["bot_id"] != "bot-1" {
				t.Errorf("expected bot_id bot-1, got %s", evt.Data["bot_id"])
			}
		}
	}
	if !found {
		t.Error("expected BotActivated event to be published on status transition to active")
	}
}

func TestUpdateBot_NoActivationEventWhenAlreadyActive(t *testing.T) {
	existing := &entity.Bot{
		ID:                "bot-1",
		ServiceProviderID: "sp-1",
		Name:              "BotName",
		Status:            entity.BotStatusActive,
	}
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{bot: existing}, pub)

	_, err := uc.UpdateBot(context.Background(), "bot-1", "sp-1", "NewName", "", "", "", string(entity.BotStatusActive))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, evt := range pub.events {
		if evt.Type == events.BotActivated {
			t.Error("BotActivated event should not be published when bot was already active")
		}
	}
}

func TestDeleteBot_PublishesArchivedEvent(t *testing.T) {
	existing := &entity.Bot{
		ID:                "bot-1",
		ServiceProviderID: "sp-1",
		Name:              "TestBot",
		Status:            entity.BotStatusActive,
	}
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{bot: existing}, pub)

	err := uc.DeleteBot(context.Background(), "bot-1", "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var found bool
	for _, evt := range pub.events {
		if evt.Type == events.BotArchived {
			found = true
			if evt.OrgID != "sp-1" {
				t.Errorf("expected org_id sp-1, got %s", evt.OrgID)
			}
		}
	}
	if !found {
		t.Error("expected BotArchived event to be published on delete")
	}
}

func TestDeleteBot_ForbiddenForWrongSP(t *testing.T) {
	existing := &entity.Bot{
		ID:                "bot-1",
		ServiceProviderID: "sp-other",
		Status:            entity.BotStatusActive,
	}
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{bot: existing}, pub)

	err := uc.DeleteBot(context.Background(), "bot-1", "sp-1")
	if err == nil {
		t.Error("expected forbidden error when sp does not own bot")
	}
	if len(pub.events) > 0 {
		t.Error("no events should be published when authorization fails")
	}
}

func TestExecuteAction_PublishesEvent(t *testing.T) {
	existing := &entity.Bot{
		ID:                "bot-1",
		ServiceProviderID: "sp-1",
		Status:            entity.BotStatusActive,
	}
	pub := &capturingPublisher{}
	uc := newTestUseCase(&mockBotRepo{bot: existing}, pub)

	_, _, err := uc.ExecuteAction(context.Background(), "bot-1", "sp-1", "conv-1", "user-1", "TOOL", "send_notification", `{}`)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var found bool
	for _, evt := range pub.events {
		if evt.Type == events.BotActionExecuted {
			found = true
			if evt.Data["tool_name"] != "send_notification" {
				t.Errorf("expected tool_name send_notification, got %s", evt.Data["tool_name"])
			}
			if evt.UserID != "user-1" {
				t.Errorf("expected user_id user-1, got %s", evt.UserID)
			}
		}
	}
	if !found {
		t.Error("expected BotActionExecuted event to be published")
	}
}
