package entity

import "time"

// DocumentStatus represents the state of a document.
type DocumentStatus string

const (
	DocumentStatusActive   DocumentStatus = "ACTIVE"
	DocumentStatusArchived DocumentStatus = "ARCHIVED"
	DocumentStatusDeleted  DocumentStatus = "DELETED"
)

// ClassifiedBy indicates who or what performed the classification.
type ClassifiedBy string

const (
	ClassifiedByUser   ClassifiedBy = "USER"
	ClassifiedByAI     ClassifiedBy = "AI"
	ClassifiedBySystem ClassifiedBy = "SYSTEM"
)

// Document represents a file uploaded by a service provider.
type Document struct {
	ID                string
	ServiceProviderID string
	UploadedBySPUser  string
	FileName          string
	FileType          string
	S3Key             string
	FileSize          int64
	Classification    string
	Status            DocumentStatus
	CurrentVersion    int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// DocumentVersion represents a specific version of a document.
type DocumentVersion struct {
	ID               string
	DocumentID       string
	VersionNumber    int
	S3Key            string
	FileSize         int64
	UploadedBySPUser string
	ChangeSummary    string
	CreatedAt        time.Time
}

// DocumentClassification represents a classification label applied to a document.
type DocumentClassification struct {
	ID              string
	DocumentID      string
	Label           string
	ConfidenceScore float64
	ClassifiedBy    ClassifiedBy
	CreatedAt       time.Time
}

// DownloadRecord tracks when a document is downloaded.
type DownloadRecord struct {
	ID               string
	DocumentID       string
	DownloadedByUser string
	VersionNumber    int
	IPAddress        string
	UserAgent        string
	CreatedAt        time.Time
}
