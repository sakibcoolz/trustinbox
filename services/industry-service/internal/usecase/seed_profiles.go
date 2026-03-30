package usecase

import (
	"context"

	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/industry-service/internal/domain/entity"
)

// seedProfiles contains the default industry profiles that ship with the platform.
// These match the seed data in migration 011_industry_profiles.
var seedProfiles = []*entity.IndustryProfile{
	{
		IndustryKey: "banking_finance",
		DisplayName: "Banking & Finance",
		Description: "Banks, NBFCs, small finance companies, insurance, mutual funds",
		DefaultReasonCodes: `[{"code":"ACCOUNT_UPDATE","label":"Account Update"},{"code":"TRANSACTION_ALERT","label":"Transaction Alert"},{"code":"KYC_REMINDER","label":"KYC Reminder"},{"code":"LOAN_UPDATE","label":"Loan Update"},{"code":"PAYMENT_DUE","label":"Payment Due"},{"code":"STATEMENT_READY","label":"Statement Ready"},{"code":"CARD_ACTIVITY","label":"Card Activity"},{"code":"OFFER","label":"Promotional Offer"}]`,
		DefaultTemplates: `[{"name":"Transaction Alert","body":"Dear Customer, a transaction of {{amount}} was {{type}} on your account ending {{last4}}. Available balance: {{balance}}.","category":"ORGANIZATIONAL"},{"name":"KYC Reminder","body":"Your KYC documents are due for renewal. Please update by {{deadline}} to avoid service disruption.","category":"ORGANIZATIONAL"},{"name":"EMI Due","body":"Your EMI of {{amount}} for {{loan_type}} is due on {{date}}. Please ensure sufficient balance.","category":"ORGANIZATIONAL"}]`,
		DefaultCategories: []string{"ORGANIZATIONAL", "PERSONAL"},
		ComplianceHints:   `{"rbi_compliance":true,"data_localization":"india","pii_encryption":true,"audit_retention_days":365,"consent_mandatory":true}`,
		DocumentTypes:     `[{"type":"ACCOUNT_STATEMENT","label":"Account Statement"},{"type":"LOAN_AGREEMENT","label":"Loan Agreement"},{"type":"KYC_DOCUMENT","label":"KYC Document"},{"type":"TAX_CERTIFICATE","label":"Tax Certificate"},{"type":"INSURANCE_POLICY","label":"Insurance Policy"}]`,
		CallbackWorkflows: `{"require_approval":true,"max_callbacks_per_day":3,"business_hours_only":true,"allow_urgent_override":true}`,
		BotPromptPack:     `{"system_prompt":"You are a professional banking assistant. Always verify customer identity before discussing account details. Never share sensitive financial data in plain text. Comply with RBI guidelines.","tone":"formal","industry_context":"banking_and_finance"}`,
		IsActive:          true,
	},
	{
		IndustryKey: "healthcare",
		DisplayName: "Healthcare",
		Description: "Hospitals, clinics, diagnostic labs, pharmacies, telemedicine",
		DefaultReasonCodes: `[{"code":"APPOINTMENT_REMINDER","label":"Appointment Reminder"},{"code":"TEST_RESULT","label":"Test Result Ready"},{"code":"PRESCRIPTION_UPDATE","label":"Prescription Update"},{"code":"HEALTH_TIP","label":"Health Tip"},{"code":"BILLING","label":"Billing Notification"},{"code":"FOLLOW_UP","label":"Follow-up Reminder"}]`,
		DefaultTemplates: `[{"name":"Appointment Reminder","body":"Reminder: Your appointment with Dr. {{doctor}} is scheduled for {{date}} at {{time}}. Location: {{location}}.","category":"ORGANIZATIONAL"},{"name":"Test Results","body":"Your test results for {{test_name}} are now available. Please log in to view or contact your physician.","category":"PERSONAL"},{"name":"Prescription Ready","body":"Your prescription is ready for pickup at {{pharmacy}}. Reference: {{ref_id}}.","category":"ORGANIZATIONAL"}]`,
		DefaultCategories: []string{"ORGANIZATIONAL", "PERSONAL"},
		ComplianceHints:   `{"hipaa_like_compliance":true,"pii_encryption":true,"data_sensitivity":"high","audit_retention_days":730,"consent_mandatory":true,"minor_consent":"guardian_required"}`,
		DocumentTypes:     `[{"type":"PRESCRIPTION","label":"Prescription"},{"type":"LAB_REPORT","label":"Lab Report"},{"type":"DISCHARGE_SUMMARY","label":"Discharge Summary"},{"type":"INSURANCE_CLAIM","label":"Insurance Claim"},{"type":"MEDICAL_CERTIFICATE","label":"Medical Certificate"}]`,
		CallbackWorkflows: `{"require_approval":true,"max_callbacks_per_day":5,"business_hours_only":false,"allow_urgent_override":true,"urgent_for_critical_results":true}`,
		BotPromptPack:     `{"system_prompt":"You are a healthcare communication assistant. Never provide medical advice or diagnosis. Always recommend consulting a physician for medical concerns. Protect patient privacy at all times.","tone":"empathetic_professional","industry_context":"healthcare"}`,
		IsActive:          true,
	},
	{
		IndustryKey: "real_estate",
		DisplayName: "Real Estate",
		Description: "Developers, brokers, property management, construction",
		DefaultReasonCodes: `[{"code":"SITE_VISIT","label":"Site Visit Scheduled"},{"code":"PAYMENT_MILESTONE","label":"Payment Milestone"},{"code":"PROJECT_UPDATE","label":"Project Update"},{"code":"DOCUMENT_READY","label":"Document Ready"},{"code":"HANDOVER","label":"Handover Notice"},{"code":"OFFER","label":"New Property Listing"}]`,
		DefaultTemplates: `[{"name":"Site Visit","body":"Your site visit for {{property_name}} is confirmed for {{date}} at {{time}}. Location: {{address}}. Contact: {{agent_name}}.","category":"ORGANIZATIONAL"},{"name":"Payment Milestone","body":"Payment milestone for {{property_name}}: {{milestone_name}} of {{amount}} is due by {{date}}.","category":"ORGANIZATIONAL"},{"name":"New Listing","body":"New property matching your preferences: {{property_name}} in {{location}} at {{price}}. Interested?","category":"ADVERTISEMENT"}]`,
		DefaultCategories: []string{"ORGANIZATIONAL", "ADVERTISEMENT"},
		ComplianceHints:   `{"rera_compliance":true,"agreement_tracking":true,"audit_retention_days":365}`,
		DocumentTypes:     `[{"type":"SITE_PLAN","label":"Site Plan"},{"type":"AGREEMENT","label":"Sale Agreement"},{"type":"PAYMENT_RECEIPT","label":"Payment Receipt"},{"type":"RERA_CERTIFICATE","label":"RERA Certificate"},{"type":"POSSESSION_LETTER","label":"Possession Letter"}]`,
		CallbackWorkflows: `{"require_approval":true,"max_callbacks_per_day":2,"business_hours_only":true}`,
		BotPromptPack:     `{"system_prompt":"You are a real estate communication assistant. Provide factual property information only. Never make false promises about returns or timelines. Comply with RERA regulations.","tone":"professional_friendly","industry_context":"real_estate"}`,
		IsActive:          true,
	},
	{
		IndustryKey: "hospitality_food",
		DisplayName: "Hospitality & Food",
		Description: "Hotels, restaurants, catering, food delivery, travel",
		DefaultReasonCodes: `[{"code":"BOOKING_CONFIRMATION","label":"Booking Confirmation"},{"code":"CHECK_IN_REMINDER","label":"Check-in Reminder"},{"code":"ORDER_UPDATE","label":"Order Update"},{"code":"PROMO_OFFER","label":"Promotional Offer"},{"code":"REVIEW_REQUEST","label":"Review Request"},{"code":"LOYALTY_UPDATE","label":"Loyalty Update"}]`,
		DefaultTemplates: `[{"name":"Booking Confirmed","body":"Your booking at {{venue}} is confirmed for {{date}}. Booking ID: {{booking_id}}. Check-in: {{time}}.","category":"ORGANIZATIONAL"},{"name":"Order Status","body":"Your order #{{order_id}} is {{status}}. Estimated delivery: {{eta}}.","category":"ORGANIZATIONAL"},{"name":"Special Offer","body":"Exclusive offer: {{offer_description}} at {{venue}}. Valid till {{expiry}}. Use code: {{code}}.","category":"ADVERTISEMENT"}]`,
		DefaultCategories: []string{"ORGANIZATIONAL", "ADVERTISEMENT"},
		ComplianceHints:   `{"fssai_compliance":true,"booking_data_retention_days":180}`,
		DocumentTypes:     `[{"type":"INVOICE","label":"Invoice"},{"type":"BOOKING_VOUCHER","label":"Booking Voucher"},{"type":"MENU","label":"Menu Card"},{"type":"LOYALTY_CARD","label":"Loyalty Card"}]`,
		CallbackWorkflows: `{"require_approval":false,"max_callbacks_per_day":3,"business_hours_only":true}`,
		BotPromptPack:     `{"system_prompt":"You are a hospitality assistant. Be warm, helpful, and service-oriented. Help with bookings, orders, and general inquiries. Never share other guests information.","tone":"warm_professional","industry_context":"hospitality_food"}`,
		IsActive:          true,
	},
	{
		IndustryKey: "logistics_shipping",
		DisplayName: "Logistics & Shipping",
		Description: "Courier, freight, warehousing, import-export, supply chain",
		DefaultReasonCodes: `[{"code":"SHIPMENT_CREATED","label":"Shipment Created"},{"code":"IN_TRANSIT","label":"In Transit"},{"code":"OUT_FOR_DELIVERY","label":"Out for Delivery"},{"code":"DELIVERED","label":"Delivered"},{"code":"CUSTOMS_HOLD","label":"Customs Hold"},{"code":"DELAY_NOTICE","label":"Delay Notice"}]`,
		DefaultTemplates: `[{"name":"Shipment Update","body":"Shipment {{tracking_id}} status: {{status}}. Location: {{location}}. ETA: {{eta}}.","category":"ORGANIZATIONAL"},{"name":"Delivery Attempt","body":"Delivery attempt for {{tracking_id}} at {{address}}. Please ensure availability. Rescheduling available.","category":"ORGANIZATIONAL"},{"name":"Customs Update","body":"Your shipment {{tracking_id}} is held at customs. Action needed: {{action_required}}.","category":"ORGANIZATIONAL"}]`,
		DefaultCategories: []string{"ORGANIZATIONAL"},
		ComplianceHints:   `{"customs_compliance":true,"gst_tracking":true,"audit_retention_days":365}`,
		DocumentTypes:     `[{"type":"BILL_OF_LADING","label":"Bill of Lading"},{"type":"CUSTOMS_DECLARATION","label":"Customs Declaration"},{"type":"DELIVERY_RECEIPT","label":"Delivery Receipt"},{"type":"INVOICE","label":"Invoice"},{"type":"PACKING_LIST","label":"Packing List"}]`,
		CallbackWorkflows: `{"require_approval":false,"max_callbacks_per_day":5,"business_hours_only":false,"allow_urgent_override":true}`,
		BotPromptPack:     `{"system_prompt":"You are a logistics support assistant. Provide shipment tracking updates and help with delivery scheduling. Be precise with dates and tracking information.","tone":"efficient_professional","industry_context":"logistics_shipping"}`,
		IsActive:          true,
	},
}

// GetSeedProfiles returns the default industry profiles that ship with the platform.
// These are hardcoded profiles matching the database seed migration and can be used
// for initial setup, resetting to defaults, or displaying available industry templates.
func (uc *IndustryProfileUseCase) GetSeedProfiles(ctx context.Context) []*entity.IndustryProfile {
	_, span := tracing.StartSpan(ctx, "industry-service", "IndustryProfileUseCase.GetSeedProfiles")
	defer span.End()

	result := make([]*entity.IndustryProfile, len(seedProfiles))
	for i, p := range seedProfiles {
		cp := *p
		cp.DefaultCategories = make([]string, len(p.DefaultCategories))
		copy(cp.DefaultCategories, p.DefaultCategories)
		result[i] = &cp
	}
	return result
}
