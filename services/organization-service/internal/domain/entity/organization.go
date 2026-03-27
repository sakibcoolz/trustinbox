package entity

import "time"

type Organization struct {
	ID                 string
	Name               string
	LegalName          string
	Industry           string
	Description        string
	VerificationStatus string // PENDING, VERIFIED, REJECTED, SUSPENDED
	Status             string // ACTIVE, SUSPENDED, DEACTIVATED
	Website            string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type OrganizationUser struct {
	ID             string
	OrganizationID string
	UserID         string
	Role           string // ORG_ADMIN, AGENT, ANALYST
	Status         string
	CreatedAt      time.Time
}

type OrganizationVerification struct {
	ID             string
	OrganizationID string
	DocumentType   string
	DocumentS3Key  string
	Status         string
	ReviewedBy     string
	ReviewedAt     *time.Time
	Notes          string
	CreatedAt      time.Time
}
