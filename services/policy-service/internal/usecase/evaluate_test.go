package usecase

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/trustinbox/policy-service/internal/domain/entity"
	"go.uber.org/zap"
)

// Mock repositories for testing

type mockUserRepo struct {
	prefs       *entity.UserPreferences
	dndRules    []entity.DNDRule
	slots       []entity.AvailabilitySlot
	blockedOrgs map[string]bool
}

func (m *mockUserRepo) GetPreferences(ctx context.Context, userID string) (*entity.UserPreferences, error) {
	if m.prefs == nil {
		return nil, fmt.Errorf("user not found")
	}
	return m.prefs, nil
}

func (m *mockUserRepo) GetDNDRules(ctx context.Context, userID string) ([]entity.DNDRule, error) {
	return m.dndRules, nil
}

func (m *mockUserRepo) GetAvailabilitySlots(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error) {
	return m.slots, nil
}

func (m *mockUserRepo) IsOrganizationBlocked(ctx context.Context, userID, orgID string) (bool, error) {
	return m.blockedOrgs[orgID], nil
}

type mockOrgRepo struct {
	status *entity.OrganizationStatus
}

func (m *mockOrgRepo) GetOrganizationStatus(ctx context.Context, orgID string) (*entity.OrganizationStatus, error) {
	if m.status == nil {
		return nil, fmt.Errorf("org not found")
	}
	return m.status, nil
}

type mockFreqRepo struct {
	count int
}

func (m *mockFreqRepo) GetAdCountForUser(ctx context.Context, userID, orgID string) (int, error) {
	return m.count, nil
}

func (m *mockFreqRepo) IncrementAdCount(ctx context.Context, userID, orgID string) error {
	m.count++
	return nil
}

func newTestEvaluator(userRepo *mockUserRepo, orgRepo *mockOrgRepo, freqRepo *mockFreqRepo) *PolicyEvaluator {
	return NewPolicyEvaluator(userRepo, orgRepo, freqRepo, nil, zap.NewNop())
}

func TestEvaluate_AllowStandard(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{
				UserID:                     "user-1",
				AllowPersonalNotifications: true,
				AllowOrgNotifications:      true,
				AllowCallbackRequests:      true,
				RequireCallApproval:        false,
			},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
				SpamScore:          0.5,
			},
		},
		&mockFreqRepo{},
	)

	result, err := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:            "user-1",
		OrganizationID:    "org-1",
		Category:          entity.CategoryPersonal,
		Channel:           entity.ChannelInbox,
		CommunicationType: entity.CommTypeNotification,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Allowed {
		t.Errorf("expected allowed, got denied: %s", result.DecisionCode)
	}
	if result.DecisionCode != entity.DecisionAllowStandard {
		t.Errorf("expected ALLOW_STANDARD, got %s", result.DecisionCode)
	}
}

func TestEvaluate_DenyOrgNotVerified(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{AllowPersonalNotifications: true},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "PENDING",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       entity.CategoryPersonal,
	})
	if result.Allowed {
		t.Error("expected denied for unverified org")
	}
	if result.DecisionCode != entity.DecisionDenyOrgNotVerified {
		t.Errorf("expected DENY_ORG_NOT_VERIFIED, got %s", result.DecisionCode)
	}
}

func TestEvaluate_DenyUserBlockedOrg(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs:       &entity.UserPreferences{AllowPersonalNotifications: true},
			blockedOrgs: map[string]bool{"org-1": true},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       entity.CategoryPersonal,
	})
	if result.Allowed {
		t.Error("expected denied for blocked org")
	}
	if result.DecisionCode != entity.DecisionDenyUserBlockedOrg {
		t.Errorf("expected DENY_USER_BLOCKED_ORG, got %s", result.DecisionCode)
	}
}

func TestEvaluate_DenyCategoryDisabled(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{
				AllowAdvertisements: false,
			},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       entity.CategoryAdvertisement,
	})
	if result.Allowed {
		t.Error("expected denied for disabled category")
	}
	if result.DecisionCode != entity.DecisionDenyCategoryDisabled {
		t.Errorf("expected DENY_CATEGORY_DISABLED, got %s", result.DecisionCode)
	}
}

func TestEvaluate_DenyDNDActive(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{AllowPersonalNotifications: true},
			dndRules: []entity.DNDRule{
				{
					ScopeType:  "GLOBAL",
					StartTime:  "00:00",
					EndTime:    "23:59",
					DaysOfWeek: []int{0, 1, 2, 3, 4, 5, 6},
					IsActive:   true,
				},
			},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       entity.CategoryPersonal,
		ScheduledTime:  time.Now(),
	})
	if result.Allowed {
		t.Error("expected denied during DND")
	}
	if result.DecisionCode != entity.DecisionDenyDNDActive {
		t.Errorf("expected DENY_DND_ACTIVE, got %s", result.DecisionCode)
	}
}

func TestEvaluate_AdCapExceeded(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{AllowAdvertisements: true},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{count: 5},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Category:       entity.CategoryAdvertisement,
	})
	if result.Allowed {
		t.Error("expected denied for ad cap exceeded")
	}
	if result.DecisionCode != entity.DecisionDenyAdCapExceeded {
		t.Errorf("expected DENY_AD_CAP_EXCEEDED, got %s", result.DecisionCode)
	}
}

func TestEvaluate_RequireCallbackApproval(t *testing.T) {
	evaluator := newTestEvaluator(
		&mockUserRepo{
			prefs: &entity.UserPreferences{
				AllowCallbackRequests: true,
				RequireCallApproval:   true,
			},
		},
		&mockOrgRepo{
			status: &entity.OrganizationStatus{
				VerificationStatus: "VERIFIED",
				Status:             "ACTIVE",
			},
		},
		&mockFreqRepo{},
	)

	result, _ := evaluator.Evaluate(context.Background(), entity.EvaluationRequest{
		UserID:            "user-1",
		OrganizationID:    "org-1",
		Category:          entity.CategoryPersonal,
		CommunicationType: entity.CommTypeCallbackReq,
	})
	if !result.Allowed {
		t.Error("callback request should be allowed for routing to approval")
	}
	if result.DecisionCode != entity.DecisionRequireCallbackApproval {
		t.Errorf("expected REQUIRE_CALLBACK_APPROVAL, got %s", result.DecisionCode)
	}
}
