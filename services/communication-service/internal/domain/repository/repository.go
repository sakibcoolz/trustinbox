package repository

import (
	"context"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
)

type CallbackRequestRepository interface {
	Create(ctx context.Context, req *entity.CallbackRequest) error
	GetByID(ctx context.Context, id string) (*entity.CallbackRequest, error)
	ListByUser(ctx context.Context, userID, status string, limit, offset int) ([]entity.CallbackRequest, int, error)
	ListByOrg(ctx context.Context, orgID, status string, limit, offset int) ([]entity.CallbackRequest, int, error)
	Approve(ctx context.Context, id string, slotStart, slotEnd time.Time) error
	Reject(ctx context.Context, id, reason string) error
	UpdateStatus(ctx context.Context, id, status string) error
}

type ConversationRepository interface {
	Create(ctx context.Context, conv *entity.Conversation) error
	GetByID(ctx context.Context, id string) (*entity.Conversation, error)
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.Conversation, int, error)
	Close(ctx context.Context, id string) error
}

type MessageRepository interface {
	Create(ctx context.Context, msg *entity.Message) error
	ListByConversation(ctx context.Context, convID string, limit, offset int) ([]entity.Message, int, error)
}

type DocumentRepository interface {
	Create(ctx context.Context, doc *entity.Document) error
	GetByID(ctx context.Context, id string) (*entity.Document, error)
}

type DocumentShareRepository interface {
	Create(ctx context.Context, share *entity.DocumentShare) error
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.DocumentShare, int, error)
	MarkOpened(ctx context.Context, id string) error
}

type SpamReportRepository interface {
	Create(ctx context.Context, report *entity.SpamReport) error
	ListByOrg(ctx context.Context, orgID string, limit, offset int) ([]entity.SpamReport, int, error)
	UpdateStatus(ctx context.Context, id, status string) error
}
