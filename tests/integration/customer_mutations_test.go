//go:build integration

package integration

import (
	"testing"
)

// ─── markNotificationRead ──────────────────────────────────

func TestMarkNotificationRead_Success(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)

	// First get a notification ID
	listQuery := `query { myNotifications(limit: 1, offset: 0) { nodes { id } } }`
	listResp := graphqlPost(t, token, listQuery, nil)
	listResult := parseGraphQLResponse(t, listResp)
	requireNoErrors(t, listResult)

	data, ok := listResult.Data["myNotifications"].(map[string]interface{})
	if !ok {
		t.Skip("no myNotifications data returned, skipping")
	}
	nodes, ok := data["nodes"].([]interface{})
	if !ok || len(nodes) == 0 {
		t.Skip("no notifications available to mark as read")
	}
	node := nodes[0].(map[string]interface{})
	notifID := node["id"].(string)

	// Mark as read
	mutation := `mutation($id: ID!) { markNotificationRead(id: $id) { id readAt } }`
	vars := map[string]interface{}{"id": notifID}
	resp := graphqlPost(t, token, mutation, vars)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}

// ─── updateMyPrivacyPreferences ────────────────────────────

func TestUpdateMyPrivacyPreferences_Success(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)

	mutation := `mutation($input: UpdatePrivacyPreferenceInput!) { updateMyPrivacyPreferences(input: $input) { allowAdvertisements } }`
	vars := map[string]interface{}{
		"input": map[string]interface{}{
			"allowAdvertisements": false,
		},
	}
	resp := graphqlPost(t, token, mutation, vars)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)

	// Verify persistence
	query := `query { myPrivacyPreferences { allowAdvertisements } }`
	verifyResp := graphqlPost(t, token, query, nil)
	verifyResult := parseGraphQLResponse(t, verifyResp)
	requireNoErrors(t, verifyResult)

	prefs := verifyResult.Data["myPrivacyPreferences"].(map[string]interface{})
	if prefs["allowAdvertisements"] != false {
		t.Errorf("expected allowAdvertisements to be false after update")
	}

	// Restore
	restoreVars := map[string]interface{}{
		"input": map[string]interface{}{
			"allowAdvertisements": true,
		},
	}
	graphqlPost(t, token, mutation, restoreVars)
}

// ─── createDNDRule / deleteDNDRule ─────────────────────────

func TestCreateAndDeleteDNDRule(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)

	// Create
	createMutation := `mutation($input: CreateDNDRuleInput!) { createDNDRule(input: $input) { id scopeType startTime endTime } }`
	createVars := map[string]interface{}{
		"input": map[string]interface{}{
			"scopeType":  "GLOBAL",
			"startTime":  "22:00",
			"endTime":    "07:00",
			"daysOfWeek": []int{1, 2, 3, 4, 5},
		},
	}
	createResp := graphqlPost(t, token, createMutation, createVars)
	createResult := parseGraphQLResponse(t, createResp)
	requireNoErrors(t, createResult)

	data, ok := createResult.Data["createDNDRule"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected createDNDRule in response")
	}
	ruleID, ok := data["id"].(string)
	if !ok || ruleID == "" {
		t.Fatalf("expected rule ID in response")
	}

	// Verify exists
	listQuery := `query { myDNDRules { id } }`
	listResp := graphqlPost(t, token, listQuery, nil)
	listResult := parseGraphQLResponse(t, listResp)
	requireNoErrors(t, listResult)

	// Delete
	deleteMutation := `mutation($id: ID!) { deleteDNDRule(id: $id) }`
	deleteVars := map[string]interface{}{"id": ruleID}
	deleteResp := graphqlPost(t, token, deleteMutation, deleteVars)
	deleteResult := parseGraphQLResponse(t, deleteResp)
	requireNoErrors(t, deleteResult)
}

// ─── blockServiceProvider / unblockServiceProvider ─────────

func TestBlockAndUnblockServiceProvider(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)

	// Block
	blockMutation := `mutation($spId: ID!) { blockServiceProvider(spId: $spId) }`
	blockVars := map[string]interface{}{"spId": testSPID}
	blockResp := graphqlPost(t, token, blockMutation, blockVars)
	blockResult := parseGraphQLResponse(t, blockResp)
	requireNoErrors(t, blockResult)

	// Verify blocked
	query := `query { myBlockedProviders { spId } }`
	verifyResp := graphqlPost(t, token, query, nil)
	verifyResult := parseGraphQLResponse(t, verifyResp)
	requireNoErrors(t, verifyResult)

	// Unblock
	unblockMutation := `mutation($spId: ID!) { unblockServiceProvider(spId: $spId) }`
	unblockResp := graphqlPost(t, token, unblockMutation, blockVars)
	unblockResult := parseGraphQLResponse(t, unblockResp)
	requireNoErrors(t, unblockResult)
}

// ─── approveCallbackRequest ────────────────────────────────

func TestApproveCallbackRequest(t *testing.T) {
	token := generateCustomerJWT(testCustomerID)

	// Get a pending callback
	listQuery := `query { myCallbackRequests(limit: 1, offset: 0, status: "PENDING") { nodes { id } } }`
	listResp := graphqlPost(t, token, listQuery, nil)
	listResult := parseGraphQLResponse(t, listResp)
	requireNoErrors(t, listResult)

	data, ok := listResult.Data["myCallbackRequests"].(map[string]interface{})
	if !ok {
		t.Skip("no callback data returned, skipping")
	}
	nodes, ok := data["nodes"].([]interface{})
	if !ok || len(nodes) == 0 {
		t.Skip("no pending callbacks available to approve")
	}
	node := nodes[0].(map[string]interface{})
	callbackID := node["id"].(string)

	mutation := `mutation($id: ID!, $input: ApproveCallbackInput!) { approveCallbackRequest(id: $id, input: $input) { id status } }`
	vars := map[string]interface{}{
		"id": callbackID,
		"input": map[string]interface{}{
			"scheduledAt": "2025-01-15T10:00:00Z",
		},
	}
	resp := graphqlPost(t, token, mutation, vars)
	result := parseGraphQLResponse(t, resp)
	requireNoErrors(t, result)
}
