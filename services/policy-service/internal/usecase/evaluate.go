package usecase

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

const (
	adCapPerOrgPerDay  = 3
	spamScoreThreshold = 8.0
	tracerName         = "policy-service"
)

// PolicyEvaluator implements the core policy evaluation logic.
type PolicyEvaluator struct {
	userRepo repository.UserPreferenceRepository
	orgRepo  repository.OrganizationRepository
	freqRepo repository.FrequencyRepository
	log      *zap.Logger
}

func NewPolicyEvaluator(
	userRepo repository.UserPreferenceRepository,
	orgRepo repository.OrganizationRepository,
	freqRepo repository.FrequencyRepository,
	log *zap.Logger,
) *PolicyEvaluator {
	return &PolicyEvaluator{
		userRepo: userRepo,
		orgRepo:  orgRepo,
		freqRepo: freqRepo,
		log:      log,
	}
}

// Evaluate runs the full policy evaluation chain.
func (e *PolicyEvaluator) Evaluate(ctx context.Context, req entity.EvaluationRequest) (*entity.EvaluationResult, error) {
	ctx, span := tracing.StartSpan(ctx, tracerName, "PolicyEvaluator.Evaluate",
		attribute.String("user_id", req.UserID),
		attribute.String("organization_id", req.OrganizationID),
		attribute.String("category", string(req.Category)),
	)
	defer span.End()

	result := &entity.EvaluationResult{
		AppliedRules: make([]string, 0),
	}

	// 1. Check user exists and load preferences
	prefs, err := e.userRepo.GetPreferences(ctx, req.UserID)
	if err != nil {
		result.DecisionCode = entity.DecisionDenyUserNotFound
		result.Reason = "user not found or inactive"
		result.AppliedRules = append(result.AppliedRules, "USER_EXISTS_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "USER_EXISTS_CHECK")

	// 2. Check organization exists and is verified
	orgStatus, err := e.orgRepo.GetOrganizationStatus(ctx, req.OrganizationID)
	if err != nil {
		result.DecisionCode = entity.DecisionDenyOrgNotVerified
		result.Reason = "organization not found"
		result.AppliedRules = append(result.AppliedRules, "ORG_VERIFICATION_CHECK")
		return result, nil
	}
	if orgStatus.VerificationStatus != "VERIFIED" {
		result.DecisionCode = entity.DecisionDenyOrgNotVerified
		result.Reason = fmt.Sprintf("organization verification status: %s", orgStatus.VerificationStatus)
		result.AppliedRules = append(result.AppliedRules, "ORG_VERIFICATION_CHECK")
		return result, nil
	}
	if orgStatus.Status == "SUSPENDED" {
		result.DecisionCode = entity.DecisionDenyOrgSuspended
		result.Reason = "organization is suspended"
		result.AppliedRules = append(result.AppliedRules, "ORG_STATUS_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "ORG_VERIFICATION_CHECK", "ORG_STATUS_CHECK")

	// 3. Check user blocked organization
	blocked, err := e.userRepo.IsOrganizationBlocked(ctx, req.UserID, req.OrganizationID)
	if err != nil {
		e.log.Error("failed to check blocked org", zap.Error(err))
	}
	if blocked {
		result.DecisionCode = entity.DecisionDenyUserBlockedOrg
		result.Reason = "user has blocked this organization"
		result.AppliedRules = append(result.AppliedRules, "BLOCK_LIST_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "BLOCK_LIST_CHECK")

	// 4. Check category allowed
	if !e.isCategoryAllowed(prefs, req.Category, req.CommunicationType) {
		result.DecisionCode = entity.DecisionDenyCategoryDisabled
		result.Reason = fmt.Sprintf("category %s is disabled by user preferences", req.Category)
		result.AppliedRules = append(result.AppliedRules, "CATEGORY_PREFERENCE_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "CATEGORY_PREFERENCE_CHECK")

	// 5. Check DND rules
	evalTime := req.ScheduledTime
	if evalTime.IsZero() {
		evalTime = time.Now()
	}

	dndRules, err := e.userRepo.GetDNDRules(ctx, req.UserID)
	if err != nil {
		e.log.Error("failed to load DND rules", zap.Error(err))
	}
	if e.isDNDActive(dndRules, evalTime, req.Category, req.OrganizationID) {
		result.DecisionCode = entity.DecisionDenyDNDActive
		result.Reason = "user is in Do Not Disturb mode"
		result.AppliedRules = append(result.AppliedRules, "DND_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "DND_CHECK")

	// 6. Check callback requires approval
	if req.CommunicationType == entity.CommTypeCallbackReq && prefs.RequireCallApproval {
		result.Allowed = true
		result.DecisionCode = entity.DecisionRequireCallbackApproval
		result.Reason = "callback request will be sent for user approval"
		result.AppliedRules = append(result.AppliedRules, "CALLBACK_APPROVAL_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "CALLBACK_APPROVAL_CHECK")

	// 7. Check ad frequency cap
	if req.Category == entity.CategoryAdvertisement {
		adCount, err := e.freqRepo.GetAdCountForUser(ctx, req.UserID, req.OrganizationID)
		if err != nil {
			e.log.Error("failed to check ad frequency", zap.Error(err))
		}
		if adCount >= adCapPerOrgPerDay {
			result.DecisionCode = entity.DecisionDenyAdCapExceeded
			result.Reason = fmt.Sprintf("advertisement cap exceeded (%d/%d today)", adCount, adCapPerOrgPerDay)
			result.AppliedRules = append(result.AppliedRules, "AD_FREQUENCY_CHECK")
			return result, nil
		}
		result.AppliedRules = append(result.AppliedRules, "AD_FREQUENCY_CHECK")
	}

	// 8. Check spam score
	if orgStatus.SpamScore >= spamScoreThreshold {
		result.DecisionCode = entity.DecisionDenySpamScoreHigh
		result.Reason = fmt.Sprintf("organization spam score too high: %.1f", orgStatus.SpamScore)
		result.AppliedRules = append(result.AppliedRules, "SPAM_SCORE_CHECK")
		return result, nil
	}
	result.AppliedRules = append(result.AppliedRules, "SPAM_SCORE_CHECK")

	// All checks passed
	result.Allowed = true
	result.DecisionCode = entity.DecisionAllowStandard
	result.Reason = "all policy checks passed"
	return result, nil
}

func (e *PolicyEvaluator) isCategoryAllowed(prefs *entity.UserPreferences, category entity.Category, commType entity.CommunicationType) bool {
	// Check communication-type-specific preferences first; they are more specific than category.
	switch commType {
	case entity.CommTypeCallbackReq:
		return prefs.AllowCallbackRequests
	case entity.CommTypeChatMessage:
		return prefs.AllowChat
	case entity.CommTypeDocumentShare:
		return prefs.AllowDocumentShares
	}
	// Fall back to category-level checks.
	switch category {
	case entity.CategoryPersonal:
		return prefs.AllowPersonalNotifications
	case entity.CategoryOrganizational:
		return prefs.AllowOrgNotifications
	case entity.CategoryAdvertisement:
		return prefs.AllowAdvertisements
	}
	return true
}

func (e *PolicyEvaluator) isDNDActive(rules []entity.DNDRule, t time.Time, category entity.Category, orgID string) bool {
	dayOfWeek := int(t.Weekday())
	currentTime := t.Format("15:04")

	for _, rule := range rules {
		if !rule.IsActive {
			continue
		}
		// Check scope
		switch rule.ScopeType {
		case "GLOBAL":
			// applies to all
		case "CATEGORY":
			if rule.ScopeRefID != string(category) {
				continue
			}
		case "ORGANIZATION":
			if rule.ScopeRefID != orgID {
				continue
			}
		}

		// Check day
		dayMatch := false
		for _, d := range rule.DaysOfWeek {
			if d == dayOfWeek {
				dayMatch = true
				break
			}
		}
		if !dayMatch {
			continue
		}

		// Check time range (handles overnight ranges like 22:00 - 07:00)
		if isTimeInRange(currentTime, rule.StartTime, rule.EndTime) {
			return true
		}
	}
	return false
}

func isTimeInRange(current, start, end string) bool {
	c := timeToMinutes(current)
	s := timeToMinutes(start)
	e := timeToMinutes(end)

	if s <= e {
		return c >= s && c <= e
	}
	// Overnight range (e.g., 22:00 - 07:00)
	return c >= s || c <= e
}

func timeToMinutes(t string) int {
	parts := strings.Split(t, ":")
	if len(parts) != 2 {
		return 0
	}
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	return h*60 + m
}
