package username

import (
	"fmt"
	"regexp"
	"strings"
)

var usernameRegex = regexp.MustCompile(`^(c|o)/[a-z0-9._-]{2,50}$`)

// Validate checks if a username matches the required pattern.
func Validate(username string) error {
	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username must match pattern: ^(c|o)/[a-z0-9._-]{2,50}$")
	}
	return nil
}

// GenerateCustomerUsername derives a customer username from the email local part.
// e.g. "alice@example.com" → "c/alice"
func GenerateCustomerUsername(email string) string {
	parts := strings.SplitN(email, "@", 2)
	local := strings.ToLower(parts[0])
	local = sanitize(local)
	if len(local) < 2 {
		local = local + "user"
	}
	if len(local) > 50 {
		local = local[:50]
	}
	return "c/" + local
}

// GenerateSPSlug derives a service provider slug from the org name.
// e.g. "Acme Bank" → "acmebank"
func GenerateSPSlug(orgName string) string {
	slug := strings.ToLower(orgName)
	slug = sanitize(slug)
	// Remove spaces
	slug = strings.ReplaceAll(slug, " ", "")
	if len(slug) < 2 {
		slug = slug + "org"
	}
	if len(slug) > 50 {
		slug = slug[:50]
	}
	return slug
}

// GenerateSPUsername creates an SP username from a slug.
// e.g. "acmebank" → "o/acmebank"
func GenerateSPUsername(slug string) string {
	return "o/" + slug
}

// AppendSuffix adds a numeric suffix for uniqueness conflicts.
// e.g. "c/alice" + 2 → "c/alice-2"
func AppendSuffix(username string, n int) string {
	return fmt.Sprintf("%s-%d", username, n)
}

// sanitize strips characters not allowed in the username local part.
func sanitize(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
