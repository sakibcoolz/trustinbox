package entity

import "time"

type UserProfile struct {
	UserID    string
	FullName  string
	AvatarURL string
	Timezone  string
	Language  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UserIdentity struct {
	ID              string
	UserID          string
	VirtualPublicID string
	MaskedPhone     string
	IsActive        bool
	CreatedAt       time.Time
}

type PrivacyPreference struct {
	UserID                     string
	AllowPersonalNotifications bool
	AllowOrgNotifications      bool
	AllowAdvertisements        bool
	AllowCallbackRequests      bool
	AllowChat                  bool
	AllowDocumentShares        bool
	RequireCallApproval        bool
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
}

type DNDRule struct {
	ID         string
	UserID     string
	ScopeType  string // GLOBAL, CATEGORY, SERVICE_PROVIDER
	ScopeRefID string
	StartTime  string // HH:MM
	EndTime    string // HH:MM
	DaysOfWeek []int
	IsActive   bool
	CreatedAt  time.Time
}

type AvailabilitySlot struct {
	ID        string
	UserID    string
	DayOfWeek int
	StartTime string // HH:MM
	EndTime   string // HH:MM
	SlotType  string // GENERAL, CALLBACK, CHAT
	IsActive  bool
	CreatedAt time.Time
}

type BlockedServiceProvider struct {
	ID                string
	UserID            string
	ServiceProviderID string
	Reason            string
	CreatedAt         time.Time
}
