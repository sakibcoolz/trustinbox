package entity

import "time"

type ServiceProvider struct {
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

type ServiceProviderUser struct {
	ID                string
	ServiceProviderID string
	UserID            string
	Role              string // SP_ADMIN, AGENT, ANALYST
	Status            string
	CreatedAt         time.Time
}

type ServiceProviderVerification struct {
	ID                string
	ServiceProviderID string
	DocumentType      string
	DocumentS3Key     string
	Status            string
	ReviewedBy        string
	ReviewedAt        *time.Time
	Notes             string
	CreatedAt         time.Time
}
