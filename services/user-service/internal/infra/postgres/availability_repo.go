package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type availabilityRepo struct {
	db *sql.DB
}

func NewAvailabilitySlotRepository(db *sql.DB) repository.AvailabilitySlotRepository {
	return &availabilityRepo{db: db}
}

func (r *availabilityRepo) ListByUser(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, day_of_week, start_time, end_time, slot_type, is_active, created_at
		 FROM availability_slots WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list availability slots: %w", err)
	}
	defer rows.Close()

	var slots []entity.AvailabilitySlot
	for rows.Next() {
		var slot entity.AvailabilitySlot
		if err := rows.Scan(
			&slot.ID, &slot.UserID, &slot.DayOfWeek,
			&slot.StartTime, &slot.EndTime, &slot.SlotType,
			&slot.IsActive, &slot.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan availability slot: %w", err)
		}
		slots = append(slots, slot)
	}
	return slots, rows.Err()
}

func (r *availabilityRepo) Create(ctx context.Context, slot *entity.AvailabilitySlot) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO availability_slots (id, user_id, day_of_week, start_time, end_time, slot_type, is_active, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		slot.ID, slot.UserID, slot.DayOfWeek, slot.StartTime, slot.EndTime, slot.SlotType, slot.IsActive,
	)
	return err
}

func (r *availabilityRepo) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM availability_slots WHERE id = $1 AND user_id = $2`, id, userID,
	)
	return err
}
