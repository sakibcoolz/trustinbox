package rbac

// Permission represents a specific action that can be authorized.
type Permission string

// Platform permissions.
const (
	// Notification permissions
	PermNotificationCreate Permission = "notification.create"
	PermNotificationView   Permission = "notification.view"

	// Callback permissions
	PermCallbackCreate Permission = "callback.create"
	PermCallbackView   Permission = "callback.view"

	// Conversation permissions
	PermConversationCreate Permission = "conversation.create"
	PermConversationView   Permission = "conversation.view"

	// Document permissions
	PermDocumentUpload Permission = "document.upload"
	PermDocumentShare  Permission = "document.share"
	PermDocumentView   Permission = "document.view"

	// Campaign permissions
	PermCampaignCreate  Permission = "campaign.create"
	PermCampaignManage  Permission = "campaign.manage"
	PermCampaignView    Permission = "campaign.view"

	// Bot permissions
	PermBotCreate  Permission = "bot.create"
	PermBotManage  Permission = "bot.manage"
	PermBotView    Permission = "bot.view"

	// Analytics permissions
	PermAnalyticsView Permission = "analytics.view"

	// Compliance permissions
	PermComplianceView   Permission = "compliance.view"
	PermComplianceExport Permission = "compliance.export"

	// Team/Org management permissions
	PermTeamManage         Permission = "team.manage"
	PermTeamView           Permission = "team.view"
	PermOrgSettingsManage  Permission = "org.settings.manage"

	// Integration permissions
	PermIntegrationManage Permission = "integration.manage"
	PermIntegrationView   Permission = "integration.view"

	// Webhook permissions
	PermWebhookManage Permission = "webhook.manage"
	PermWebhookView   Permission = "webhook.view"

	// API key permissions
	PermAPIKeyManage Permission = "apikey.manage"
	PermAPIKeyView   Permission = "apikey.view"

	// Platform admin permissions
	PermPlatformAdmin Permission = "platform.admin"
)

// Role represents a user role within the platform.
type Role string

const (
	RolePlatformAdmin Role = "PLATFORM_ADMIN"
	RoleSPAdmin       Role = "SP_ADMIN"
	RoleAgent         Role = "AGENT"
	RoleAnalyst       Role = "ANALYST"
	RoleCustomer      Role = "CUSTOMER"
)

// rolePermissions maps roles to their granted permissions.
var rolePermissions = map[Role][]Permission{
	RolePlatformAdmin: {
		PermPlatformAdmin,
		PermNotificationCreate, PermNotificationView,
		PermCallbackCreate, PermCallbackView,
		PermConversationCreate, PermConversationView,
		PermDocumentUpload, PermDocumentShare, PermDocumentView,
		PermCampaignCreate, PermCampaignManage, PermCampaignView,
		PermBotCreate, PermBotManage, PermBotView,
		PermAnalyticsView,
		PermComplianceView, PermComplianceExport,
		PermTeamManage, PermTeamView,
		PermOrgSettingsManage,
		PermIntegrationManage, PermIntegrationView,
		PermWebhookManage, PermWebhookView,
		PermAPIKeyManage, PermAPIKeyView,
	},
	RoleSPAdmin: {
		PermNotificationCreate, PermNotificationView,
		PermCallbackCreate, PermCallbackView,
		PermConversationCreate, PermConversationView,
		PermDocumentUpload, PermDocumentShare, PermDocumentView,
		PermCampaignCreate, PermCampaignManage, PermCampaignView,
		PermBotCreate, PermBotManage, PermBotView,
		PermAnalyticsView,
		PermComplianceView, PermComplianceExport,
		PermTeamManage, PermTeamView,
		PermOrgSettingsManage,
		PermIntegrationManage, PermIntegrationView,
		PermWebhookManage, PermWebhookView,
		PermAPIKeyManage, PermAPIKeyView,
	},
	RoleAgent: {
		PermNotificationCreate, PermNotificationView,
		PermCallbackCreate, PermCallbackView,
		PermConversationCreate, PermConversationView,
		PermDocumentUpload, PermDocumentShare, PermDocumentView,
		PermCampaignView,
		PermBotView,
		PermAnalyticsView,
		PermComplianceView,
		PermTeamView,
	},
	RoleAnalyst: {
		PermNotificationView,
		PermCallbackView,
		PermConversationView,
		PermDocumentView,
		PermCampaignView,
		PermBotView,
		PermAnalyticsView,
		PermComplianceView, PermComplianceExport,
		PermTeamView,
	},
	RoleCustomer: {
		PermNotificationView,
		PermCallbackView,
		PermConversationView,
		PermDocumentView,
	},
}

// HasPermission checks if a role has a specific permission.
func HasPermission(role Role, perm Permission) bool {
	perms, ok := rolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == perm {
			return true
		}
	}
	return false
}

// GetPermissions returns all permissions for a role.
func GetPermissions(role Role) []Permission {
	perms, ok := rolePermissions[role]
	if !ok {
		return nil
	}
	result := make([]Permission, len(perms))
	copy(result, perms)
	return result
}

// Authorizer provides authorization checks.
type Authorizer struct{}

// NewAuthorizer creates a new authorizer.
func NewAuthorizer() *Authorizer {
	return &Authorizer{}
}

// Authorize checks if the given role has the required permission.
func (a *Authorizer) Authorize(role string, perm Permission) bool {
	return HasPermission(Role(role), perm)
}

// RequireAny checks if the role has any of the given permissions.
func (a *Authorizer) RequireAny(role string, perms ...Permission) bool {
	for _, perm := range perms {
		if HasPermission(Role(role), perm) {
			return true
		}
	}
	return false
}

// RequireAll checks if the role has all of the given permissions.
func (a *Authorizer) RequireAll(role string, perms ...Permission) bool {
	for _, perm := range perms {
		if !HasPermission(Role(role), perm) {
			return false
		}
	}
	return true
}
