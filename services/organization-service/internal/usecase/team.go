package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

type TeamUseCase struct {
	spUserRepo    repository.ServiceProviderUserRepository
	invRepo       repository.InvitationRepository
	spRepo        repository.ServiceProviderRepository
	publisher     events.Publisher
	log           *zap.Logger
	invitationTTL time.Duration
}

func NewTeamUseCase(
	spUserRepo repository.ServiceProviderUserRepository,
	invRepo repository.InvitationRepository,
	spRepo repository.ServiceProviderRepository,
	publisher events.Publisher,
	log *zap.Logger,
) *TeamUseCase {
	return &TeamUseCase{
		spUserRepo:    spUserRepo,
		invRepo:       invRepo,
		spRepo:        spRepo,
		publisher:     publisher,
		log:           log,
		invitationTTL: 7 * 24 * time.Hour, // 7 days default
	}
}

type InviteInput struct {
	Email             string
	Role              string
	ServiceProviderID string
	InvitedByUserID   string
}

type InviteResult struct {
	InvitationID string
	Token        string // Raw token to send via email
}

// InviteUser creates a pending invitation for a new team member.
func (uc *TeamUseCase) InviteUser(ctx context.Context, input InviteInput) (*InviteResult, error) {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "InviteUser",
		attribute.String("email", input.Email),
		attribute.String("sp_id", input.ServiceProviderID),
	)
	defer span.End()

	// Validate role
	if !isValidSPRole(input.Role) {
		return nil, bzerr.InvalidInput("invalid role: must be SP_ADMIN, AGENT, or ANALYST")
	}

	// Check caller is admin of this SP
	callerMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.InvitedByUserID)
	if err != nil || callerMembership.Role != "SP_ADMIN" {
		return nil, bzerr.Forbidden("only SP_ADMIN can invite team members")
	}

	// Check for existing pending invitation
	existing, err := uc.invRepo.GetPendingByEmailAndSP(ctx, input.Email, input.ServiceProviderID)
	if err == nil && existing != nil {
		return nil, bzerr.InvalidInput("a pending invitation already exists for this email")
	}

	// Generate secure token
	token, tokenHash, err := generateInvitationToken()
	if err != nil {
		return nil, bzerr.Internal("failed to generate invitation token", err)
	}

	inv := &entity.Invitation{
		ID:                uuid.New().String(),
		TokenHash:         tokenHash,
		Email:             input.Email,
		ServiceProviderID: input.ServiceProviderID,
		Role:              input.Role,
		Status:            "PENDING",
		InvitedBy:         input.InvitedByUserID,
		ExpiresAt:         time.Now().Add(uc.invitationTTL),
	}

	if err := uc.invRepo.Create(ctx, inv); err != nil {
		return nil, bzerr.Internal("failed to create invitation", err)
	}

	uc.publishEvent(ctx, events.TeamMemberInvited, inv.ID, input.InvitedByUserID, input.ServiceProviderID, map[string]interface{}{
		"invitation_id":       inv.ID,
		"email":               input.Email,
		"role":                input.Role,
		"service_provider_id": input.ServiceProviderID,
	})

	return &InviteResult{
		InvitationID: inv.ID,
		Token:        token,
	}, nil
}

type AcceptInvitationInput struct {
	Token  string
	UserID string
}

// AcceptInvitation accepts an invitation and adds the user to the SP.
func (uc *TeamUseCase) AcceptInvitation(ctx context.Context, input AcceptInvitationInput) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "AcceptInvitation")
	defer span.End()

	tokenHash := hashToken(input.Token)
	inv, err := uc.invRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return bzerr.NotFound("invitation", "token")
	}

	if inv.Status != "PENDING" {
		return bzerr.InvalidInput("invitation is no longer pending")
	}

	if time.Now().After(inv.ExpiresAt) {
		_ = uc.invRepo.UpdateStatus(ctx, inv.ID, "EXPIRED")
		return bzerr.InvalidInput("invitation has expired")
	}

	// Add user to SP
	spUser := &entity.ServiceProviderUser{
		ID:                uuid.New().String(),
		ServiceProviderID: inv.ServiceProviderID,
		UserID:            input.UserID,
		Role:              inv.Role,
		Status:            "ACTIVE",
	}
	if err := uc.spUserRepo.Add(ctx, spUser); err != nil {
		return bzerr.Internal("failed to add user to service provider", err)
	}

	if err := uc.invRepo.UpdateStatus(ctx, inv.ID, "ACCEPTED"); err != nil {
		return bzerr.Internal("failed to update invitation status", err)
	}

	uc.publishEvent(ctx, events.InvitationAccepted, inv.ID, input.UserID, inv.ServiceProviderID, map[string]interface{}{
		"invitation_id":       inv.ID,
		"user_id":             input.UserID,
		"role":                inv.Role,
		"service_provider_id": inv.ServiceProviderID,
	})

	return nil
}

type ChangeRoleInput struct {
	TargetUserID      string
	ServiceProviderID string
	NewRole           string
	ActorUserID       string
}

// ChangeUserRole changes a team member's role with last-admin guard.
func (uc *TeamUseCase) ChangeUserRole(ctx context.Context, input ChangeRoleInput) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "ChangeUserRole",
		attribute.String("target_user_id", input.TargetUserID),
		attribute.String("new_role", input.NewRole),
	)
	defer span.End()

	if !isValidSPRole(input.NewRole) {
		return bzerr.InvalidInput("invalid role: must be SP_ADMIN, AGENT, or ANALYST")
	}

	// Check caller is admin
	callerMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.ActorUserID)
	if err != nil || callerMembership.Role != "SP_ADMIN" {
		return bzerr.Forbidden("only SP_ADMIN can change roles")
	}

	// Get target membership
	targetMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.TargetUserID)
	if err != nil {
		return bzerr.NotFound("team_member", input.TargetUserID)
	}

	// Last-admin guard: prevent demoting if this is the only admin
	if targetMembership.Role == "SP_ADMIN" && input.NewRole != "SP_ADMIN" {
		adminCount, err := uc.spUserRepo.CountByRole(ctx, input.ServiceProviderID, "SP_ADMIN")
		if err != nil {
			return bzerr.Internal("failed to count admins", err)
		}
		if adminCount <= 1 {
			return bzerr.InvalidInput("cannot demote the last SP_ADMIN")
		}
	}

	if err := uc.spUserRepo.UpdateRole(ctx, targetMembership.ID, input.ServiceProviderID, input.NewRole); err != nil {
		return bzerr.Internal("failed to update role", err)
	}

	uc.publishEvent(ctx, events.TeamMemberRoleChanged, targetMembership.ID, input.ActorUserID, input.ServiceProviderID, map[string]interface{}{
		"target_user_id":      input.TargetUserID,
		"old_role":            targetMembership.Role,
		"new_role":            input.NewRole,
		"service_provider_id": input.ServiceProviderID,
	})

	return nil
}

type RemoveMemberInput struct {
	TargetUserID      string
	ServiceProviderID string
	ActorUserID       string
}

// RemoveTeamMember removes a user from an SP with last-admin guard.
func (uc *TeamUseCase) RemoveTeamMember(ctx context.Context, input RemoveMemberInput) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "RemoveTeamMember",
		attribute.String("target_user_id", input.TargetUserID),
		attribute.String("sp_id", input.ServiceProviderID),
	)
	defer span.End()

	// Check caller is admin
	callerMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.ActorUserID)
	if err != nil || callerMembership.Role != "SP_ADMIN" {
		return bzerr.Forbidden("only SP_ADMIN can remove team members")
	}

	// Get target membership
	targetMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.TargetUserID)
	if err != nil {
		return bzerr.NotFound("team_member", input.TargetUserID)
	}

	// Last-admin guard
	if targetMembership.Role == "SP_ADMIN" {
		adminCount, err := uc.spUserRepo.CountByRole(ctx, input.ServiceProviderID, "SP_ADMIN")
		if err != nil {
			return bzerr.Internal("failed to count admins", err)
		}
		if adminCount <= 1 {
			return bzerr.InvalidInput("cannot remove the last SP_ADMIN")
		}
	}

	if err := uc.spUserRepo.Remove(ctx, targetMembership.ID, input.ServiceProviderID); err != nil {
		return bzerr.Internal("failed to remove team member", err)
	}

	uc.publishEvent(ctx, events.TeamMemberRemoved, targetMembership.ID, input.ActorUserID, input.ServiceProviderID, map[string]interface{}{
		"target_user_id":      input.TargetUserID,
		"service_provider_id": input.ServiceProviderID,
	})

	return nil
}

// RevokeInvitation revokes a pending invitation.
func (uc *TeamUseCase) RevokeInvitation(ctx context.Context, invitationID, actorUserID, spID string) error {
	inv, err := uc.invRepo.GetByID(ctx, invitationID)
	if err != nil {
		return bzerr.NotFound("invitation", invitationID)
	}

	if inv.Status != "PENDING" {
		return bzerr.InvalidInput("only pending invitations can be revoked")
	}

	// Check caller is admin
	callerMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, spID, actorUserID)
	if err != nil || callerMembership.Role != "SP_ADMIN" {
		return bzerr.Forbidden("only SP_ADMIN can revoke invitations")
	}

	if err := uc.invRepo.UpdateStatus(ctx, invitationID, "REVOKED"); err != nil {
		return bzerr.Internal("failed to revoke invitation", err)
	}

	uc.publishEvent(ctx, events.InvitationRevoked, invitationID, actorUserID, spID, map[string]interface{}{
		"invitation_id":       invitationID,
		"service_provider_id": spID,
	})

	return nil
}

type DeactivateInput struct {
	TargetUserID      string
	ServiceProviderID string
	ActorUserID       string
}

// DeactivateUser soft-deactivates a user from a service provider.
func (uc *TeamUseCase) DeactivateUser(ctx context.Context, input DeactivateInput) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "DeactivateUser",
		attribute.String("target_user_id", input.TargetUserID),
		attribute.String("sp_id", input.ServiceProviderID),
	)
	defer span.End()

	// Check caller is admin
	callerMembership, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.ActorUserID)
	if err != nil || callerMembership.Role != "SP_ADMIN" {
		return bzerr.Forbidden("only SP_ADMIN can deactivate team members")
	}

	// Resolve target membership
	target, err := uc.spUserRepo.GetBySPAndUser(ctx, input.ServiceProviderID, input.TargetUserID)
	if err != nil {
		return bzerr.NotFound("team_member", input.TargetUserID)
	}

	// Prevent deactivating the last admin
	if target.Role == "SP_ADMIN" {
		count, err := uc.spUserRepo.CountByRole(ctx, input.ServiceProviderID, "SP_ADMIN")
		if err != nil {
			return bzerr.Internal("failed to count admins", err)
		}
		if count <= 1 {
			return bzerr.InvalidInput("cannot deactivate the last SP_ADMIN")
		}
	}

	if err := uc.spUserRepo.UpdateStatus(ctx, target.ID, input.ServiceProviderID, "DEACTIVATED"); err != nil {
		return bzerr.Internal("failed to deactivate user", err)
	}

	uc.publishEvent(ctx, events.TeamMemberRemoved, target.ID, input.ActorUserID, input.ServiceProviderID, map[string]string{
		"target_user_id": input.TargetUserID,
		"action":         "deactivated",
	})

	return nil
}

// ListTeamMembers lists all SP users for a given service provider.
func (uc *TeamUseCase) ListTeamMembers(ctx context.Context, spID string, limit, offset int) ([]entity.ServiceProviderUser, int, error) {
	return uc.spUserRepo.ListBySP(ctx, spID, limit, offset)
}

// ListInvitations lists invitations for a given SP, optionally filtered by status.
func (uc *TeamUseCase) ListInvitations(ctx context.Context, spID, status string, limit, offset int) ([]entity.Invitation, int, error) {
	return uc.invRepo.ListBySP(ctx, spID, status, limit, offset)
}

// publishEvent fires a domain event asynchronously.
func (uc *TeamUseCase) publishEvent(ctx context.Context, eventType events.EventType, entityID, actorID, spID string, payload interface{}) {
	if uc.publisher == nil {
		return
	}
	evt, err := events.NewEvent(eventType, payload)
	if err != nil {
		uc.log.Error("failed to create event", zap.String("event_type", string(eventType)), zap.Error(err))
		return
	}
	evt.WithEntity(entityID).WithActor(actorID).WithServiceProvider(spID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish event", zap.String("event_type", string(eventType)), zap.Error(err))
	}
}

func isValidSPRole(role string) bool {
	return role == "SP_ADMIN" || role == "AGENT" || role == "ANALYST"
}

func generateInvitationToken() (raw string, hash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate token: %w", err)
	}
	raw = hex.EncodeToString(b)
	hash = hashToken(raw)
	return raw, hash, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
