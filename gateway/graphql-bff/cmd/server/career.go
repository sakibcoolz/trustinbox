package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/trustinbox/cornerstone/auth/jwt"
	"go.uber.org/zap"
)

// ============================================================
// Types
// ============================================================

type workExperienceItem struct {
	ID          string `json:"id"`
	JobTitle    string `json:"jobTitle"`
	Company     string `json:"company"`
	Industry    string `json:"industry"`
	Location    string `json:"location"`
	StartDate   string `json:"startDate"` // YYYY-MM
	EndDate     string `json:"endDate"`   // YYYY-MM or ""
	IsCurrent   bool   `json:"isCurrent"`
	Description string `json:"description"`
}

type educationItem struct {
	ID          string `json:"id"`
	School      string `json:"school"`
	Degree      string `json:"degree"`
	Field       string `json:"field"`
	StartYear   int    `json:"startYear"`
	EndYear     int    `json:"endYear"` // 0 = current / not graduated
	IsCurrent   bool   `json:"isCurrent"`
	Description string `json:"description"`
}

type skillItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Level    string `json:"level"` // BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
	Category string `json:"category"`
}

type careerResponse struct {
	WorkExperience []workExperienceItem `json:"workExperience"`
	Education      []educationItem      `json:"education"`
	Skills         []skillItem          `json:"skills"`
}

type upsertWorkRequest struct {
	ID          string `json:"id"` // empty = insert new
	JobTitle    string `json:"jobTitle"`
	Company     string `json:"company"`
	Industry    string `json:"industry"`
	Location    string `json:"location"`
	StartDate   string `json:"startDate"` // YYYY-MM
	EndDate     string `json:"endDate"`   // YYYY-MM or ""
	IsCurrent   bool   `json:"isCurrent"`
	Description string `json:"description"`
}

type upsertEducationRequest struct {
	ID          string `json:"id"`
	School      string `json:"school"`
	Degree      string `json:"degree"`
	Field       string `json:"field"`
	StartYear   int    `json:"startYear"`
	EndYear     int    `json:"endYear"`
	IsCurrent   bool   `json:"isCurrent"`
	Description string `json:"description"`
}

type addSkillRequest struct {
	Name     string `json:"name"`
	Level    string `json:"level"`
	Category string `json:"category"`
}

// ============================================================
// GET /api/career
// ============================================================

func handleGetCareer(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		resp := careerResponse{
			WorkExperience: []workExperienceItem{},
			Education:      []educationItem{},
			Skills:         []skillItem{},
		}

		// Work experience
		wRows, wErr := db.QueryContext(r.Context(), `
			SELECT id, job_title, company,
				COALESCE(industry,''), COALESCE(location,''),
				to_char(start_date,'YYYY-MM'),
				COALESCE(to_char(end_date,'YYYY-MM'),''),
				is_current, COALESCE(description,'')
			FROM user_work_experience
			WHERE user_id = $1
			ORDER BY start_date DESC
		`, userID)
		if wErr != nil {
			log.Error("handleGetCareer: work query", zap.Error(wErr))
		} else {
			defer wRows.Close()
			for wRows.Next() {
				var item workExperienceItem
				if scanErr := wRows.Scan(
					&item.ID, &item.JobTitle, &item.Company, &item.Industry, &item.Location,
					&item.StartDate, &item.EndDate, &item.IsCurrent, &item.Description,
				); scanErr == nil {
					resp.WorkExperience = append(resp.WorkExperience, item)
				}
			}
		}

		// Education
		eRows, eErr := db.QueryContext(r.Context(), `
			SELECT id, school, COALESCE(degree,''), COALESCE(field,''),
				start_year, COALESCE(end_year,0), is_current, COALESCE(description,'')
			FROM user_education
			WHERE user_id = $1
			ORDER BY start_year DESC
		`, userID)
		if eErr != nil {
			log.Error("handleGetCareer: education query", zap.Error(eErr))
		} else {
			defer eRows.Close()
			for eRows.Next() {
				var item educationItem
				if scanErr := eRows.Scan(
					&item.ID, &item.School, &item.Degree, &item.Field,
					&item.StartYear, &item.EndYear, &item.IsCurrent, &item.Description,
				); scanErr == nil {
					resp.Education = append(resp.Education, item)
				}
			}
		}

		// Skills
		sRows, sErr := db.QueryContext(r.Context(), `
			SELECT id, skill_name, COALESCE(level,''), COALESCE(category,'')
			FROM user_skills
			WHERE user_id = $1
			ORDER BY category, skill_name
		`, userID)
		if sErr != nil {
			log.Error("handleGetCareer: skills query", zap.Error(sErr))
		} else {
			defer sRows.Close()
			for sRows.Next() {
				var item skillItem
				if scanErr := sRows.Scan(&item.ID, &item.Name, &item.Level, &item.Category); scanErr == nil {
					resp.Skills = append(resp.Skills, item)
				}
			}
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// ============================================================
// POST/PUT /api/career/work
// ============================================================

func handleUpsertWork(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodPut {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req upsertWorkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid body"})
			return
		}
		if strings.TrimSpace(req.JobTitle) == "" || strings.TrimSpace(req.Company) == "" || strings.TrimSpace(req.StartDate) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "jobTitle, company and startDate are required"})
			return
		}

		startDate, parseErr := time.Parse("2006-01", req.StartDate)
		if parseErr != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "startDate must be YYYY-MM"})
			return
		}

		var endDate *time.Time
		if req.EndDate != "" && !req.IsCurrent {
			t, parseErr2 := time.Parse("2006-01", req.EndDate)
			if parseErr2 != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "endDate must be YYYY-MM"})
				return
			}
			endDate = &t
		}

		if req.ID == "" {
			_, err = db.ExecContext(r.Context(), `
				INSERT INTO user_work_experience
					(user_id, job_title, company, industry, location, start_date, end_date, is_current, description)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			`, userID, req.JobTitle, req.Company, req.Industry, req.Location, startDate, endDate, req.IsCurrent, req.Description)
		} else {
			_, err = db.ExecContext(r.Context(), `
				UPDATE user_work_experience SET
					job_title=$1, company=$2, industry=$3, location=$4,
					start_date=$5, end_date=$6, is_current=$7, description=$8, updated_at=NOW()
				WHERE id=$9 AND user_id=$10
			`, req.JobTitle, req.Company, req.Industry, req.Location, startDate, endDate, req.IsCurrent, req.Description, req.ID, userID)
		}
		if err != nil {
			log.Error("handleUpsertWork: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to save"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// DELETE /api/career/work?id=xxx
// ============================================================

func handleDeleteWork(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "id required"})
			return
		}
		_, err = db.ExecContext(r.Context(),
			`DELETE FROM user_work_experience WHERE id=$1 AND user_id=$2`, id, userID)
		if err != nil {
			log.Error("handleDeleteWork: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to delete"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// POST/PUT /api/career/education
// ============================================================

func handleUpsertEducation(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodPut {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req upsertEducationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid body"})
			return
		}
		if strings.TrimSpace(req.School) == "" || req.StartYear == 0 {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "school and startYear are required"})
			return
		}

		var endYear *int
		if !req.IsCurrent && req.EndYear != 0 {
			endYear = &req.EndYear
		}

		if req.ID == "" {
			_, err = db.ExecContext(r.Context(), `
				INSERT INTO user_education
					(user_id, school, degree, field, start_year, end_year, is_current, description)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			`, userID, req.School, req.Degree, req.Field, req.StartYear, endYear, req.IsCurrent, req.Description)
		} else {
			_, err = db.ExecContext(r.Context(), `
				UPDATE user_education SET
					school=$1, degree=$2, field=$3, start_year=$4,
					end_year=$5, is_current=$6, description=$7, updated_at=NOW()
				WHERE id=$8 AND user_id=$9
			`, req.School, req.Degree, req.Field, req.StartYear, endYear, req.IsCurrent, req.Description, req.ID, userID)
		}
		if err != nil {
			log.Error("handleUpsertEducation: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to save"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// DELETE /api/career/education?id=xxx
// ============================================================

func handleDeleteEducation(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "id required"})
			return
		}
		_, err = db.ExecContext(r.Context(),
			`DELETE FROM user_education WHERE id=$1 AND user_id=$2`, id, userID)
		if err != nil {
			log.Error("handleDeleteEducation: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to delete"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// POST /api/career/skills
// ============================================================

func handleAddSkill(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var req addSkillRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid body"})
			return
		}
		if strings.TrimSpace(req.Name) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "name is required"})
			return
		}
		validLevels := map[string]bool{"BEGINNER": true, "INTERMEDIATE": true, "ADVANCED": true, "EXPERT": true, "": true}
		if !validLevels[req.Level] {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "level must be BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT"})
			return
		}

		_, err = db.ExecContext(r.Context(), `
			INSERT INTO user_skills (user_id, skill_name, level, category)
			VALUES ($1,$2,$3,$4)
		`, userID, strings.TrimSpace(req.Name), req.Level, req.Category)
		if err != nil {
			log.Error("handleAddSkill: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to save"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ============================================================
// DELETE /api/career/skills?id=xxx
// ============================================================

func handleDeleteSkill(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "id required"})
			return
		}
		_, err = db.ExecContext(r.Context(),
			`DELETE FROM user_skills WHERE id=$1 AND user_id=$2`, id, userID)
		if err != nil {
			log.Error("handleDeleteSkill: exec", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to delete"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
