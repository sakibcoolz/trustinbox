package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"go.uber.org/zap"
)

// Mock implementations

type mockProfileRepo struct {
	profile *entity.UserProfile
	err     error
}

func (m *mockProfileRepo) GetByID(_ context.Context, _ string) (*entity.UserProfile, error) {
	return m.profile, m.err
}

func (m *mockProfileRepo) Update(_ context.Context, _ *entity.UserProfile) error {
	return m.err
}

type mockPrivacyRepo struct {
	pref *entity.PrivacyPreference
	err  error
}

func (m *mockPrivacyRepo) Get(_ context.Context, _ string) (*entity.PrivacyPreference, error) {
	return m.pref, m.err
}

func (m *mockPrivacyRepo) Upsert(_ context.Context, _ *entity.PrivacyPreference) error {
	return m.err
}

type mockDNDRepo struct {
	rules []entity.DNDRule
	err   error
}

func (m *mockDNDRepo) ListByUser(_ context.Context, _ string) ([]entity.DNDRule, error) {
	return m.rules, m.err
}

func (m *mockDNDRepo) Create(_ context.Context, _ *entity.DNDRule) error {
	return m.err
}

func (m *mockDNDRepo) Update(_ context.Context, _ *entity.DNDRule) error {
	return m.err
}

func (m *mockDNDRepo) Delete(_ context.Context, _, _ string) error {
	return m.err
}

type mockAvailabilityRepo struct {
	slots []entity.AvailabilitySlot
	err   error
}

func (m *mockAvailabilityRepo) ListByUser(_ context.Context, _ string) ([]entity.AvailabilitySlot, error) {
	return m.slots, m.err
}

func (m *mockAvailabilityRepo) Create(_ context.Context, _ *entity.AvailabilitySlot) error {
	return m.err
}

func (m *mockAvailabilityRepo) Delete(_ context.Context, _, _ string) error {
	return m.err
}

type mockBlockRepo struct {
	blocked []entity.BlockedOrganization
	err     error
}

func (m *mockBlockRepo) IsBlocked(_ context.Context, _, _ string) (bool, error) {
	return false, m.err
}

func (m *mockBlockRepo) Block(_ context.Context, _ *entity.BlockedOrganization) error {
	return m.err
}

func (m *mockBlockRepo) Unblock(_ context.Context, _, _ string) error {
	return m.err
}

func (m *mockBlockRepo) ListByUser(_ context.Context, _ string) ([]entity.BlockedOrganization, error) {
	return m.blocked, m.err
}

// Helper

func newTestUserUseCase(
	profileRepo *mockProfileRepo,
	privacyRepo *mockPrivacyRepo,
	dndRepo *mockDNDRepo,
	availRepo *mockAvailabilityRepo,
	blockRepo *mockBlockRepo,
) *UserUseCase {
	return NewUserUseCase(profileRepo, privacyRepo, dndRepo, availRepo, blockRepo, zap.NewNop())
}

// Tests

func TestGetProfile_NotFound(t *testing.T) {
	uc := newTestUserUseCase(
		&mockProfileRepo{err: fmt.Errorf("not found")},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	_, err := uc.GetProfile(context.Background(), "user-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetProfile_Success(t *testing.T) {
	expected := &entity.UserProfile{
		UserID:   "user-1",
		FullName: "Alice",
		Timezone: "UTC",
	}
	uc := newTestUserUseCase(
		&mockProfileRepo{profile: expected},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	profile, err := uc.GetProfile(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.UserID != expected.UserID {
		t.Errorf("expected UserID %s, got %s", expected.UserID, profile.UserID)
	}
	if profile.FullName != expected.FullName {
		t.Errorf("expected FullName %s, got %s", expected.FullName, profile.FullName)
	}
}

func TestUpdatePrivacyPreference(t *testing.T) {
	uc := newTestUserUseCase(
		&mockProfileRepo{},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	pref := &entity.PrivacyPreference{
		UserID:                     "user-1",
		AllowPersonalNotifications: true,
	}
	if err := uc.UpdatePrivacyPreference(context.Background(), pref); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCreateDNDRule(t *testing.T) {
	uc := newTestUserUseCase(
		&mockProfileRepo{},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	rule := &entity.DNDRule{
		UserID:    "user-1",
		ScopeType: "GLOBAL",
		StartTime: "22:00",
		EndTime:   "08:00",
		IsActive:  true,
	}
	result, err := uc.CreateDNDRule(context.Background(), rule)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID == "" {
		t.Error("expected ID to be populated, got empty string")
	}
}

func TestBlockOrganization(t *testing.T) {
	uc := newTestUserUseCase(
		&mockProfileRepo{},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	if err := uc.BlockOrganization(context.Background(), "user-1", "org-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUnblockOrganization(t *testing.T) {
	uc := newTestUserUseCase(
		&mockProfileRepo{},
		&mockPrivacyRepo{},
		&mockDNDRepo{},
		&mockAvailabilityRepo{},
		&mockBlockRepo{},
	)

	if err := uc.UnblockOrganization(context.Background(), "user-1", "org-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
