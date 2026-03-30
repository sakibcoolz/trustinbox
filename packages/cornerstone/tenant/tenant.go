package tenant

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/cornerstone/auth/requestctx"
)

// SetCurrentSP sets the PostgreSQL session variable `app.current_sp_id` so that
// row-level security policies restrict queries to the specified service provider.
// Call this at the beginning of any DB transaction or query batch that operates
// within an SP-scoped context.
//
// If spID is empty, the session variable is cleared (= no RLS filtering).
func SetCurrentSP(ctx context.Context, db *sql.DB, spID string) error {
	if spID == "" {
		_, err := db.ExecContext(ctx, "SET LOCAL app.current_sp_id = ''")
		return err
	}
	// Use parameterised format to prevent injection.
	_, err := db.ExecContext(ctx, fmt.Sprintf("SET LOCAL app.current_sp_id = '%s'", sanitizeUUID(spID)))
	return err
}

// SetCurrentSPTx is like SetCurrentSP but operates on an existing transaction.
func SetCurrentSPTx(ctx context.Context, tx *sql.Tx, spID string) error {
	if spID == "" {
		_, err := tx.ExecContext(ctx, "SET LOCAL app.current_sp_id = ''")
		return err
	}
	_, err := tx.ExecContext(ctx, fmt.Sprintf("SET LOCAL app.current_sp_id = '%s'", sanitizeUUID(spID)))
	return err
}

// SetFromContext reads service_provider_id from the request context and sets
// the PostgreSQL session variable accordingly.
func SetFromContext(ctx context.Context, db *sql.DB) error {
	spID := requestctx.ServiceProviderID(ctx)
	return SetCurrentSP(ctx, db, spID)
}

// SetFromContextTx is like SetFromContext but for an existing transaction.
func SetFromContextTx(ctx context.Context, tx *sql.Tx) error {
	spID := requestctx.ServiceProviderID(ctx)
	return SetCurrentSPTx(ctx, tx, spID)
}

// sanitizeUUID allows only hex digits and hyphens to prevent SQL injection.
func sanitizeUUID(s string) string {
	out := make([]byte, 0, len(s))
	for _, c := range []byte(s) {
		if (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || c == '-' {
			out = append(out, c)
		}
	}
	return string(out)
}
