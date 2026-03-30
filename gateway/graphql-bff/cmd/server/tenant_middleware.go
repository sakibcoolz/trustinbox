package main

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/trustinbox/cornerstone/tenant"
	"go.uber.org/zap"
)

// tenantMiddleware sets the PostgreSQL `app.current_sp_id` session variable
// based on the request context (populated by RBAC or API-key middleware).
// This activates row-level security policies so that each SP can only see
// its own data.
func tenantMiddleware(db *sql.DB, log *zap.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only apply tenant scoping to provider API routes that operate
		// within an SP context.  Customer-facing routes do not need
		// SP-scoped RLS filtering (they query by user_id instead).
		if !strings.HasPrefix(r.URL.Path, "/api/v1/") {
			next.ServeHTTP(w, r)
			return
		}

		// Resolve SP ID from API-key auth context.
		spID := spIDFromCtx(r.Context())
		if spID == "" {
			// Try from RBAC context (JWT-authenticated SP user).
			spID = spIDFromRBACCtx(r.Context())
		}

		if spID != "" {
			if err := tenant.SetCurrentSP(r.Context(), db, spID); err != nil {
				log.Error("failed to set tenant context", zap.Error(err), zap.String("sp_id", spID))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
