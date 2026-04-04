//go:build integration

package integration

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// ─── Provider GraphQL Queries ──────────────────────────────

func TestProviderNotifications_ReturnsSPNotifications(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	query := `query { notifications(limit: 10, offset: 0) { nodes { id title body category status createdAt } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)

	data, ok := result.Data["notifications"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected notifications in response data")
	}
	if _, ok := data["totalCount"]; !ok {
		t.Errorf("expected totalCount field")
	}
}

func TestProviderCallbackRequests_ReturnsSPCallbacks(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	query := `query { callbackRequests(limit: 10, offset: 0) { nodes { id reason status createdAt } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── REST API Tests ────────────────────────────────────────

func TestRESTSendNotification_Returns201(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")

	payload := map[string]interface{}{
		"userId":   testCustomerID,
		"category": "SERVICE_PROVIDER",
		"title":    "Integration Test Notification",
		"body":     "This is an integration test notification",
	}
	resp := restPost(t, token, "/api/v1/notifications", payload)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 201/200, got %d: %s", resp.StatusCode, string(body))
	}
}

func TestRESTCreateCallback_Returns201(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")

	payload := map[string]interface{}{
		"userId":   testCustomerID,
		"reason":   "Integration test callback",
		"priority": "MEDIUM",
	}
	resp := restPost(t, token, "/api/callbacks", payload)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 201/200, got %d: %s", resp.StatusCode, string(body))
	}
}

func TestRESTCreateCampaign_Returns201(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")

	payload := map[string]interface{}{
		"name":     "Integration Test Campaign",
		"category": "SERVICE_PROVIDER",
		"title":    "Campaign Title",
		"body":     "Campaign body text",
		"targets":  []string{testCustomerID},
	}
	resp := restPost(t, token, "/api/campaigns", payload)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 201/200, got %d: %s", resp.StatusCode, string(body))
	}
}

func TestRESTListNotifications_ReturnsPaginated(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")

	resp := restGet(t, token, "/api/v1/notifications?limit=10&offset=0")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 200, got %d: %s", resp.StatusCode, string(body))
	}

	body, _ := io.ReadAll(resp.Body)
	var respData map[string]interface{}
	if err := json.Unmarshal(body, &respData); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
}

func TestRESTListNotifications_FilterByStatus(t *testing.T) {
	token := generateProviderJWT(testProviderID, testSPID, "SP_ADMIN")
	resp := restGet(t, token, "/api/v1/notifications?status=DELIVERED")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Errorf("expected 200, got %d: %s", resp.StatusCode, string(body))
	}
}
