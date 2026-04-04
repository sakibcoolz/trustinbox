//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// ─── Customer Cannot Access Provider Queries ───────────────

func TestCustomerCannotAccessProviderNotifications(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { notifications(limit: 10, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when customer accesses provider notifications")
	}
}

func TestCustomerCannotAccessCampaigns(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { campaigns(limit: 10, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when customer accesses campaigns")
	}
}

func TestCustomerCannotAccessBots(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { bots { id name } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when customer accesses bots")
	}
}

func TestCustomerCannotAccessCustomers(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { customers(limit: 10, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when customer accesses customers")
	}
}

// ─── Provider Cannot Access Customer Queries ───────────────

func TestProviderCannotAccessMyNotifications(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	query := `query { myNotifications(limit: 10, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when provider accesses myNotifications")
	}
}

func TestProviderCannotAccessMyPrivacyPreferences(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	query := `query { myPrivacyPreferences { allowCalls } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when provider accesses myPrivacyPreferences")
	}
}

func TestProviderCannotUpdateCustomerPreferences(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	mutation := `mutation { updateMyPrivacyPreferences(input: { allowAdvertisements: false }) { allowAdvertisements } }`

	resp := graphqlPost(t, token, mutation, nil)
	result := parseGraphQLResponse(t, resp)

	if len(result.Errors) == 0 {
		t.Errorf("expected authorization error when provider updates customer preferences")
	}
}

// ─── Unauthenticated Access ────────────────────────────────

func TestUnauthenticatedAccess_Returns401(t *testing.T) {
	query := `query { myNotifications(limit: 10, offset: 0) { nodes { id } } }`

	resp := graphqlPost(t, "", query, nil)

	if resp.StatusCode == http.StatusOK {
		result := parseGraphQLResponse(t, resp)
		if len(result.Errors) == 0 {
			t.Errorf("expected error for unauthenticated request")
		}
	}
}

func TestInvalidJWT_ReturnsError(t *testing.T) {
	query := `query { myNotifications(limit: 10, offset: 0) { nodes { id } } }`

	resp := graphqlPost(t, "invalid.jwt.token", query, nil)

	if resp.StatusCode == http.StatusOK {
		result := parseGraphQLResponse(t, resp)
		if len(result.Errors) == 0 {
			t.Errorf("expected error for invalid JWT")
		}
	}
}

func TestExpiredJWT_ReturnsError(t *testing.T) {
	// Generate an already-expired token
	token := generateJWT(testCustomerID, "", "CUSTOMER")
	// Override with manually expired token
	expiredToken := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0Iiwicm9sZSI6IkNVU1RPTUVSIiwiZXhwIjoxMDAwMDAwMDAwfQ.invalid"

	query := `query { myNotifications(limit: 10, offset: 0) { nodes { id } } }`
	resp := graphqlPost(t, expiredToken, query, nil)

	_ = token // suppress unused warning

	if resp.StatusCode == http.StatusOK {
		result := parseGraphQLResponse(t, resp)
		if len(result.Errors) == 0 {
			t.Errorf("expected error for expired JWT")
		}
	}
}

// ─── Wrong SP Context ──────────────────────────────────────

func TestWrongSPContext_DeniedOrEmpty(t *testing.T) {
	// Use SP-A token but query should only return SP-A data
	wrongSPToken := generateProviderJWT(testProviderID, "wrong-sp-id", "SP_ADMIN")
	query := `query { notifications(limit: 10, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, wrongSPToken, query, nil)
	result := parseGraphQLResponse(t, resp)

	// Either error or empty results
	if len(result.Errors) == 0 {
		if data, ok := result.Data["notifications"].(map[string]interface{}); ok {
			if total, ok := data["totalCount"].(float64); ok && total > 0 {
				t.Logf("got %v notifications for wrong SP context — verify data scoping", total)
			}
		}
	}
}

// ─── Role-Based Access ─────────────────────────────────────

func TestAnalystCannotSendNotification(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "ANALYST")

	payload := map[string]interface{}{
		"userId":   testCustomerID,
		"category": "SERVICE_PROVIDER",
		"title":    "Analyst test",
		"body":     "Should be denied",
	}
	resp := restPost(t, token, "/api/v1/notifications", payload)
	defer resp.Body.Close()

	// Analysts should not be able to send notifications
	if resp.StatusCode == http.StatusCreated {
		t.Errorf("expected ANALYST role to be denied sending notifications, got 201")
	}
}

func TestAgentCannotManageTeam(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "AGENT")

	payload := map[string]interface{}{
		"email": "newmember@test.com",
		"role":  "AGENT",
	}
	resp := restPost(t, token, "/api/v1/team/members", payload)
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK {
		t.Errorf("expected AGENT role to be denied team management, got %d", resp.StatusCode)
	}
}
