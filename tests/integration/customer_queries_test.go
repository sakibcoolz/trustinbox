//go:build integration

package integration

import (
	"testing"
)

// ─── Test User/SP IDs ──────────────────────────────────────

const (
	testCustomerID = "test-customer-001"
	testProviderID = "test-provider-001"
	testSPID       = "test-sp-001"
)

// ─── myNotifications ───────────────────────────────────────

func TestMyNotifications_ReturnsUserNotifications(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myNotifications(limit: 10, offset: 0) { nodes { id title body category createdAt } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)

	data, ok := result.Data["myNotifications"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected myNotifications in response data")
	}
	if _, ok := data["totalCount"]; !ok {
		t.Errorf("expected totalCount field")
	}
	if _, ok := data["nodes"]; !ok {
		t.Errorf("expected nodes field")
	}
}

func TestMyNotifications_FilterByCategory(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myNotifications(limit: 5, offset: 0, category: "PERSONAL") { nodes { id category } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

func TestMyNotifications_Pagination(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myNotifications(limit: 5, offset: 0) { nodes { id } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myCallbackRequests ────────────────────────────────────

func TestMyCallbackRequests_ReturnsUserCallbacks(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myCallbackRequests(limit: 10, offset: 0) { nodes { id reason status createdAt } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

func TestMyCallbackRequests_FilterByStatus(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myCallbackRequests(limit: 10, offset: 0, status: "PENDING") { nodes { id status } totalCount } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myPrivacyPreferences ──────────────────────────────────

func TestMyPrivacyPreferences_ReturnsPreferences(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myPrivacyPreferences { allowCalls allowSMS allowEmail allowPush allowAdvertisements allowDataSharing allowLocationTracking } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)

	data, ok := result.Data["myPrivacyPreferences"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected myPrivacyPreferences in response data")
	}
	requiredFields := []string{"allowCalls", "allowSMS", "allowEmail", "allowPush", "allowAdvertisements", "allowDataSharing", "allowLocationTracking"}
	for _, field := range requiredFields {
		if _, ok := data[field]; !ok {
			t.Errorf("expected field %s in privacy preferences", field)
		}
	}
}

// ─── myDNDRules ────────────────────────────────────────────

func TestMyDNDRules_ReturnsRules(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myDNDRules { id scopeType startTime endTime daysOfWeek } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myBlockedProviders ────────────────────────────────────

func TestMyBlockedProviders_ReturnsList(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myBlockedProviders { id spId spName blockedAt } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myDocuments ───────────────────────────────────────────

func TestMyDocuments_ReturnsList(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myDocuments { id name type size sharedAt } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myServiceProviders ────────────────────────────────────

func TestMyServiceProviders_ReturnsList(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myServiceProviders { id name verificationStatus } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── myDashboardSummary ────────────────────────────────────

func TestMyDashboardSummary_ReturnsSummary(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)
	query := `query { myDashboardSummary { unreadNotifications pendingCallbacks activeConversations blockedProviders } }`

	resp := graphqlPost(t, token, query, nil)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}
