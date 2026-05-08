package tenant

import (
	bizerr "github.com/trustinbox/cornerstone/errors"
)

// ValidateOwnership returns a Forbidden error when claimedSPID does not match
// the actualSPID recorded on the entity. It is a thin guard used across
// services to enforce cross-tenant isolation without duplicating the check.
//
//	entityType — human-readable label used in the error message (e.g. "bot").
//	entityID   — identifier for traceability in logs.
func ValidateOwnership(entityType, entityID, claimedSPID, actualSPID string) error {
	if claimedSPID != actualSPID {
		return bizerr.Forbidden(entityType + " does not belong to this service provider")
	}
	return nil
}
