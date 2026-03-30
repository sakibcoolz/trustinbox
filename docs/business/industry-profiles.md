# Industry Profiles

TrustInbox supports industry-specific workflow customization through configurable profiles. Each profile provides sensible defaults for communication patterns, compliance requirements, and bot behavior tailored to a specific vertical.

## Overview

Industry profiles are managed by the industry-service (port 50058) and stored in PostgreSQL as JSONB-backed records. Service providers select an industry profile during onboarding, which pre-configures their notification templates, callback workflows, document types, and bot behavior.

## Schema

Each profile contains the following configuration domains:

| Field | Type | Description |
|-------|------|-------------|
| `industry_key` | string | Unique identifier (e.g., `banking_finance`) |
| `display_name` | string | Human-readable name |
| `default_reason_codes` | JSONB | Pre-defined notification/callback reason codes |
| `default_templates` | JSONB | Message templates with placeholders |
| `default_categories` | text[] | Applicable communication categories |
| `compliance_hints` | JSONB | Regulatory guidance and data handling rules |
| `document_types` | JSONB | Supported document categories |
| `callback_workflows` | JSONB | Callback approval rules, limits, and scheduling |
| `bot_prompt_pack` | JSONB | System prompt, persona, and behavioral guardrails |
| `dashboard_presets` | JSONB | Default analytics dashboard widgets |
| `analytics_presets` | JSONB | Pre-configured analytics queries and KPIs |

## Seeded Profiles

### 1. Banking & Finance

**Key:** `banking_finance`

**Reason Codes:**
`ACCOUNT_UPDATE`, `TRANSACTION_ALERT`, `KYC_REMINDER`, `LOAN_UPDATE`, `PAYMENT_DUE`, `INVESTMENT_UPDATE`, `CREDIT_SCORE_CHANGE`, `CARD_TRANSACTION`

**Templates:**
- Transaction alert: `"Dear {{customer_name}}, a transaction of {{amount}} was made on your account {{account_number}}. Current balance: {{balance}}."`
- KYC reminder: `"Your KYC documents are due for renewal by {{due_date}}. Please update your documents to avoid service interruption."`
- EMI due: `"Your EMI of {{amount}} for loan {{loan_id}} is due on {{due_date}}. Please ensure sufficient balance."`

**Compliance:**
- RBI compliance required
- Data localization: India
- PII encryption: mandatory
- Audit retention: 365 days
- Transaction logging: required

**Document Types:**
Account statement, Loan agreement, KYC document, Tax certificate, Insurance policy

**Callback Rules:**
- Require approval: Yes
- Max per day: 3
- Business hours only: 09:00–18:00
- Urgent override: allowed (for fraud alerts)

**Bot Persona:**
> "You are a professional banking assistant. Always verify customer identity before discussing account details. Never share sensitive financial information without proper authentication. Maintain formal, trustworthy communication."

---

### 2. Healthcare

**Key:** `healthcare`

**Reason Codes:**
`APPOINTMENT_REMINDER`, `TEST_RESULT`, `PRESCRIPTION_UPDATE`, `FOLLOW_UP`, `VACCINATION_DUE`, `INSURANCE_CLAIM`, `HEALTH_TIP`, `EMERGENCY_ALERT`

**Templates:**
- Appointment: `"Reminder: Your appointment with Dr. {{doctor_name}} is scheduled for {{date}} at {{time}}. Location: {{clinic_address}}."`
- Test result: `"Your lab results for {{test_name}} are ready. Please visit {{portal_url}} or contact your physician."`
- Follow-up: `"Dr. {{doctor_name}} has recommended a follow-up visit. Please schedule within {{days}} days."`

**Compliance:**
- HIPAA-like protections
- PII sensitivity: HIGH
- Audit retention: 730 days (2 years)
- Guardian consent: required for minors
- Data sharing: strictly with authorized providers only

**Document Types:**
Lab report, Prescription, Medical record, Insurance claim, Vaccination certificate

**Callback Rules:**
- Require approval: Yes
- Max per day: 5
- Business hours: 24/7 (healthcare operates round the clock)
- Urgent override: allowed (critical test results)

**Bot Persona:**
> "You are a healthcare support assistant. Never provide medical advice or diagnoses. Always recommend consulting a physician for medical concerns. Handle appointment scheduling and general inquiries. Be empathetic and professional."

---

### 3. Real Estate

**Key:** `real_estate`

**Reason Codes:**
`SITE_VISIT`, `PAYMENT_MILESTONE`, `PROJECT_UPDATE`, `HANDOVER`, `MAINTENANCE`, `DOCUMENT_READY`, `POSSESSION_UPDATE`, `RERA_UPDATE`

**Templates:**
- Site visit: `"Your site visit to {{project_name}} is confirmed for {{date}} at {{time}}. Address: {{address}}. Contact: {{agent_name}}."`
- Payment milestone: `"Payment of {{amount}} for {{project_name}} unit {{unit_number}} is due by {{due_date}}."`
- Handover: `"Congratulations! Your unit {{unit_number}} at {{project_name}} is ready for handover on {{date}}."`

**Compliance:**
- RERA compliance required
- Agreement tracking: mandatory
- Document retention: project lifecycle + 5 years

**Document Types:**
Site plan, Sale agreement, Payment receipt, RERA certificate, Possession letter

**Callback Rules:**
- Require approval: Yes
- Max per day: 3
- Business hours only: 09:00–19:00
- Urgent override: not allowed

**Bot Persona:**
> "You are a real estate assistant. Provide factual information about projects, units, and timelines only. Never make false promises about returns or appreciation. Direct pricing discussions to authorized sales personnel."

---

### 4. Hospitality & Food

**Key:** `hospitality_food`

**Reason Codes:**
`BOOKING_CONFIRMATION`, `CHECK_IN_REMINDER`, `ORDER_UPDATE`, `PROMO_OFFER`, `FEEDBACK_REQUEST`, `LOYALTY_UPDATE`, `MENU_UPDATE`, `EVENT_INVITATION`

**Templates:**
- Booking: `"Your reservation at {{venue_name}} is confirmed for {{date}} at {{time}}. Booking ID: {{booking_id}}."`
- Order update: `"Your order #{{order_id}} is {{status}}. Estimated delivery: {{eta}}."`
- Loyalty: `"You've earned {{points}} loyalty points! Total balance: {{total_points}}. Redeem at {{redeem_url}}."`

**Compliance:**
- FSSAI compliance (food safety)
- Booking data retention: 180 days
- Promotional opt-in required

**Document Types:**
Invoice, Booking confirmation, Membership card, Tax receipt

**Callback Rules:**
- Require approval: No (low-friction industry)
- Max per day: 3
- Business hours only: 08:00–22:00
- Urgent override: not applicable

**Bot Persona:**
> "You are a warm, service-oriented hospitality assistant. Help with bookings, reservations, and order inquiries. Be friendly and proactive about recommendations. Handle complaints with empathy and escalate to management when needed."

---

### 5. Logistics & Shipping

**Key:** `logistics_shipping`

**Reason Codes:**
`SHIPMENT_CREATED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CUSTOMS_HOLD`, `DELAY_NOTIFICATION`, `RETURN_INITIATED`, `PICKUP_SCHEDULED`

**Templates:**
- Shipment: `"Your shipment {{tracking_id}} has been dispatched. Track at {{tracking_url}}."`
- Delivery: `"Your package {{tracking_id}} is out for delivery. Expected by {{eta}}."`
- Customs: `"Shipment {{tracking_id}} is on customs hold. Reason: {{reason}}. Required action: {{action}}."`

**Compliance:**
- Customs compliance for international shipments
- GST tracking: required
- Proof of delivery: mandatory
- Data retention: 365 days

**Document Types:**
Airway bill, Customs declaration, Delivery receipt, Invoice, GST certificate

**Callback Rules:**
- Require approval: No
- Max per day: 5
- Business hours: 24/7 (logistics operates round the clock)
- Urgent override: enabled (customs/delivery issues)

**Bot Persona:**
> "You are a logistics support assistant. Be precise with tracking information, dates, and locations. Provide accurate ETAs based on available data. For delivery issues, collect details and escalate efficiently. Maintain a professional, efficient tone."

## Extending Profiles

New industry profiles can be added without schema migrations:

1. Insert a new row into `industry_profiles` with the appropriate JSONB configuration
2. Set `is_active = true` to make it available for SP onboarding
3. The industry-service exposes CRUD operations for platform admins

The JSONB structure allows adding new configuration fields without altering the table schema, making the system extensible for future verticals (insurance, recruitment, utilities, education, etc.).

## Integration Points

- **Onboarding**: SP selects industry profile → defaults pre-populate their configuration
- **Policy Service**: Compliance hints inform policy evaluation rules
- **Bot Service**: `bot_prompt_pack` provides the system prompt and behavioral guardrails
- **Notification Service**: Templates and reason codes are available for notification creation
- **Analytics Service**: Dashboard and analytics presets configure the provider portal
