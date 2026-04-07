package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"go.uber.org/zap"
)

// ─── Service Provider Profile Handler ──────────────────────

type spProfileResponse struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Slug               string  `json:"slug"`
	LegalName          string  `json:"legalName,omitempty"`
	Industry           string  `json:"industry"`
	Description        string  `json:"description,omitempty"`
	Website            string  `json:"website,omitempty"`
	VerificationStatus string  `json:"verificationStatus"`
	Status             string  `json:"status"`
	ContactEmail       string  `json:"contactEmail,omitempty"`
	SupportPhone       string  `json:"supportPhone,omitempty"`
	Address            string  `json:"address,omitempty"`
	City               string  `json:"city,omitempty"`
	State              string  `json:"state,omitempty"`
	Country            string  `json:"country,omitempty"`
	PostalCode         string  `json:"postalCode,omitempty"`
	Latitude           float64 `json:"latitude,omitempty"`
	Longitude          float64 `json:"longitude,omitempty"`
	LogoURL            string  `json:"logoUrl,omitempty"`
	PrimaryColor       string  `json:"primaryColor,omitempty"`
	NotificationFooter string  `json:"notificationFooter,omitempty"`
}

type spProfileUpdateRequest struct {
	Name               *string  `json:"name"`
	LegalName          *string  `json:"legalName"`
	Industry           *string  `json:"industry"`
	Description        *string  `json:"description"`
	Website            *string  `json:"website"`
	ContactEmail       *string  `json:"contactEmail"`
	SupportPhone       *string  `json:"supportPhone"`
	Address            *string  `json:"address"`
	City               *string  `json:"city"`
	State              *string  `json:"state"`
	Country            *string  `json:"country"`
	PostalCode         *string  `json:"postalCode"`
	Latitude           *float64 `json:"latitude"`
	Longitude          *float64 `json:"longitude"`
	LogoURL            *string  `json:"logoUrl"`
	PrimaryColor       *string  `json:"primaryColor"`
	NotificationFooter *string  `json:"notificationFooter"`
}

func handleProviderSPProfile(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing service provider context"})
			return
		}

		// Extract the SP ID from path: /api/v1/service-providers/{id}
		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/service-providers")
		rest = strings.TrimPrefix(rest, "/")
		if rest == "" {
			rest = spID
		}

		// Verify the requested SP matches the authenticated SP
		if rest != spID {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "access denied"})
			return
		}

		switch r.Method {
		case http.MethodGet:
			getSPProfile(w, r, db, log, spID)
		case http.MethodPut:
			updateSPProfile(w, r, db, log, spID)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

func getSPProfile(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	var sp spProfileResponse
	var legalName, description, website, contactEmail, supportPhone sql.NullString
	var address, city, state, country, postalCode sql.NullString
	var latitude, longitude sql.NullFloat64
	var logoURL, primaryColor, notificationFooter sql.NullString

	err := db.QueryRowContext(r.Context(), `
		SELECT id, name, COALESCE(slug, id::text), legal_name, industry, description,
		       website, verification_status, status, contact_email, support_phone,
		       address, city, state, country, postal_code, latitude, longitude,
		       logo_url, primary_color, notification_footer
		FROM service_providers WHERE id = $1`, spID,
	).Scan(
		&sp.ID, &sp.Name, &sp.Slug, &legalName, &sp.Industry, &description,
		&website, &sp.VerificationStatus, &sp.Status, &contactEmail, &supportPhone,
		&address, &city, &state, &country, &postalCode, &latitude, &longitude,
		&logoURL, &primaryColor, &notificationFooter,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "service provider not found"})
		return
	}
	if err != nil {
		log.Error("failed to get SP profile", zap.Error(err), zap.String("sp_id", spID))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	if legalName.Valid {
		sp.LegalName = legalName.String
	}
	if description.Valid {
		sp.Description = description.String
	}
	if website.Valid {
		sp.Website = website.String
	}
	if contactEmail.Valid {
		sp.ContactEmail = contactEmail.String
	}
	if supportPhone.Valid {
		sp.SupportPhone = supportPhone.String
	}
	if address.Valid {
		sp.Address = address.String
	}
	if city.Valid {
		sp.City = city.String
	}
	if state.Valid {
		sp.State = state.String
	}
	if country.Valid {
		sp.Country = country.String
	}
	if postalCode.Valid {
		sp.PostalCode = postalCode.String
	}
	if latitude.Valid {
		sp.Latitude = latitude.Float64
	}
	if longitude.Valid {
		sp.Longitude = longitude.Float64
	}
	if logoURL.Valid {
		sp.LogoURL = logoURL.String
	}
	if primaryColor.Valid {
		sp.PrimaryColor = primaryColor.String
	}
	if notificationFooter.Valid {
		sp.NotificationFooter = notificationFooter.String
	}

	writeJSON(w, http.StatusOK, sp)
}

func updateSPProfile(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	var req spProfileUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	type field struct {
		col string
		val interface{}
	}
	var fields []field

	if req.Name != nil {
		fields = append(fields, field{"name", *req.Name})
	}
	if req.LegalName != nil {
		fields = append(fields, field{"legal_name", *req.LegalName})
	}
	if req.Industry != nil {
		fields = append(fields, field{"industry", *req.Industry})
	}
	if req.Description != nil {
		fields = append(fields, field{"description", *req.Description})
	}
	if req.Website != nil {
		fields = append(fields, field{"website", *req.Website})
	}
	if req.ContactEmail != nil {
		fields = append(fields, field{"contact_email", *req.ContactEmail})
	}
	if req.SupportPhone != nil {
		fields = append(fields, field{"support_phone", *req.SupportPhone})
	}
	if req.Address != nil {
		fields = append(fields, field{"address", *req.Address})
	}
	if req.City != nil {
		fields = append(fields, field{"city", *req.City})
	}
	if req.State != nil {
		fields = append(fields, field{"state", *req.State})
	}
	if req.Country != nil {
		fields = append(fields, field{"country", *req.Country})
	}
	if req.PostalCode != nil {
		fields = append(fields, field{"postal_code", *req.PostalCode})
	}
	if req.Latitude != nil {
		fields = append(fields, field{"latitude", *req.Latitude})
	}
	if req.Longitude != nil {
		fields = append(fields, field{"longitude", *req.Longitude})
	}
	if req.LogoURL != nil {
		fields = append(fields, field{"logo_url", *req.LogoURL})
	}
	if req.PrimaryColor != nil {
		fields = append(fields, field{"primary_color", *req.PrimaryColor})
	}
	if req.NotificationFooter != nil {
		fields = append(fields, field{"notification_footer", *req.NotificationFooter})
	}

	if len(fields) == 0 {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "no fields to update"})
		return
	}

	setClauses := make([]string, 0, len(fields)+1)
	args := make([]interface{}, 0, len(fields)+1)
	for i, f := range fields {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", f.col, i+1))
		args = append(args, f.val)
	}
	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, spID)

	query := fmt.Sprintf("UPDATE service_providers SET %s WHERE id = $%d",
		strings.Join(setClauses, ", "), len(args))

	_, err := db.ExecContext(r.Context(), query, args...)
	if err != nil {
		log.Error("failed to update SP profile", zap.Error(err), zap.String("sp_id", spID))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	getSPProfile(w, r, db, log, spID)
}
