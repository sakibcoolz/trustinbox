package entity

import "time"

type CallbackRequest struct {
	ID                string
	UserID            string
	ServiceProviderID string
	RequestedBySPUser string
	Reason            string
	Details           string
	Status            string // PENDING, APPROVED, REJECTED, RESCHEDULED, EXPIRED
	RequestedAt       time.Time
	RespondedAt       *time.Time
	ApprovedSlotStart *time.Time
	ApprovedSlotEnd   *time.Time
}

type Conversation struct {
	ID                string
	UserID            string
	ServiceProviderID string
	Status            string // OPEN, CLOSED, ARCHIVED
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Message struct {
	ID             string
	ConversationID string
	SenderType     string // USER, SP_AGENT, SYSTEM, AI
	SenderRefID    string
	MessageType    string // TEXT, IMAGE, DOCUMENT, SYSTEM
	Content        string
	Metadata       map[string]string
	CreatedAt      time.Time
}

type Document struct {
	ID                string
	ServiceProviderID string
	UploadedBySPUser  string
	FileName          string
	FileType          string
	S3Key             string
	FileSize          int64
	CreatedAt         time.Time
}

type DocumentShare struct {
	ID                string
	DocumentID        string
	UserID            string
	ServiceProviderID string
	ShareContext      string // NOTIFICATION, CHAT, CALLBACK, DIRECT
	FileName          string
	FileType          string
	CreatedAt         time.Time
	OpenedAt          *time.Time
}

type SpamReport struct {
	ID                string
	UserID            string
	ServiceProviderID string
	NotificationID    string
	CallbackRequestID string
	Reason            string
	Details           string
	Status            string // OPEN, REVIEWED, RESOLVED, DISMISSED
	CreatedAt         time.Time
}
