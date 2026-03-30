package main

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// ─── API Key context keys ──────────────────────────────────

type ctxKey string

const (
	ctxSPID   ctxKey = "sp_id"
	ctxAPIKey ctxKey = "api_key_id"
)

func spIDFromCtx(ctx context.Context) string {
	if v, ok := ctx.Value(ctxSPID).(string); ok {
		return v
	}
	return ""
}

// ─── API Key middleware ────────────────────────────────────

// apiKeyAuth validates an API key from the X-API-Key header against the
// sp_api_keys table.  On success it injects the service_provider_id and key ID
// into the request context.
func apiKeyAuth(db *sql.DB, log *zap.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := r.Header.Get("X-API-Key")
		if raw == "" {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "missing X-API-Key header"})
			return
		}

		// Keys are stored as SHA-256; we look up by a short prefix that is
		// kept in plaintext to speed up the DB lookup.
		parts := strings.SplitN(raw, ".", 2)
		if len(parts) != 2 || len(parts[0]) < 8 {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid API key format"})
			return
		}
		prefix := parts[0][:8]

		hash := sha256.Sum256([]byte(raw))
		keyHash := hex.EncodeToString(hash[:])

		var id, spID, storedHash string
		var expiresAt sql.NullTime
		err := db.QueryRowContext(r.Context(),
			`SELECT id, service_provider_id, key_hash, expires_at
			   FROM sp_api_keys
			  WHERE prefix = $1 AND revoked_at IS NULL`,
			prefix,
		).Scan(&id, &spID, &storedHash, &expiresAt)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid API key"})
			return
		}

		if subtle.ConstantTimeCompare([]byte(keyHash), []byte(storedHash)) != 1 {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid API key"})
			return
		}

		if expiresAt.Valid && expiresAt.Time.Before(time.Now()) {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "API key expired"})
			return
		}

		// Mark last used asynchronously (fire-and-forget).
		go func() {
			_, _ = db.Exec(`UPDATE sp_api_keys SET last_used_at = NOW() WHERE id = $1`, id)
		}()

		ctx := context.WithValue(r.Context(), ctxSPID, spID)
		ctx = context.WithValue(ctx, ctxAPIKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ─── Token-bucket rate limiter ─────────────────────────────

type bucket struct {
	tokens    float64
	lastFill  time.Time
	rate      float64 // tokens per second
	maxTokens float64
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64
	burst   float64
}

func newRateLimiter(ratePerSecond, burst float64) *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*bucket),
		rate:    ratePerSecond,
		burst:   burst,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, ok := rl.buckets[key]
	if !ok {
		b = &bucket{
			tokens:    rl.burst,
			lastFill:  time.Now(),
			rate:      rl.rate,
			maxTokens: rl.burst,
		}
		rl.buckets[key] = b
	}

	now := time.Now()
	elapsed := now.Sub(b.lastFill).Seconds()
	b.tokens += elapsed * b.rate
	if b.tokens > b.maxTokens {
		b.tokens = b.maxTokens
	}
	b.lastFill = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func rateLimitMiddleware(rl *rateLimiter, log *zap.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := spIDFromCtx(r.Context())
		if key == "" {
			key = r.RemoteAddr
		}
		if !rl.allow(key) {
			log.Warn("rate limit exceeded", zap.String("key", key))
			writeJSON(w, http.StatusTooManyRequests, errorResponse{Error: "rate limit exceeded"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
