package repository

import (
	"context"

	"github.com/trustinbox/industry-service/internal/domain/entity"
)

// IndustryProfileRepository defines persistence operations for industry profiles.
type IndustryProfileRepository interface {
	Create(ctx context.Context, profile *entity.IndustryProfile) error
	GetByKey(ctx context.Context, industryKey string) (*entity.IndustryProfile, error)
	Update(ctx context.Context, profile *entity.IndustryProfile) error
	List(ctx context.Context, activeOnly bool, limit, offset int) ([]*entity.IndustryProfile, int, error)
}
