package main

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/graphql-bff/internal/clients"
	orgpb "github.com/trustinbox/proto/gen/organization/v1"
	userpb "github.com/trustinbox/proto/gen/user/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ─── Team Management REST Handlers ────────────────────────────

type inviteTeamMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

type inviteTeamMemberResponse struct {
	InvitationID string `json:"invitationId"`
}

type changeRoleRequest struct {
	TargetUserID string `json:"targetUserId"`
	NewRole      string `json:"newRole"`
}

type removeTeamMemberRequest struct {
	TargetUserID string `json:"targetUserId"`
}

type teamMemberResponse struct {
	ID                string `json:"id"`
	UserID            string `json:"userId"`
	ServiceProviderID string `json:"serviceProviderId"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	Role              string `json:"role"`
	Status            string `json:"status"`
	AvatarURL         string `json:"avatarUrl,omitempty"`
}

type invitationResponse struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	ServiceProviderID string `json:"serviceProviderId"`
	Role              string `json:"role"`
	Status            string `json:"status"`
	InvitedBy         string `json:"invitedBy"`
	ExpiresAt         string `json:"expiresAt,omitempty"`
	CreatedAt         string `json:"createdAt,omitempty"`
}

func handleTeamMembers(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _, spID, err := extractAuthContext(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "service_provider_id is required (set via X-Service-Provider-Id header or JWT)"})
			return
		}

		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			if limit <= 0 {
				limit = 50
			}
			resp, err := svc.Organization.ListServiceProviderUsers(r.Context(), &orgpb.ListServiceProviderUsersRequest{
				ServiceProviderId: spID,
				Limit:             int32(limit),
				Offset:            int32(offset),
			})
			if err != nil {
				handleGRPCError(w, log, err, "list team members")
				return
			}
			members := make([]teamMemberResponse, len(resp.Users))
			for i, u := range resp.Users {
				m := teamMemberResponse{
					ID:                u.Id,
					UserID:            u.UserId,
					ServiceProviderID: u.ServiceProviderId,
					Role:              u.Role,
					Status:            u.Status,
				}
				profile, err := svc.User.GetUserProfile(r.Context(), &userpb.GetUserProfileRequest{UserId: u.UserId})
				if err == nil && profile != nil {
					m.Name = profile.FullName
					m.Email = profile.Email
					m.AvatarURL = profile.AvatarUrl
				} else {
					m.Name = u.Role + " " + u.UserId[:8]
				}
				members[i] = m
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"items": members, "total": resp.Total})

		case http.MethodDelete:
			var req removeTeamMemberRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			_, err := svc.Organization.RemoveTeamMember(r.Context(), &orgpb.RemoveTeamMemberRequest{
				ServiceProviderId: spID,
				TargetUserId:      req.TargetUserID,
				ActorUserId:       userID,
			})
			if err != nil {
				handleGRPCError(w, log, err, "remove team member")
				return
			}
			writeJSON(w, http.StatusOK, map[string]bool{"success": true})

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

func handleTeamInvitations(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, _, spID, err := extractAuthContext(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "service_provider_id is required"})
			return
		}

		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			statusFilter := r.URL.Query().Get("status")
			if limit <= 0 {
				limit = 50
			}
			resp, err := svc.Organization.ListInvitations(r.Context(), &orgpb.ListInvitationsRequest{
				ServiceProviderId: spID,
				Status:            statusFilter,
				Limit:             int32(limit),
				Offset:            int32(offset),
			})
			if err != nil {
				handleGRPCError(w, log, err, "list invitations")
				return
			}
			invitations := make([]invitationResponse, len(resp.Invitations))
			for i, inv := range resp.Invitations {
				invitations[i] = invitationResponse{
					ID:                inv.Id,
					Email:             inv.Email,
					ServiceProviderID: inv.ServiceProviderId,
					Role:              inv.Role,
					Status:            inv.Status,
					InvitedBy:         inv.InvitedBy,
				}
				if inv.ExpiresAt != nil {
					invitations[i].ExpiresAt = inv.ExpiresAt.AsTime().Format("2006-01-02T15:04:05Z")
				}
				if inv.CreatedAt != nil {
					invitations[i].CreatedAt = inv.CreatedAt.AsTime().Format("2006-01-02T15:04:05Z")
				}
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"items": invitations, "total": resp.Total})

		case http.MethodPost:
			var req inviteTeamMemberRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			if req.Email == "" || req.Role == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email and role are required"})
				return
			}
			resp, err := svc.Organization.InviteTeamMember(r.Context(), &orgpb.InviteTeamMemberRequest{
				ServiceProviderId: spID,
				Email:             req.Email,
				Role:              req.Role,
				InvitedByUserId:   userID,
			})
			if err != nil {
				handleGRPCError(w, log, err, "invite team member")
				return
			}
			writeJSON(w, http.StatusCreated, inviteTeamMemberResponse{InvitationID: resp.InvitationId})

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

func handleRevokeInvitation(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, _, spID, err := extractAuthContext(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req struct {
			InvitationID string `json:"invitationId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		_, err = svc.Organization.RevokeInvitation(r.Context(), &orgpb.RevokeInvitationRequest{
			InvitationId:      req.InvitationID,
			ServiceProviderId: spID,
			ActorUserId:       userID,
		})
		if err != nil {
			handleGRPCError(w, log, err, "revoke invitation")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func handleAcceptInvitation(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, _, _, err := extractAuthContext(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.Token == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "token is required"})
			return
		}

		_, err = svc.Organization.AcceptInvitation(r.Context(), &orgpb.AcceptInvitationRequest{
			Token:  req.Token,
			UserId: userID,
		})
		if err != nil {
			handleGRPCError(w, log, err, "accept invitation")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

func handleChangeTeamMemberRole(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, _, spID, err := extractAuthContext(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "service_provider_id is required"})
			return
		}

		var req changeRoleRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.TargetUserID == "" || req.NewRole == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "targetUserId and newRole are required"})
			return
		}

		_, err = svc.Organization.ChangeTeamMemberRole(r.Context(), &orgpb.ChangeTeamMemberRoleRequest{
			ServiceProviderId: spID,
			TargetUserId:      req.TargetUserID,
			NewRole:           req.NewRole,
			ActorUserId:       userID,
		})
		if err != nil {
			handleGRPCError(w, log, err, "change team member role")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// extractAuthContext extracts userID, role, and serviceProviderID from the JWT
// in the Authorization header.
func extractAuthContext(r *http.Request, tokenSvc *jwt.TokenService) (userID, role, spID string, err error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", "", "", http.ErrNoCookie
	}
	token := auth
	if len(auth) > 7 && auth[:7] == "Bearer " {
		token = auth[7:]
	}
	claims, err := tokenSvc.ValidateAccessToken(token)
	if err != nil {
		return "", "", "", err
	}

	// Check for SP ID override from header
	headerSPID := r.Header.Get("X-Service-Provider-Id")
	claimSPID := ""
	if claims.ServiceProviderID != "" {
		claimSPID = claims.ServiceProviderID
	}
	if headerSPID != "" {
		claimSPID = headerSPID
	}

	return claims.UserID, claims.Role, claimSPID, nil
}

func handleGRPCError(w http.ResponseWriter, log *zap.Logger, err error, op string) {
	st := status.Convert(err)
	switch st.Code() {
	case codes.NotFound:
		writeJSON(w, http.StatusNotFound, errorResponse{Error: st.Message()})
	case codes.InvalidArgument:
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: st.Message()})
	case codes.PermissionDenied:
		writeJSON(w, http.StatusForbidden, errorResponse{Error: st.Message()})
	case codes.Unauthenticated:
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: st.Message()})
	case codes.AlreadyExists:
		writeJSON(w, http.StatusConflict, errorResponse{Error: st.Message()})
	default:
		log.Error(op+" failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
	}
}
