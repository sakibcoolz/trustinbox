package main

import (
	"context"
	"net/http"
	"strings"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/trustinbox/cornerstone/auth/rbac"
	"github.com/trustinbox/cornerstone/auth/requestctx"
	"go.uber.org/zap"
)

// ─── RBAC context keys ─────────────────────────────────────

type rbacCtxKey string

const (
	ctxUserIDKey   rbacCtxKey = "rbac_user_id"
	ctxUserRoleKey rbacCtxKey = "rbac_role"
	ctxUserSPIDKey rbacCtxKey = "rbac_sp_id"
)

func userIDFromRBACCtx(ctx context.Context) string {
	if v, ok := ctx.Value(ctxUserIDKey).(string); ok {
		return v
	}
	return ""
}

func roleFromRBACCtx(ctx context.Context) string {
	if v, ok := ctx.Value(ctxUserRoleKey).(string); ok {
		return v
	}
	return ""
}

func spIDFromRBACCtx(ctx context.Context) string {
	if v, ok := ctx.Value(ctxUserSPIDKey).(string); ok {
		return v
	}
	return ""
}

// ─── Route-to-permission mapping ───────────────────────────

// routePermission defines the required permission(s) for a route pattern.
type routePermission struct {
	prefix      string
	methods     []string // empty = all methods
	permissions []rbac.Permission
	requireAny  bool // true = any permission suffices; false = all required
}

// routePermissions maps API routes to RBAC permissions.
// Order matters: first match wins.
var routePermissions = []routePermission{
	// Notification endpoints
	{prefix: "/api/notifications", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermNotificationView}},

	// Callback endpoints
	{prefix: "/api/callbacks", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermCallbackView}},
	{prefix: "/api/callbacks", methods: []string{"POST", "PUT", "PATCH"}, permissions: []rbac.Permission{rbac.PermCallbackCreate}},

	// Conversation endpoints
	{prefix: "/api/conversations", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermConversationView}},
	{prefix: "/api/conversations", methods: []string{"POST"}, permissions: []rbac.Permission{rbac.PermConversationCreate}},
	{prefix: "/api/messages", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermConversationView}},
	{prefix: "/api/messages", methods: []string{"POST", "PUT", "DELETE"}, permissions: []rbac.Permission{rbac.PermConversationCreate}},

	// Document endpoints
	{prefix: "/api/documents", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermDocumentView}},
	{prefix: "/api/documents", methods: []string{"POST"}, permissions: []rbac.Permission{rbac.PermDocumentUpload}},
	{prefix: "/api/upload", methods: []string{"POST"}, permissions: []rbac.Permission{rbac.PermDocumentUpload}},

	// Campaign endpoints (provider-level)
	{prefix: "/api/v1/campaigns", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermCampaignView}},
	{prefix: "/api/v1/campaigns", methods: []string{"POST", "PUT"}, permissions: []rbac.Permission{rbac.PermCampaignCreate}},

	// Bot endpoints (provider-level)
	{prefix: "/api/v1/bots", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermBotView}},
	{prefix: "/api/v1/bots", methods: []string{"POST", "PUT"}, permissions: []rbac.Permission{rbac.PermBotCreate}},

	// Analytics endpoints (provider-level)
	{prefix: "/api/v1/analytics", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermAnalyticsView}},

	// Webhook endpoints (provider-level)
	{prefix: "/api/v1/webhooks", methods: []string{"GET"}, permissions: []rbac.Permission{rbac.PermWebhookView}},
	{prefix: "/api/v1/webhooks", methods: []string{"POST", "PUT", "DELETE"}, permissions: []rbac.Permission{rbac.PermWebhookManage}},
}

// ─── RBAC middleware ───────────────────────────────────────

// rbacMiddleware extracts JWT claims, enforces RBAC permissions on each request,
// and propagates user identity into the request context for downstream handlers.
func rbacMiddleware(jwtSecret string, log *zap.Logger, next http.Handler) http.Handler {
	auth := rbac.NewAuthorizer()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Skip public / auth / health routes — no RBAC required.
		if isPublicRoute(path) {
			next.ServeHTTP(w, r)
			return
		}

		// Provider API (/api/v1/*) uses API-key auth — RBAC is handled via
		// the SP role embedded in the API key record.  The apiKeyAuth middleware
		// already validates the key and injects sp_id.  We still enforce
		// permission if a role is available in the request context.
		if strings.HasPrefix(path, "/api/v1/") {
			role := roleFromRBACCtx(r.Context())
			if role == "" {
				// API-key authenticated — treat as SP_ADMIN level access.
				role = string(rbac.RoleSPAdmin)
			}
			if perm := matchRoutePermission(path, r.Method); perm != nil {
				if !checkPermissions(auth, role, perm) {
					writeJSON(w, http.StatusForbidden, errorResponse{Error: "insufficient permissions"})
					return
				}
			}
			next.ServeHTTP(w, r)
			return
		}

		// For user-facing API routes, extract JWT from Authorization header.
		tokenStr := extractBearerToken(r)
		if tokenStr == "" {
			// No token → let the downstream handler decide (some routes may
			// still be semi-public).
			next.ServeHTTP(w, r)
			return
		}

		claims, err := parseJWTClaims(tokenStr, jwtSecret)
		if err != nil {
			log.Debug("RBAC: invalid JWT", zap.Error(err))
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid or expired token"})
			return
		}

		role := claims.role
		if role == "" {
			role = string(rbac.RoleCustomer) // default for regular users
		}

		// Check route-level permissions.
		if perm := matchRoutePermission(path, r.Method); perm != nil {
			if !checkPermissions(auth, role, perm) {
				log.Warn("RBAC: permission denied",
					zap.String("user_id", claims.userID),
					zap.String("role", role),
					zap.String("path", path),
					zap.String("method", r.Method),
				)
				writeJSON(w, http.StatusForbidden, errorResponse{Error: "insufficient permissions"})
				return
			}
		}

		// Inject identity into context for downstream handlers.
		ctx := r.Context()
		ctx = context.WithValue(ctx, ctxUserIDKey, claims.userID)
		ctx = context.WithValue(ctx, ctxUserRoleKey, role)
		ctx = context.WithValue(ctx, ctxUserSPIDKey, claims.serviceProviderID)
		// Also inject into the shared requestctx package for gRPC propagation.
		ctx = requestctx.WithUserID(ctx, claims.userID)
		ctx = requestctx.WithRole(ctx, role)
		if claims.serviceProviderID != "" {
			ctx = requestctx.WithServiceProviderID(ctx, claims.serviceProviderID)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ─── Helpers ───────────────────────────────────────────────

type jwtClaimsInfo struct {
	userID            string
	role              string
	serviceProviderID string
}

func parseJWTClaims(tokenStr, secret string) (*jwtClaimsInfo, error) {
	token, err := gojwt.Parse(tokenStr, func(t *gojwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*gojwt.SigningMethodHMAC); !ok {
			return nil, gojwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	mc, ok := token.Claims.(gojwt.MapClaims)
	if !ok || !token.Valid {
		return nil, gojwt.ErrSignatureInvalid
	}

	info := &jwtClaimsInfo{}
	if v, ok := mc["user_id"].(string); ok {
		info.userID = v
	}
	if v, ok := mc["role"].(string); ok {
		info.role = v
	}
	if v, ok := mc["service_provider_id"].(string); ok {
		info.serviceProviderID = v
	}
	return info, nil
}

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

func isPublicRoute(path string) bool {
	publicPrefixes := []string{
		"/health",
		"/api/auth/",
		"/api/ws",
		"/api/xmpp-ws",
		"/internal/",
	}
	for _, p := range publicPrefixes {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return path == "/health"
}

func matchRoutePermission(path, method string) *routePermission {
	for i := range routePermissions {
		rp := &routePermissions[i]
		if !strings.HasPrefix(path, rp.prefix) {
			continue
		}
		if len(rp.methods) > 0 {
			found := false
			for _, m := range rp.methods {
				if m == method {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		return rp
	}
	return nil
}

func checkPermissions(auth *rbac.Authorizer, role string, rp *routePermission) bool {
	if rp.requireAny {
		return auth.RequireAny(role, rp.permissions...)
	}
	return auth.RequireAll(role, rp.permissions...)
}
