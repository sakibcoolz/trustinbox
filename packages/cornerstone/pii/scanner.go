// Package pii provides a lightweight PII detection and redaction utility.
// It uses regex patterns to identify common PII types (email, phone, SSN,
// credit card, NI number) and replaces them with placeholder tokens before
// the text is forwarded to external services such as LLMs or stored in logs.
package pii

import (
	"regexp"
	"strings"
)

// PIIType identifies the category of detected personal information.
type PIIType string

const (
	PIITypeEmail      PIIType = "EMAIL"
	PIITypePhone      PIIType = "PHONE"
	PIITypeSSN        PIIType = "SSN"
	PIITypeCreditCard PIIType = "CREDIT_CARD"
	PIITypeNINumber   PIIType = "NI_NUMBER"
)

type pattern struct {
	kind    PIIType
	re      *regexp.Regexp
	replace string
}

var patterns = []pattern{
	{
		kind:    PIITypeEmail,
		re:      regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`),
		replace: "[EMAIL]",
	},
	{
		// E.164 international phone numbers and common US/EU formats.
		kind:    PIITypePhone,
		re:      regexp.MustCompile(`(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{4,14}`),
		replace: "[PHONE]",
	},
	{
		// US Social Security Number (XXX-XX-XXXX).
		kind:    PIITypeSSN,
		re:      regexp.MustCompile(`\b\d{3}[-\s]\d{2}[-\s]\d{4}\b`),
		replace: "[SSN]",
	},
	{
		// Major credit card patterns (Visa, MC, Amex, Discover — 13-16 digits).
		kind:    PIITypeCreditCard,
		re:      regexp.MustCompile(`\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|6(?:011|5\d{2})\d{12})\b`),
		replace: "[CARD]",
	},
	{
		// UK National Insurance number (e.g. AB 12 34 56 C).
		kind:    PIITypeNINumber,
		re:      regexp.MustCompile(`\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b`),
		replace: "[NI_NUMBER]",
	},
}

// Scanner detects and redacts PII from text.
type Scanner struct{}

// New returns a new PII Scanner.
func New() *Scanner { return &Scanner{} }

// Redact replaces PII patterns in text with placeholder tokens.
// Returns the redacted string and a deduplicated list of PIITypes found.
func (s *Scanner) Redact(text string) (redacted string, found []PIIType) {
	seenTypes := make(map[PIIType]struct{})
	result := text
	for _, p := range patterns {
		if p.re.MatchString(result) {
			seenTypes[p.kind] = struct{}{}
			result = p.re.ReplaceAllString(result, p.replace)
		}
	}
	for k := range seenTypes {
		found = append(found, k)
	}
	return result, found
}

// ContainsPII returns true if the text appears to contain any PII.
func (s *Scanner) ContainsPII(text string) bool {
	for _, p := range patterns {
		if p.re.MatchString(text) {
			return true
		}
	}
	return false
}

// RedactAll redacts PII from each string in the slice and returns cleaned copies.
func (s *Scanner) RedactAll(texts []string) []string {
	out := make([]string, len(texts))
	for i, t := range texts {
		clean, _ := s.Redact(t)
		out[i] = clean
	}
	return out
}

// Truncate is a helper to cap string length — useful for audit log summaries.
func Truncate(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
