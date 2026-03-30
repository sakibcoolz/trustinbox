package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/industry-service/internal/domain/entity"
	"github.com/trustinbox/industry-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
)

// IndustryProfileUseCase implements industry profile lifecycle operations.
type IndustryProfileUseCase struct {
	repo repository.IndustryProfileRepository
}

// NewIndustryProfileUseCase creates a new IndustryProfileUseCase.
func NewIndustryProfileUseCase(repo repository.IndustryProfileRepository) *IndustryProfileUseCase {
	return &IndustryProfileUseCase{repo: repo}
}

// CreateIndustryProfile creates a new industry profile.
func (uc *IndustryProfileUseCase) CreateIndustryProfile(ctx context.Context, industryKey, displayName, description, reasonCodesJSON, templatesJSON string, defaultCategories []string, complianceHintsJSON, documentTypesJSON, callbackWorkflowsJSON, botPromptPackJSON, dashboardPresetsJSON, analyticsPresetsJSON string) (*entity.IndustryProfile, error) {
	ctx, span := tracing.StartSpan(ctx, "industry-service", "IndustryProfileUseCase.CreateIndustryProfile",
		attribute.String("industry_key", industryKey),
	)
	defer span.End()

	if industryKey == "" {
		return nil, bizerr.InvalidInput("industry_key is required")
	}
	if displayName == "" {
		return nil, bizerr.InvalidInput("display_name is required")
	}

	// Check for duplicate key
	existing, _ := uc.repo.GetByKey(ctx, industryKey)
	if existing != nil {
		return nil, bizerr.New(bizerr.CodeAlreadyExists, "industry profile already exists: "+industryKey)
	}

	now := time.Now().UTC()
	profile := &entity.IndustryProfile{
		ID:                 uuid.New().String(),
		IndustryKey:        industryKey,
		DisplayName:        displayName,
		Description:        description,
		DefaultReasonCodes: reasonCodesJSON,
		DefaultTemplates:   templatesJSON,
		DefaultCategories:  defaultCategories,
		ComplianceHints:    complianceHintsJSON,
		DocumentTypes:      documentTypesJSON,
		CallbackWorkflows:  callbackWorkflowsJSON,
		BotPromptPack:      botPromptPackJSON,
		DashboardPresets:   dashboardPresetsJSON,
		AnalyticsPresets:   analyticsPresetsJSON,
		IsActive:           true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := uc.repo.Create(ctx, profile); err != nil {
		return nil, bizerr.Internal("failed to create industry profile", err)
	}

	return profile, nil
}

// GetIndustryProfile retrieves an industry profile by its unique key.
func (uc *IndustryProfileUseCase) GetIndustryProfile(ctx context.Context, industryKey string) (*entity.IndustryProfile, error) {
	ctx, span := tracing.StartSpan(ctx, "industry-service", "IndustryProfileUseCase.GetIndustryProfile",
		attribute.String("industry_key", industryKey),
	)
	defer span.End()

	if industryKey == "" {
		return nil, bizerr.InvalidInput("industry_key is required")
	}

	return uc.repo.GetByKey(ctx, industryKey)
}

// UpdateIndustryProfile updates an existing industry profile.
func (uc *IndustryProfileUseCase) UpdateIndustryProfile(ctx context.Context, industryKey, displayName, description, reasonCodesJSON, templatesJSON string, defaultCategories []string, complianceHintsJSON, documentTypesJSON, callbackWorkflowsJSON, botPromptPackJSON, dashboardPresetsJSON, analyticsPresetsJSON string, isActive bool) (*entity.IndustryProfile, error) {
	ctx, span := tracing.StartSpan(ctx, "industry-service", "IndustryProfileUseCase.UpdateIndustryProfile",
		attribute.String("industry_key", industryKey),
	)
	defer span.End()

	if industryKey == "" {
		return nil, bizerr.InvalidInput("industry_key is required")
	}

	profile, err := uc.repo.GetByKey(ctx, industryKey)
	if err != nil {
		return nil, err
	}

	if displayName != "" {
		profile.DisplayName = displayName
	}
	if description != "" {
		profile.Description = description
	}
	if reasonCodesJSON != "" {
		profile.DefaultReasonCodes = reasonCodesJSON
	}
	if templatesJSON != "" {
		profile.DefaultTemplates = templatesJSON
	}
	if len(defaultCategories) > 0 {
		profile.DefaultCategories = defaultCategories
	}
	if complianceHintsJSON != "" {
		profile.ComplianceHints = complianceHintsJSON
	}
	if documentTypesJSON != "" {
		profile.DocumentTypes = documentTypesJSON
	}
	if callbackWorkflowsJSON != "" {
		profile.CallbackWorkflows = callbackWorkflowsJSON
	}
	if botPromptPackJSON != "" {
		profile.BotPromptPack = botPromptPackJSON
	}
	if dashboardPresetsJSON != "" {
		profile.DashboardPresets = dashboardPresetsJSON
	}
	if analyticsPresetsJSON != "" {
		profile.AnalyticsPresets = analyticsPresetsJSON
	}
	profile.IsActive = isActive
	profile.UpdatedAt = time.Now().UTC()

	if err := uc.repo.Update(ctx, profile); err != nil {
		return nil, bizerr.Internal("failed to update industry profile", err)
	}

	return profile, nil
}

// ListIndustryProfiles returns industry profiles with optional filtering.
func (uc *IndustryProfileUseCase) ListIndustryProfiles(ctx context.Context, activeOnly bool, limit, offset int) ([]*entity.IndustryProfile, int, error) {
	ctx, span := tracing.StartSpan(ctx, "industry-service", "IndustryProfileUseCase.ListIndustryProfiles")
	defer span.End()

	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	return uc.repo.List(ctx, activeOnly, limit, offset)
}
