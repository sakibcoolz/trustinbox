package entity

import "time"

// Category represents the type of communication.
type Category string

const (
	CategoryPersonal       Category = "PERSONAL"
	CategoryOrganizational Category = "ORGANIZATIONAL"
	CategoryAdvertisement  Category = "ADVERTISEMENT"
)

// Channel represents how communication is delivered.
type Channel string

const (
	ChannelPush     Channel = "PUSH"
	ChannelInbox    Channel = "INBOX"
	ChannelChat     Channel = "CHAT"
	ChannelCallback Channel = "CALLBACK"
	ChannelDocument Channel = "DOCUMENT"
)

// CommunicationType represents the kind of communication.
type CommunicationType string

const (
	CommTypeNotification  CommunicationType = "NOTIFICATION"
	CommTypeCallbackReq   CommunicationType = "CALLBACK_REQUEST"
	CommTypeChatMessage   CommunicationType = "CHAT_MESSAGE"
	CommTypeDocumentShare CommunicationType = "DOCUMENT_SHARE"
	CommTypeCampaign      CommunicationType = "CAMPAIGN"
)

// DecisionCode represents the outcome of a policy evaluation.
type DecisionCode string

const (
	DecisionAllowStandard           DecisionCode = "ALLOW_STANDARD"
	DecisionDenyUserNotFound        DecisionCode = "DENY_USER_NOT_FOUND"
	DecisionDenyOrgNotVerified      DecisionCode = "DENY_ORG_NOT_VERIFIED"
	DecisionDenyUserBlockedOrg      DecisionCode = "DENY_USER_BLOCKED_ORG"
	DecisionDenyCategoryDisabled    DecisionCode = "DENY_CATEGORY_DISABLED"
	DecisionDenyDNDActive           DecisionCode = "DENY_DND_ACTIVE"
	DecisionDenyOutsideAvailability DecisionCode = "DENY_OUTSIDE_AVAILABILITY"
	DecisionDenyAdCapExceeded       DecisionCode = "DENY_AD_CAP_EXCEEDED"
	DecisionDenyOrgSuspended        DecisionCode = "DENY_ORG_SUSPENDED"
	DecisionDenySpamScoreHigh       DecisionCode = "DENY_SPAM_SCORE_HIGH"
	DecisionRequireCallbackApproval DecisionCode = "REQUIRE_CALLBACK_APPROVAL"
	DecisionSuggestNextSlot         DecisionCode = "SUGGEST_NEXT_AVAILABLE_SLOT"
)

// EvaluationRequest contains all inputs for policy evaluation.
type EvaluationRequest struct {
	UserID            string
	OrganizationID    string
	Category          Category
	Channel           Channel
	CommunicationType CommunicationType
	ScheduledTime     time.Time
}

// EvaluationResult contains the outcome of policy evaluation.
type EvaluationResult struct {
	Allowed         bool
	DecisionCode    DecisionCode
	Reason          string
	AppliedRules    []string
	NextAvailableAt *time.Time
}

// UserPreferences represents privacy settings.
type UserPreferences struct {
	UserID                     string
	AllowPersonalNotifications bool
	AllowOrgNotifications      bool
	AllowAdvertisements        bool
	AllowCallbackRequests      bool
	AllowChat                  bool
	AllowDocumentShares        bool
	RequireCallApproval        bool
}

// DNDRule represents a Do Not Disturb rule.
type DNDRule struct {
	ID         string
	UserID     string
	ScopeType  string // GLOBAL, CATEGORY, ORGANIZATION
	ScopeRefID string
	StartTime  string // HH:MM
	EndTime    string // HH:MM
	DaysOfWeek []int
	IsActive   bool
}

// AvailabilitySlot represents a time slot when user is available.
type AvailabilitySlot struct {
	ID        string
	UserID    string
	DayOfWeek int
	StartTime string // HH:MM
	EndTime   string // HH:MM
	SlotType  string
	IsActive  bool
}

// OrganizationStatus represents org verification state.
type OrganizationStatus struct {
	OrganizationID     string
	VerificationStatus string
	Status             string
	SpamScore          float64
}
