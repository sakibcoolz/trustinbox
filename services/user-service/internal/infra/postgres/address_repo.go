package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type addressRepo struct {
	db *sql.DB
}

func NewUserAddressRepository(db *sql.DB) repository.UserAddressRepository {
	return &addressRepo{db: db}
}

func (r *addressRepo) Create(ctx context.Context, addr *entity.UserAddress) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO user_addresses (id, user_id, label, address_line1, address_line2, city, state, postal_code, country, latitude, longitude, is_current, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
		addr.ID, addr.UserID, addr.Label, addr.AddressLine1, addr.AddressLine2,
		addr.City, addr.State, addr.PostalCode, addr.Country,
		nullFloat(addr.Latitude), nullFloat(addr.Longitude), addr.IsCurrent,
	)
	if err != nil {
		return fmt.Errorf("create user address: %w", err)
	}
	return nil
}

func (r *addressRepo) Update(ctx context.Context, addr *entity.UserAddress) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE user_addresses SET label = $3, address_line1 = $4, address_line2 = $5, city = $6, state = $7,
		 postal_code = $8, country = $9, latitude = $10, longitude = $11, is_current = $12, updated_at = NOW()
		 WHERE id = $1 AND user_id = $2`,
		addr.ID, addr.UserID, addr.Label, addr.AddressLine1, addr.AddressLine2,
		addr.City, addr.State, addr.PostalCode, addr.Country,
		nullFloat(addr.Latitude), nullFloat(addr.Longitude), addr.IsCurrent,
	)
	if err != nil {
		return fmt.Errorf("update user address: %w", err)
	}
	return nil
}

func (r *addressRepo) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`, id, userID,
	)
	if err != nil {
		return fmt.Errorf("delete user address: %w", err)
	}
	return nil
}

func (r *addressRepo) GetByID(ctx context.Context, id, userID string) (*entity.UserAddress, error) {
	var a entity.UserAddress
	var lat, lng sql.NullFloat64
	var line2, state, postalCode sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, label, address_line1, address_line2, city, state, postal_code, country,
		        latitude, longitude, is_current, created_at, updated_at
		 FROM user_addresses WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&a.ID, &a.UserID, &a.Label, &a.AddressLine1, &line2, &a.City, &state, &postalCode,
		&a.Country, &lat, &lng, &a.IsCurrent, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get user address: %w", err)
	}
	a.AddressLine2 = line2.String
	a.State = state.String
	a.PostalCode = postalCode.String
	a.Latitude = lat.Float64
	a.Longitude = lng.Float64
	return &a, nil
}

func (r *addressRepo) ListByUser(ctx context.Context, userID string) ([]entity.UserAddress, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, label, address_line1, address_line2, city, state, postal_code, country,
		        latitude, longitude, is_current, created_at, updated_at
		 FROM user_addresses WHERE user_id = $1 ORDER BY is_current DESC, created_at DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list user addresses: %w", err)
	}
	defer rows.Close()

	var addrs []entity.UserAddress
	for rows.Next() {
		var a entity.UserAddress
		var lat, lng sql.NullFloat64
		var line2, state, postalCode sql.NullString
		if err := rows.Scan(&a.ID, &a.UserID, &a.Label, &a.AddressLine1, &line2, &a.City, &state,
			&postalCode, &a.Country, &lat, &lng, &a.IsCurrent, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user address: %w", err)
		}
		a.AddressLine2 = line2.String
		a.State = state.String
		a.PostalCode = postalCode.String
		a.Latitude = lat.Float64
		a.Longitude = lng.Float64
		addrs = append(addrs, a)
	}
	return addrs, rows.Err()
}

func (r *addressRepo) SetCurrent(ctx context.Context, id, userID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Clear current flag on all addresses for this user
	if _, err := tx.ExecContext(ctx,
		`UPDATE user_addresses SET is_current = FALSE, updated_at = NOW() WHERE user_id = $1`, userID,
	); err != nil {
		return fmt.Errorf("clear current address: %w", err)
	}

	// Set the chosen address as current
	if _, err := tx.ExecContext(ctx,
		`UPDATE user_addresses SET is_current = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID,
	); err != nil {
		return fmt.Errorf("set current address: %w", err)
	}

	return tx.Commit()
}

func (r *addressRepo) GetCurrent(ctx context.Context, userID string) (*entity.UserAddress, error) {
	var a entity.UserAddress
	var lat, lng sql.NullFloat64
	var line2, state, postalCode sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, label, address_line1, address_line2, city, state, postal_code, country,
		        latitude, longitude, is_current, created_at, updated_at
		 FROM user_addresses WHERE user_id = $1 AND is_current = TRUE LIMIT 1`, userID,
	).Scan(&a.ID, &a.UserID, &a.Label, &a.AddressLine1, &line2, &a.City, &state, &postalCode,
		&a.Country, &lat, &lng, &a.IsCurrent, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get current address: %w", err)
	}
	a.AddressLine2 = line2.String
	a.State = state.String
	a.PostalCode = postalCode.String
	a.Latitude = lat.Float64
	a.Longitude = lng.Float64
	return &a, nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

func nullFloat(f float64) interface{} {
	if f == 0 {
		return nil
	}
	return f
}
