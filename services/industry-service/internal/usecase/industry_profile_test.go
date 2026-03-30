package usecase

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/trustinbox/industry-service/internal/domain/entity"
)

// --- Mock repository ---

type mockIndustryProfileRepo struct {
	profiles map[string]*entity.IndustryProfile
}

func newMockRepo() *mockIndustryProfileRepo {
	return &mockIndustryProfileRepo{profiles: make(map[string]*entity.IndustryProfile)}
}

func (m *mockIndustryProfileRepo) Create(ctx context.Context, p *entity.IndustryProfile) error {
	m.profiles[p.IndustryKey] = p
	return nil
}

func (m *mockIndustryProfileRepo) GetByKey(ctx context.Context, key string) (*entity.IndustryProfile, error) {
	if p, ok := m.profiles[key]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] industry_profile not found: %s", key)
}

func (m *mockIndustryProfileRepo) Update(ctx context.Context, p *entity.IndustryProfile) error {
	m.profiles[p.IndustryKey] = p
	return nil
}

func (m *mockIndustryProfileRepo) List(ctx context.Context, activeOnly bool, limit, offset int) ([]*entity.IndustryProfile, int, error) {
	var result []*entity.IndustryProfile
	for _, p := range m.profiles {
		if activeOnly && !p.IsActive {
			continue
		}
		result = append(result, p)
	}
	total := len(result)
	if offset >= len(result) {
		return nil, total, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

// --- Tests ---

func TestCreateIndustryProfile_Success(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	profile, err := uc.CreateIndustryProfile(ctx,
		"banking_finance", "Banking & Finance", "Banks, NBFCs, insurance",
		`["ACCOUNT_UPDATE"]`, `[]`, []string{"ORGANIZATIONAL"},
		`{"framework":"RBI_COMPLIANCE"}`, `["ACCOUNT_STATEMENT"]`,
		`{"requires_approval":true}`, `{}`, `{}`, `{}`,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.IndustryKey != "banking_finance" {
		t.Errorf("expected industry_key=banking_finance, got %s", profile.IndustryKey)
	}
	if profile.DisplayName != "Banking & Finance" {
		t.Errorf("expected display_name='Banking & Finance', got %s", profile.DisplayName)
	}
	if !profile.IsActive {
		t.Error("expected is_active=true")
	}
	if profile.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestCreateIndustryProfile_MissingKey(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.CreateIndustryProfile(ctx,
		"", "Banking & Finance", "",
		"", "", nil, "", "", "", "", "", "",
	)
	if err == nil {
		t.Fatal("expected error for missing industry_key")
	}
	if !strings.Contains(err.Error(), "industry_key is required") {
		t.Errorf("expected 'industry_key is required' error, got: %v", err)
	}
}

func TestCreateIndustryProfile_MissingDisplayName(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.CreateIndustryProfile(ctx,
		"banking_finance", "", "",
		"", "", nil, "", "", "", "", "", "",
	)
	if err == nil {
		t.Fatal("expected error for missing display_name")
	}
	if !strings.Contains(err.Error(), "display_name is required") {
		t.Errorf("expected 'display_name is required' error, got: %v", err)
	}
}

func TestCreateIndustryProfile_DuplicateKey(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.CreateIndustryProfile(ctx,
		"banking_finance", "Banking & Finance", "",
		"", "", nil, "", "", "", "", "", "",
	)
	if err != nil {
		t.Fatalf("unexpected error on first create: %v", err)
	}

	_, err = uc.CreateIndustryProfile(ctx,
		"banking_finance", "Banking & Finance v2", "",
		"", "", nil, "", "", "", "", "", "",
	)
	if err == nil {
		t.Fatal("expected error for duplicate industry_key")
	}
	if !strings.Contains(err.Error(), "already exists") {
		t.Errorf("expected 'already exists' error, got: %v", err)
	}
}

func TestGetIndustryProfile_Success(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	created, err := uc.CreateIndustryProfile(ctx,
		"healthcare", "Healthcare", "Hospitals and clinics",
		"", "", nil, "", "", "", "", "", "",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found, err := uc.GetIndustryProfile(ctx, "healthcare")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if found.ID != created.ID {
		t.Errorf("expected ID=%s, got %s", created.ID, found.ID)
	}
}

func TestGetIndustryProfile_NotFound(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.GetIndustryProfile(ctx, "nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent profile")
	}
	if !strings.Contains(err.Error(), "NOT_FOUND") {
		t.Errorf("expected NOT_FOUND error, got: %v", err)
	}
}

func TestGetIndustryProfile_EmptyKey(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.GetIndustryProfile(ctx, "")
	if err == nil {
		t.Fatal("expected error for empty key")
	}
	if !strings.Contains(err.Error(), "industry_key is required") {
		t.Errorf("expected 'industry_key is required' error, got: %v", err)
	}
}

func TestUpdateIndustryProfile_Success(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.CreateIndustryProfile(ctx,
		"real_estate", "Real Estate", "Developers and brokers",
		"", "", nil, "", "", "", "", "", "",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	updated, err := uc.UpdateIndustryProfile(ctx,
		"real_estate", "Real Estate & Property", "Updated description",
		`["SITE_VISIT"]`, "", []string{"ORGANIZATIONAL", "PERSONAL"},
		"", "", "", "", "", "", false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.DisplayName != "Real Estate & Property" {
		t.Errorf("expected updated display_name, got %s", updated.DisplayName)
	}
	if updated.Description != "Updated description" {
		t.Errorf("expected updated description, got %s", updated.Description)
	}
	if updated.IsActive {
		t.Error("expected is_active=false after update")
	}
	if len(updated.DefaultCategories) != 2 {
		t.Errorf("expected 2 categories, got %d", len(updated.DefaultCategories))
	}
}

func TestUpdateIndustryProfile_NotFound(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.UpdateIndustryProfile(ctx,
		"nonexistent", "", "", "", "", nil, "", "", "", "", "", "", true,
	)
	if err == nil {
		t.Fatal("expected error for non-existent profile")
	}
	if !strings.Contains(err.Error(), "NOT_FOUND") {
		t.Errorf("expected NOT_FOUND error, got: %v", err)
	}
}

func TestUpdateIndustryProfile_EmptyKey(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, err := uc.UpdateIndustryProfile(ctx,
		"", "", "", "", "", nil, "", "", "", "", "", "", true,
	)
	if err == nil {
		t.Fatal("expected error for empty key")
	}
}

func TestListIndustryProfiles_Success(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, _ = uc.CreateIndustryProfile(ctx,
		"banking_finance", "Banking & Finance", "",
		"", "", nil, "", "", "", "", "", "",
	)
	_, _ = uc.CreateIndustryProfile(ctx,
		"healthcare", "Healthcare", "",
		"", "", nil, "", "", "", "", "", "",
	)
	_, _ = uc.CreateIndustryProfile(ctx,
		"real_estate", "Real Estate", "",
		"", "", nil, "", "", "", "", "", "",
	)

	profiles, total, err := uc.ListIndustryProfiles(ctx, false, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 3 {
		t.Errorf("expected total=3, got %d", total)
	}
	if len(profiles) != 3 {
		t.Errorf("expected 3 profiles, got %d", len(profiles))
	}
}

func TestListIndustryProfiles_ActiveOnly(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	_, _ = uc.CreateIndustryProfile(ctx,
		"banking_finance", "Banking & Finance", "",
		"", "", nil, "", "", "", "", "", "",
	)
	_, _ = uc.CreateIndustryProfile(ctx,
		"healthcare", "Healthcare", "",
		"", "", nil, "", "", "", "", "", "",
	)

	// Deactivate one
	_, _ = uc.UpdateIndustryProfile(ctx,
		"healthcare", "", "", "", "", nil, "", "", "", "", "", "", false,
	)

	profiles, total, err := uc.ListIndustryProfiles(ctx, true, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total=1 active, got %d", total)
	}
	if len(profiles) != 1 {
		t.Errorf("expected 1 active profile, got %d", len(profiles))
	}
}

func TestListIndustryProfiles_DefaultLimit(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	// Test with zero limit defaults to 50
	profiles, total, err := uc.ListIndustryProfiles(ctx, false, 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 0 {
		t.Errorf("expected total=0, got %d", total)
	}
	if len(profiles) != 0 {
		t.Errorf("expected 0 profiles, got %d", len(profiles))
	}
}

func TestListIndustryProfiles_NegativeOffset(t *testing.T) {
	repo := newMockRepo()
	uc := NewIndustryProfileUseCase(repo)
	ctx := context.Background()

	// Negative offset should be normalized to 0
	_, _, err := uc.ListIndustryProfiles(ctx, false, 10, -5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
