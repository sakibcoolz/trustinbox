package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/graphql-bff/internal/clients"
	userpb "github.com/trustinbox/proto/gen/user/v1"
	"go.uber.org/zap"
)

// ============================================================
// Types
// ============================================================

type profileResponse struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Username        string `json:"username"`
	FullName        string `json:"fullName"`
	Bio             string `json:"bio"`
	Location        string `json:"location"`
	Website         string `json:"website"`
	CoverIdx        int    `json:"coverIdx"`
	AvatarURL       string `json:"avatarUrl"`
	Timezone        string `json:"timezone"`
	Language        string `json:"language"`
	JoinedAt        string `json:"joinedAt"`
	VirtualPublicID string `json:"virtualPublicId"`
}

type profileStatsResponse struct {
	SPCount       int `json:"spCount"`
	MessagesCount int `json:"messagesCount"`
	PoliciesCount int `json:"policiesCount"`
	PrivacyScore  int `json:"privacyScore"`
}

type profileSPItem struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Industry           string `json:"industry"`
	VerificationStatus string `json:"verificationStatus"`
	Role               string `json:"role"`
	JoinedAt           string `json:"joinedAt"`
}

type activityItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // "notification" | "callback" | "message"
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}

type privacyPreferencesResponse struct {
	AllowPersonalNotifications bool `json:"allowPersonalNotifications"`
	AllowSPNotifications       bool `json:"allowSPNotifications"`
	AllowAdvertisements        bool `json:"allowAdvertisements"`
	AllowCallbackRequests      bool `json:"allowCallbackRequests"`
	AllowChat                  bool `json:"allowChat"`
	AllowDocumentShares        bool `json:"allowDocumentShares"`
	RequireCallApproval        bool `json:"requireCallApproval"`
}

type sessionsResponse struct {
	ActiveSessions    int    `json:"activeSessions"`
	LastLoginAt       string `json:"lastLoginAt"`
	HasTwoFactor      bool   `json:"hasTwoFactor"`
	PasswordUpdatedAt string `json:"passwordUpdatedAt"`
}

type updateProfileRequest struct {
	FullName *string `json:"fullName"`
	Bio      *string `json:"bio"`
	Location *string `json:"location"`
	Website  *string `json:"website"`
	CoverIdx *int    `json:"coverIdx"`
	Timezone *string `json:"timezone"`
	Language *string `json:"language"`
}

type updatePrivacyRequest struct {
	AllowPersonalNotifications *bool `json:"allowPersonalNotifications"`
	AllowSPNotifications       *bool `json:"allowSPNotifications"`
	AllowAdvertisements        *bool `json:"allowAdvertisements"`
	AllowCallbackRequests      *bool `json:"allowCallbackRequests"`
	AllowChat                  *bool `json:"allowChat"`
	AllowDocumentShares        *bool `json:"allowDocumentShares"`
	RequireCallApproval        *bool `json:"requireCallApproval"`
}

// ============================================================
// GET /api/profile
// ============================================================

func handleGetProfile(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var resp profileResponse
		var avatarURL, bio, location, website, timezone, language sql.NullString
		var coverIdx sql.NullInt64
		var joinedAt time.Time

		err = db.QueryRowContext(r.Context(), `
			SELECT
				u.id, u.email, u.username,
				COALESCE(p.full_name, ''),
				p.bio, p.location, p.website, p.cover_idx,
				p.avatar_url, p.timezone, p.language,
				u.created_at
			FROM users u
			LEFT JOIN user_profiles p ON u.id = p.user_id
			WHERE u.id = $1
		`, userID).Scan(
			&resp.ID, &resp.Email, &resp.Username,
			&resp.FullName,
			&bio, &location, &website, &coverIdx,
			&avatarURL, &timezone, &language,
			&joinedAt,
		)
		if err != nil {
			log.Error("handleGetProfile: query failed", zap.Error(err))
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user not found"})
			return
		}

		resp.Bio = bio.String
		resp.Location = location.String
		resp.Website = website.String
		resp.AvatarURL = avatarURL.String
		resp.Timezone = timezone.String
		resp.Language = language.String
		resp.JoinedAt = joinedAt.Format(time.RFC3339)
		if coverIdx.Valid {
			resp.CoverIdx = int(coverIdx.Int64)
		}

		_ = db.QueryRowContext(r.Context(),
			`SELECT virtual_public_id FROM user_identities WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
			userID,
		).Scan(&resp.VirtualPublicID)

		writeJSON(w, http.StatusOK, resp)
	}
}

// ============================================================
// PATCH /api/profile
// ============================================================

func handleUpdateProfile(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req updateProfileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		// Validate website URL if provided
		if req.Website != nil && *req.Website != "" {
			websiteVal := strings.TrimSpace(*req.Website)
			if !strings.HasPrefix(websiteVal, "http://") && !strings.HasPrefix(websiteVal, "https://") {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "website must start with http:// or https://"})
				return
			}
		}

		_, err = db.ExecContext(r.Context(), `
			INSERT INTO user_profiles (user_id, full_name, bio, location, website, cover_idx, timezone, language, created_at, updated_at)
			VALUES ($1,
				COALESCE($2, ''),
				$3, $4, $5,
				COALESCE($6, 0),
				COALESCE($7, 'UTC'),
				COALESCE($8, 'en'),
				NOW(), NOW()
			)
			ON CONFLICT (user_id) DO UPDATE SET
				full_name  = CASE WHEN $2 IS NOT NULL THEN $2 ELSE user_profiles.full_name END,
				bio        = CASE WHEN $3 IS NOT NULL THEN $3 ELSE user_profiles.bio END,
				location   = CASE WHEN $4 IS NOT NULL THEN $4 ELSE user_profiles.location END,
				website    = CASE WHEN $5 IS NOT NULL THEN $5 ELSE user_profiles.website END,
				cover_idx  = CASE WHEN $6 IS NOT NULL THEN $6 ELSE user_profiles.cover_idx END,
				timezone   = CASE WHEN $7 IS NOT NULL THEN $7 ELSE user_profiles.timezone END,
				language   = CASE WHEN $8 IS NOT NULL THEN $8 ELSE user_profiles.language END,
				updated_at = NOW()
		`,
			userID,
			nullableString(req.FullName),
			nullableString(req.Bio),
			nullableString(req.Location),
			nullableString(req.Website),
			nullableInt(req.CoverIdx),
			nullableString(req.Timezone),
			nullableString(req.Language),
		)
		if err != nil {
			log.Error("handleUpdateProfile: upsert failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to update profile"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// GET /api/profile/stats
// ============================================================

func handleProfileStats(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var stats profileStatsResponse

		// Connected orgs count
		_ = db.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM service_provider_users WHERE user_id = $1 AND status = 'ACTIVE'`,
			userID,
		).Scan(&stats.SPCount)

		// Messages count (sent by this user)
		_ = db.QueryRowContext(r.Context(), `
			SELECT COUNT(m.id)
			FROM messages m
			JOIN conversations c ON m.conversation_id = c.id
			WHERE c.user_id = $1 AND m.sender_type = 'USER'
		`, userID).Scan(&stats.MessagesCount)

		// Privacy policies count = number of allow_* fields that are TRUE
		var prefs struct {
			allowPersonal, allowOrg, allowAds, allowCallback, allowChat, allowDocs bool
			requireApproval                                                        bool
		}
		err = db.QueryRowContext(r.Context(), `
			SELECT
				allow_personal_notifications,
			allow_sp_notifications,
				allow_advertisements,
				allow_callback_requests,
				allow_chat,
				allow_document_shares,
				require_call_approval
			FROM privacy_preferences WHERE user_id = $1
		`, userID).Scan(
			&prefs.allowPersonal, &prefs.allowOrg, &prefs.allowAds,
			&prefs.allowCallback, &prefs.allowChat, &prefs.allowDocs,
			&prefs.requireApproval,
		)
		if err != nil {
			// No preferences row — use defaults
			prefs.allowPersonal = true
			prefs.allowOrg = true
			prefs.allowAds = false
			prefs.allowCallback = true
			prefs.allowChat = true
			prefs.allowDocs = true
			prefs.requireApproval = true
		}

		policiesCount := 0
		if prefs.allowPersonal {
			policiesCount++
		}
		if prefs.allowOrg {
			policiesCount++
		}
		if !prefs.allowAds {
			policiesCount++
		} // blocking ads counts as a policy
		if prefs.allowCallback {
			policiesCount++
		}
		if prefs.allowChat {
			policiesCount++
		}
		stats.PoliciesCount = policiesCount

		// Privacy score calculation
		score := 100
		if !prefs.allowPersonal {
			score -= 5
		}
		if !prefs.allowOrg {
			score -= 10
		}
		if prefs.allowAds {
			score -= 25
		}
		if !prefs.requireApproval {
			score -= 15
		}
		if !prefs.allowChat {
			score -= 5
		}
		if score < 0 {
			score = 0
		}
		stats.PrivacyScore = score

		writeJSON(w, http.StatusOK, stats)
	}
}

// ============================================================
// GET /api/profile/service-providers
// ============================================================

func handleProfileSPs(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT sp.id, sp.name, sp.industry, sp.verification_status, su.role, su.created_at
			FROM service_provider_users su
			JOIN service_providers sp ON su.service_provider_id = sp.id
			WHERE su.user_id = $1 AND su.status = 'ACTIVE'
			ORDER BY su.created_at DESC
		`, userID)
		if err != nil {
			log.Error("handleProfileSPs: query failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to fetch service providers"})
			return
		}
		defer rows.Close()

		serviceProviders := make([]profileSPItem, 0)
		for rows.Next() {
			var item profileSPItem
			var joinedAt time.Time
			if err := rows.Scan(&item.ID, &item.Name, &item.Industry, &item.VerificationStatus, &item.Role, &joinedAt); err != nil {
				continue
			}
			item.JoinedAt = joinedAt.Format(time.RFC3339)
			serviceProviders = append(serviceProviders, item)
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"serviceProviders": serviceProviders})
	}
}

// ============================================================
// GET /api/profile/activity
// ============================================================

func handleProfileActivity(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Notifications activity
		notifRows, err := db.QueryContext(r.Context(), `
			SELECT id::text, 'notification' AS type, title, body, category, status, created_at
			FROM notifications
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT 10
		`, userID)
		if err != nil {
			log.Error("handleProfileActivity: notifications query failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to fetch activity"})
			return
		}
		defer notifRows.Close()

		items := make([]activityItem, 0, 20)
		for notifRows.Next() {
			var item activityItem
			var createdAt time.Time
			if err := notifRows.Scan(&item.ID, &item.Type, &item.Title, &item.Description, &item.Category, &item.Status, &createdAt); err != nil {
				continue
			}
			item.CreatedAt = createdAt.Format(time.RFC3339)
			items = append(items, item)
		}

		// Callback requests activity
		cbRows, err := db.QueryContext(r.Context(), `
			SELECT cr.id::text, 'callback' AS type,
				COALESCE(sp.name, 'Unknown Service Provider') AS title,
				cr.reason AS description,
				'CALLBACK' AS category,
				cr.status,
				cr.requested_at
				FROM callback_requests cr
				LEFT JOIN service_providers sp ON cr.service_provider_id = sp.id
			WHERE cr.user_id = $1
			ORDER BY cr.requested_at DESC
			LIMIT 10
		`, userID)
		if err != nil {
			log.Error("handleProfileActivity: callback query failed", zap.Error(err))
		} else {
			defer cbRows.Close()
			for cbRows.Next() {
				var item activityItem
				var createdAt time.Time
				if err := cbRows.Scan(&item.ID, &item.Type, &item.Title, &item.Description, &item.Category, &item.Status, &createdAt); err != nil {
					continue
				}
				item.CreatedAt = createdAt.Format(time.RFC3339)
				items = append(items, item)
			}
		}

		// Sort by createdAt descending and take top 20
		sortActivityItems(items)
		if len(items) > 20 {
			items = items[:20]
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"activity": items})
	}
}

// sortActivityItems sorts activity items by CreatedAt descending (simple insertion sort for small slices)
func sortActivityItems(items []activityItem) {
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].CreatedAt > items[j-1].CreatedAt; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}
}

// ============================================================
// GET /api/privacy/preferences
// ============================================================

func handleGetPrivacyPreferences(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Fetch privacy preferences from user-service via gRPC
		prefs, err := svc.User.GetPrivacyPreference(r.Context(), &userpb.GetPrivacyPreferenceRequest{
			UserId: userID,
		})
		if err != nil {
			log.Warn("user-service GetPrivacyPreference failed, returning defaults", zap.Error(err))
			// Return defaults on error (service may not have data yet)
			writeJSON(w, http.StatusOK, privacyPreferencesResponse{
				AllowPersonalNotifications: true,
				AllowSPNotifications:       true,
				AllowAdvertisements:        false,
				AllowCallbackRequests:      true,
				AllowChat:                  true,
				AllowDocumentShares:        true,
				RequireCallApproval:        true,
			})
			return
		}

		writeJSON(w, http.StatusOK, privacyPreferencesResponse{
			AllowPersonalNotifications: prefs.AllowPersonalNotifications,
			AllowSPNotifications:       prefs.AllowSpNotifications,
			AllowAdvertisements:        prefs.AllowAdvertisements,
			AllowCallbackRequests:      prefs.AllowCallbackRequests,
			AllowChat:                  prefs.AllowChat,
			AllowDocumentShares:        prefs.AllowDocumentShares,
			RequireCallApproval:        prefs.RequireCallApproval,
		})
	}
}

// ============================================================
// PATCH /api/privacy/preferences
// ============================================================

func handleUpdatePrivacyPreferences(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req updatePrivacyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		// Build gRPC request with optional fields
		updateReq := &userpb.UpdatePrivacyPreferenceRequest{
			UserId:                     userID,
			AllowPersonalNotifications: req.AllowPersonalNotifications,
			AllowSpNotifications:       req.AllowSPNotifications,
			AllowAdvertisements:        req.AllowAdvertisements,
			AllowCallbackRequests:      req.AllowCallbackRequests,
			AllowChat:                  req.AllowChat,
			AllowDocumentShares:        req.AllowDocumentShares,
			RequireCallApproval:        req.RequireCallApproval,
		}

		_, err = svc.User.UpdatePrivacyPreference(r.Context(), updateReq)
		if err != nil {
			log.Error("user-service UpdatePrivacyPreference failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to update preferences"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// GET /api/sessions
// ============================================================

func handleSessions(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		resp := sessionsResponse{}

		// Active sessions count
		_ = db.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
			userID,
		).Scan(&resp.ActiveSessions)

		// Last login (most recent token creation)
		var lastLogin sql.NullTime
		_ = db.QueryRowContext(r.Context(),
			`SELECT MAX(created_at) FROM refresh_tokens WHERE user_id = $1`,
			userID,
		).Scan(&lastLogin)
		if lastLogin.Valid {
			resp.LastLoginAt = lastLogin.Time.Format(time.RFC3339)
		}

		// Password updated_at (approximate — using users.updated_at)
		var passwordUpdatedAt sql.NullTime
		_ = db.QueryRowContext(r.Context(),
			`SELECT updated_at FROM users WHERE id = $1`,
			userID,
		).Scan(&passwordUpdatedAt)
		if passwordUpdatedAt.Valid {
			resp.PasswordUpdatedAt = passwordUpdatedAt.Time.Format(time.RFC3339)
		}

		// 2FA not yet implemented
		resp.HasTwoFactor = false

		writeJSON(w, http.StatusOK, resp)
	}
}

// ============================================================
// Helpers
// ============================================================

func nullableString(s *string) interface{} {
	if s == nil {
		return nil
	}
	return *s
}

func nullableInt(i *int) interface{} {
	if i == nil {
		return nil
	}
	return *i
}

func nullableBool(b *bool) interface{} {
	if b == nil {
		return nil
	}
	return *b
}
