//go:build integration

package integration

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"
)

// ─── Constants ─────────────────────────────────────────────

const gatewayURL = "http://localhost:4000"

// jwtSecret must match the dev JWT_SECRET from .env
const jwtSecret = "dev-secret-change-in-production"

// ─── GraphQL Helpers ───────────────────────────────────────

func graphqlPost(t *testing.T, token string, query string, variables map[string]interface{}) *http.Response {
	t.Helper()

	body := map[string]interface{}{
		"query":     query,
		"variables": variables,
	}
	jsonData, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("failed to marshal GraphQL body: %v", err)
	}

	req, err := http.NewRequest("POST", gatewayURL+"/graphql", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GraphQL request failed: %v", err)
	}
	return resp
}

func restPost(t *testing.T, token, path string, body interface{}) *http.Response {
	t.Helper()

	jsonData, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("failed to marshal body: %v", err)
	}

	req, err := http.NewRequest("POST", gatewayURL+path, bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("REST POST request failed: %v", err)
	}
	return resp
}

func restGet(t *testing.T, token, path string) *http.Response {
	t.Helper()

	req, err := http.NewRequest("GET", gatewayURL+path, nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("REST GET request failed: %v", err)
	}
	return resp
}

// ─── Response Parsers ──────────────────────────────────────

type graphqlResponse struct {
	Data   map[string]interface{} `json:"data"`
	Errors []struct {
		Message    string                 `json:"message"`
		Extensions map[string]interface{} `json:"extensions"`
	} `json:"errors"`
}

func parseGraphQLResponse(t *testing.T, resp *http.Response) graphqlResponse {
	t.Helper()
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var result graphqlResponse
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to parse GraphQL response: %v\nbody: %s", err, string(data))
	}
	return result
}

func requireNoErrors(t *testing.T, result graphqlResponse) {
	t.Helper()
	if len(result.Errors) > 0 {
		t.Fatalf("expected no GraphQL errors, got: %+v", result.Errors)
	}
}

func requireError(t *testing.T, result graphqlResponse, expectedMsg string) {
	t.Helper()
	if len(result.Errors) == 0 {
		t.Fatalf("expected GraphQL error containing %q, but got none", expectedMsg)
	}
}

// ─── JWT Generation ────────────────────────────────────────

func generateCustomerJWT(userID string) string {
	return generateJWT(userID, "", "CUSTOMER")
}

func generateProviderJWT(userID, spID, role string) string {
	return generateJWT(userID, spID, role)
}

func generateJWT(userID, spID, role string) string {
	header := base64URLEncode([]byte(`{"alg":"HS256","typ":"JWT"}`))

	claims := map[string]interface{}{
		"sub":  userID,
		"role": role,
		"exp":  time.Now().Add(time.Hour).Unix(),
		"iat":  time.Now().Unix(),
	}
	if spID != "" {
		claims["sp_id"] = spID
	}

	claimsJSON, _ := json.Marshal(claims)
	payload := base64URLEncode(claimsJSON)

	sigInput := header + "." + payload
	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(sigInput))
	signature := base64URLEncode(mac.Sum(nil))

	return fmt.Sprintf("%s.%s.%s", header, payload, signature)
}

func base64URLEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}
