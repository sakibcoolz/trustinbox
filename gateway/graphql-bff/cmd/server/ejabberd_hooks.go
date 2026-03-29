package main

// ejabberd_hooks.go
//
// HTTP endpoints called by ejabberd's mod_auth_http to delegate authentication.
// These are INTERNAL endpoints; they must only be reachable within the Docker
// network (never exposed to the public internet).
//
// ejabberd calls:
//   GET /internal/ejabberd/check_password?user=<uuid>&host=<host>&password=<xmpp_token>
//   GET /internal/ejabberd/is_user?user=<uuid>&host=<host>
//
// Each endpoint responds with plain-text "true" or "false".

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"

	"go.uber.org/zap"
)

// ejabberdHookDeps groups the dependencies needed by ejabberd hook handlers.
type ejabberdHookDeps struct {
	db             *sql.DB
	log            *zap.Logger
	internalSecret string // shared secret set in EJABBERD_HOOK_SECRET env var
}

// internalOnly rejects requests that don't carry the correct internal secret
// header (X-Internal-Secret). This prevents external calls to these endpoints.
func internalOnly(secret string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if secret != "" && r.Header.Get("X-Internal-Secret") != secret {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}

// handleEjabberdCheckPassword answers ejabberd's check_password probe.
// It validates that sha256(supplied_password) matches the stored xmpp_token_hash.
func handleEjabberdCheckPassword(deps *ejabberdHookDeps) http.HandlerFunc {
	return internalOnly(deps.internalSecret, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		q := r.URL.Query()
		userID := strings.TrimSpace(q.Get("user"))
		password := q.Get("password")

		if userID == "" || password == "" {
			w.Write([]byte("false"))
			return
		}

		hash := sha256.Sum256([]byte(password))
		tokenHash := hex.EncodeToString(hash[:])

		var stored string
		err := deps.db.QueryRowContext(r.Context(),
			`SELECT xmpp_token_hash FROM users WHERE id = $1 AND status = 'ACTIVE'`,
			userID,
		).Scan(&stored)

		if err != nil || stored == "" || stored != tokenHash {
			deps.log.Debug("ejabberd check_password failed",
				zap.String("user_id", userID),
				zap.Bool("db_miss", err == sql.ErrNoRows),
			)
			w.Write([]byte("false"))
			return
		}

		deps.log.Debug("ejabberd check_password ok", zap.String("user_id", userID))
		w.Write([]byte("true"))
	})
}

// handleEjabberdIsUser answers ejabberd's is_user probe.
// It simply checks whether an active user with the given UUID exists.
func handleEjabberdIsUser(deps *ejabberdHookDeps) http.HandlerFunc {
	return internalOnly(deps.internalSecret, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		userID := strings.TrimSpace(r.URL.Query().Get("user"))
		if userID == "" {
			w.Write([]byte("false"))
			return
		}

		var exists bool
		err := deps.db.QueryRowContext(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND status = 'ACTIVE')`,
			userID,
		).Scan(&exists)

		if err != nil || !exists {
			w.Write([]byte("false"))
			return
		}

		w.Write([]byte("true"))
	})
}
