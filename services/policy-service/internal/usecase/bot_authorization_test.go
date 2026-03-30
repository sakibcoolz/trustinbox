package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/usecase"
	"go.uber.org/zap"
)

// ─── Mock repositories ─────────────────────────────────────

type mockUserPreferenceRepo struct {
	prefs    *entity.UserPreferences
	dndRules []entity.DNDRule
	blocked  map[string]bool // key: "userID:spID"
	prefsErr error
}

func (m *mockUserPreferenceRepo) GetPreferences(_ context.Context, _ string) (*entity.UserPreferences, error) {
	if m.prefsErr != nil {
		return nil, m.prefsErr
	}
	return m.prefs, nil
}

func (m *mockUserPreferenceRepo) GetDNDRules(_ context.Context, _ string) ([]entity.DNDRule, error) {
	return m.dndRules, nil
}

func (m *mockUserPreferenceRepo) GetAvailabilitySlots(_ context.Context, _ string) ([]entity.AvailabilitySlot, error) {
	return nil, nil
}

func (m *mockUserPreferenceRepo) IsServiceProviderBlocked(_ context.Context, userID, spID string) (bool, error) {
	return m.blocked[userID+":"+spID], nil
}

type mockSPRepo struct {
	status *entity.ServiceProviderStatus
}

func (m *mockSPRepo) GetServiceProviderStatus(_ context.Context, _ string) (*entity.ServiceProviderStatus, error) {
	return m.status, nil
}

type mockFreqRepo struct {
	adCount int
}

func (m *mockFreqRepo) GetAdCountForUser(_ context.Context, _, _ string) (int, error) {
	return m.adCount, nil
}

func (m *mockFreqRepo) IncrementAdCount(_ context.Context, _, _ string) error {
	return nil
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

func defaultPrefs() *entity.UserPreferences {
	return &entity.UserPreferences{
		UserID:                     "user-1",
		AllowPersonalNotifications: true,
		AllowSPNotifications:       true,
		AllowAdvertisements:        true,
		AllowCallbackRequests:      true,
		AllowChat:                  true,
		AllowDocumentShares:        true,
		RequireCallApproval:        false,
	}
}

func verifiedSP() *entity.ServiceProviderStatus {
	return &entity.ServiceProviderStatus{
		ServiceProviderID:  "sp-1",
		VerificationStatus: "VERIFIED",
		Status:             "ACTIVE",
		SpamScore:          0.5,
	}
}

func newEvaluator(userRepo *mockUserPreferenceRepo, spRepo *mockSPRepo, freqRepo *mockFreqRepo, pub events.Publisher) *usecase.PolicyEvaluator {
	return usecase.NewPolicyEvaluator(userRepo, spRepo, freqRepo, pub, zap.NewNop())
}

// ─── Integration Tests: Bot cannot bypass DND, consent, or block rules ──────

// TestBotCannotBypassDND verifies that a bot-initiated notification is denied
// when the user has an active DND rule.
func TestBotCannotBypassDND(t *testing.T) {
	// Arrange: user has DND active on all days, 00:00 – 23:59.
	userRepo := &mockUserPreferenceRepo{
		prefs: defaultPrefs(),
		dndRules: []entity.DNDRule{
			{
				ID:         "dnd-1",
				UserID:     "user-1",
				ScopeType:  "GLOBAL",
				StartTime:  "00:00",
				EndTime:    "23:59",
				DaysOfWeek: []int{0, 1, 2, 3, 4, 5, 6},
				IsActive:   true,
			},
		},
	}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeNotification,
		ScheduledTime:     time.Now(),
	}

	// Act
	result, err := evaluator.Evaluate(context.Background(), req)

	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed DND")
	}
	if result.DecisionCode != entity.DecisionDenyDNDActive {
		t.Errorf("expected decision %s, got %s", entity.DecisionDenyDNDActive, result.DecisionCode)
	}
}

// TestBotCannotBypassCategoryDisabledConsent verifies that a bot-initiated
// notification is denied when the user has disabled the category (consent).
func TestBotCannotBypassCategoryDisabledConsent(t *testing.T) {
	// Arrange: user has disabled SP notifications.
	prefs := defaultPrefs()
	prefs.AllowSPNotifications = false

	userRepo := &mockUserPreferenceRepo{prefs: prefs}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeNotification,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed consent (category disabled)")
	}
	if result.DecisionCode != entity.DecisionDenyCategoryDisabled {
		t.Errorf("expected decision %s, got %s", entity.DecisionDenyCategoryDisabled, result.DecisionCode)
	}
}

// TestBotCannotBypassAdvertisementConsent verifies ads are denied when
// user has not opted in.
func TestBotCannotBypassAdvertisementConsent(t *testing.T) {
	prefs := defaultPrefs()
	prefs.AllowAdvertisements = false

	userRepo := &mockUserPreferenceRepo{prefs: prefs}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryAdvertisement,
		CommunicationType: entity.CommTypeCampaign,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed advertisement consent")
	}
	if result.DecisionCode != entity.DecisionDenyCategoryDisabled {
		t.Errorf("expected decision %s, got %s", entity.DecisionDenyCategoryDisabled, result.DecisionCode)
	}
}

// TestBotCannotBypassBlockList verifies that a bot-initiated action is denied
// when the user has blocked the service provider.
func TestBotCannotBypassBlockList(t *testing.T) {
	userRepo := &mockUserPreferenceRepo{
		prefs:   defaultPrefs(),
		blocked: map[string]bool{"user-1:sp-1": true},
	}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeChatMessage,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed block list")
	}
	if result.DecisionCode != entity.DecisionDenyUserBlockedSP {
		t.Errorf("expected decision %s, got %s", entity.DecisionDenyUserBlockedSP, result.DecisionCode)
	}
}

// TestBotCannotBypassCallbackApprovalRequirement verifies that callback
// requests require user approval when the preference is set.
func TestBotCannotBypassCallbackApprovalRequirement(t *testing.T) {
	prefs := defaultPrefs()
	prefs.RequireCallApproval = true

	userRepo := &mockUserPreferenceRepo{prefs: prefs}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeCallbackReq,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Callback should be allowed but flagged as requiring approval.
	if !result.Allowed {
		t.Fatalf("expected ALLOW (with approval gate), got DENY")
	}
	if result.DecisionCode != entity.DecisionRequireCallbackApproval {
		t.Errorf("expected decision %s, got %s", entity.DecisionRequireCallbackApproval, result.DecisionCode)
	}
}

// TestBotCannotBypassDNDScopedToSP verifies SP-scoped DND rules block
// only the targeted service provider.
func TestBotCannotBypassDNDScopedToSP(t *testing.T) {
	userRepo := &mockUserPreferenceRepo{
		prefs: defaultPrefs(),
		dndRules: []entity.DNDRule{
			{
				ID:         "dnd-sp",
				UserID:     "user-1",
				ScopeType:  "SERVICE_PROVIDER",
				ScopeRefID: "sp-1",
				StartTime:  "00:00",
				EndTime:    "23:59",
				DaysOfWeek: []int{0, 1, 2, 3, 4, 5, 6},
				IsActive:   true,
			},
		},
	}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	// sp-1 should be blocked by DND.
	req1 := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeNotification,
		ScheduledTime:     time.Now(),
	}
	result1, err := evaluator.Evaluate(context.Background(), req1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result1.Allowed {
		t.Fatalf("expected sp-1 DENIED by SP-scoped DND, got ALLOW")
	}

	// sp-2 should NOT be blocked (DND only targets sp-1).
	spRepo2 := &mockSPRepo{status: &entity.ServiceProviderStatus{
		ServiceProviderID:  "sp-2",
		VerificationStatus: "VERIFIED",
		Status:             "ACTIVE",
		SpamScore:          0.1,
	}}
	evaluator2 := newEvaluator(userRepo, spRepo2, &mockFreqRepo{}, &mockPublisher{})
	req2 := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-2",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeNotification,
		ScheduledTime:     time.Now(),
	}
	result2, err := evaluator2.Evaluate(context.Background(), req2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result2.Allowed {
		t.Fatalf("expected sp-2 ALLOWED (DND only for sp-1), got DENY: %s", result2.Reason)
	}
}

// TestBotCannotBypassDocumentShareConsent verifies document share denial
// when the user has disabled document shares.
func TestBotCannotBypassDocumentShareConsent(t *testing.T) {
	prefs := defaultPrefs()
	prefs.AllowDocumentShares = false

	userRepo := &mockUserPreferenceRepo{prefs: prefs}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeDocumentShare,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed document share consent")
	}
}

// TestBotCannotBypassChatConsent verifies chat message denial when the user
// has disabled chat.
func TestBotCannotBypassChatConsent(t *testing.T) {
	prefs := defaultPrefs()
	prefs.AllowChat = false

	userRepo := &mockUserPreferenceRepo{prefs: prefs}
	evaluator := newEvaluator(userRepo, &mockSPRepo{status: verifiedSP()}, &mockFreqRepo{}, &mockPublisher{})

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeChatMessage,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected DENY, got ALLOW — bot bypassed chat consent")
	}
}

// TestAllowedWhenNoPolicyBlocks is a positive test: when all policies pass,
// the evaluation should ALLOW the action.
func TestAllowedWhenNoPolicyBlocks(t *testing.T) {
	pub := &mockPublisher{}
	evaluator := newEvaluator(
		&mockUserPreferenceRepo{prefs: defaultPrefs()},
		&mockSPRepo{status: verifiedSP()},
		&mockFreqRepo{},
		pub,
	)

	req := entity.EvaluationRequest{
		UserID:            "user-1",
		ServiceProviderID: "sp-1",
		Category:          entity.CategoryServiceProvider,
		CommunicationType: entity.CommTypeNotification,
		ScheduledTime:     time.Now(),
	}

	result, err := evaluator.Evaluate(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Allowed {
		t.Fatalf("expected ALLOW, got DENY: %s", result.Reason)
	}
	if result.DecisionCode != entity.DecisionAllowStandard {
		t.Errorf("expected decision %s, got %s", entity.DecisionAllowStandard, result.DecisionCode)
	}
	// Verify event was published.
	if len(pub.published) == 0 {
		t.Error("expected policy.evaluated event to be published")
	}
}
