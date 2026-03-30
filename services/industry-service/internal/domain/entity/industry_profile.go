package entity

import "time"

// IndustryProfile represents an industry configuration profile
// used to provide default settings for organizations in a specific industry.
type IndustryProfile struct {
	ID                  string
	IndustryKey         string
	DisplayName         string
	Description         string
	DefaultReasonCodes  string // JSON array
	DefaultTemplates    string // JSON array
	DefaultCategories   []string
	ComplianceHints     string // JSON object
	DocumentTypes       string // JSON array
	CallbackWorkflows   string // JSON object
	BotPromptPack       string // JSON object
	DashboardPresets    string // JSON object
	AnalyticsPresets    string // JSON object
	IsActive            bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}
