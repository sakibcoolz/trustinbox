# 04 — Data Model (Entity-Relationship Diagram)

> PostgreSQL 16 schema — all tables, relationships, and key columns.

## Core Domain Model

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR full_name
        VARCHAR status "ACTIVE | SUSPENDED | DELETED"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    user_profiles {
        UUID id PK
        UUID user_id FK
        VARCHAR virtual_public_id UK "TI-xxxxxxxx"
        VARCHAR first_name
        VARCHAR last_name
        TEXT bio
        VARCHAR avatar_url
        VARCHAR timezone
        VARCHAR language
        VARCHAR job_title
        TIMESTAMPTZ created_at
    }

    privacy_preferences {
        UUID id PK
        UUID user_id FK
        BOOLEAN allow_personal_notifications
        BOOLEAN allow_sp_notifications
        BOOLEAN allow_advertisements
        BOOLEAN allow_callback_requests
        BOOLEAN allow_chat
        BOOLEAN allow_document_shares
        BOOLEAN require_call_approval
        TIMESTAMPTZ updated_at
    }

    dnd_rules {
        UUID id PK
        UUID user_id FK
        VARCHAR scope_type "GLOBAL | CATEGORY | SP"
        VARCHAR scope_value
        TIME start_time
        TIME end_time
        TEXT[] days_of_week
        BOOLEAN is_active
    }

    availability_slots {
        UUID id PK
        UUID user_id FK
        INT day_of_week "0-6"
        TIME start_time
        TIME end_time
        VARCHAR slot_type "CALLBACK | MEETING | ANY"
    }

    blocked_service_providers {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR reason
        TIMESTAMPTZ blocked_at
    }

    users ||--o| user_profiles : "has"
    users ||--o| privacy_preferences : "has"
    users ||--o{ dnd_rules : "has many"
    users ||--o{ availability_slots : "has many"
    users ||--o{ blocked_service_providers : "blocks"
```

## Service Provider Domain

```mermaid
erDiagram
    service_providers {
        UUID id PK
        UUID tenant_id FK
        VARCHAR name
        VARCHAR slug UK "o/slug"
        VARCHAR legal_name
        VARCHAR industry
        VARCHAR verification_status "PENDING | VERIFIED | REJECTED"
        VARCHAR status "ACTIVE | SUSPENDED"
        TEXT description
        VARCHAR logo_url
        VARCHAR website
        VARCHAR contact_email
        NUMERIC spam_score "0.00 - 10.00"
        TIMESTAMPTZ created_at
    }

    service_provider_users {
        UUID id PK
        UUID service_provider_id FK
        UUID user_id FK
        VARCHAR role "SP_ADMIN | AGENT | ANALYST"
        VARCHAR status "ACTIVE | INVITED | REMOVED"
        TIMESTAMPTZ joined_at
    }

    invitations {
        UUID id PK
        UUID service_provider_id FK
        UUID invited_by FK
        VARCHAR email
        VARCHAR role
        VARCHAR token_hash UK
        VARCHAR status "PENDING | ACCEPTED | REVOKED | EXPIRED"
        TIMESTAMPTZ expires_at
    }

    service_provider_verifications {
        UUID id PK
        UUID service_provider_id FK
        VARCHAR document_type
        VARCHAR document_url
        VARCHAR status
        VARCHAR reviewed_by
        TIMESTAMPTZ submitted_at
    }

    customer_sp_relations {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR relationship_type "CUSTOMER | SUBSCRIBER | LEAD | PROSPECT"
        NUMERIC trust_score
        TIMESTAMPTZ first_interaction
        TIMESTAMPTZ last_interaction
    }

    service_providers ||--o{ service_provider_users : "has team"
    service_providers ||--o{ invitations : "sends"
    service_providers ||--o{ service_provider_verifications : "submits"
    service_providers ||--o{ customer_sp_relations : "relates to"
    users ||--o{ customer_sp_relations : "interacts with"
    users ||--o{ service_provider_users : "belongs to"
```

## Notification & Campaign Domain

```mermaid
erDiagram
    notifications {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR category "PERSONAL | SERVICE_PROVIDER | ADVERTISEMENT"
        VARCHAR title
        TEXT body
        VARCHAR priority "LOW | NORMAL | HIGH | URGENT"
        VARCHAR status "QUEUED | SENT | DELIVERED | READ | ARCHIVED | REJECTED"
        VARCHAR rejection_reason
        JSONB metadata
        TIMESTAMPTZ created_at
        TIMESTAMPTZ read_at
    }

    notification_deliveries {
        UUID id PK
        UUID notification_id FK
        VARCHAR channel "PUSH | INBOX | EMAIL | SMS"
        VARCHAR status "PENDING | DELIVERED | FAILED"
        TIMESTAMPTZ delivered_at
        INT attempts
        TEXT error_message
    }

    campaigns {
        UUID id PK
        UUID service_provider_id FK
        UUID created_by_sp_user FK
        VARCHAR name
        VARCHAR category
        VARCHAR title
        TEXT body
        VARCHAR status "DRAFT | SCHEDULED | LAUNCHED | COMPLETED | CANCELLED"
        INT target_count
        INT sent_count
        INT delivered_count
        INT failed_count
        TIMESTAMPTZ scheduled_at
        TIMESTAMPTZ launched_at
    }

    campaign_targets {
        UUID id PK
        UUID campaign_id FK
        UUID user_id FK
        VARCHAR status "PENDING | SENT | DELIVERED | FAILED | POLICY_DENIED"
        UUID notification_id FK
        TIMESTAMPTZ processed_at
    }

    notifications ||--o{ notification_deliveries : "delivers via"
    campaigns ||--o{ campaign_targets : "targets"
    campaign_targets ||--o| notifications : "creates"
    service_providers ||--o{ notifications : "sends"
    service_providers ||--o{ campaigns : "runs"
    users ||--o{ notifications : "receives"
```

## Communication Domain

```mermaid
erDiagram
    callback_requests {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR reason
        TEXT details
        VARCHAR status "PENDING | APPROVED | REJECTED | RESCHEDULED | COMPLETED | EXPIRED"
        TIMESTAMPTZ requested_at
        TIMESTAMPTZ approved_slot_start
        TIMESTAMPTZ approved_slot_end
        VARCHAR rejection_reason
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ expires_at
    }

    conversations {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        UUID assigned_agent_id FK
        VARCHAR status "OPEN | CLOSED | ARCHIVED"
        VARCHAR subject
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ closed_at
    }

    messages {
        UUID id PK
        UUID conversation_id FK
        UUID sender_id
        VARCHAR sender_type "USER | SP_AGENT | SYSTEM | AI"
        VARCHAR message_type "TEXT | FILE | IMAGE | SYSTEM"
        TEXT content
        JSONB metadata
        TIMESTAMPTZ created_at
        TIMESTAMPTZ edited_at
    }

    spam_reports {
        UUID id PK
        UUID reporter_user_id FK
        UUID service_provider_id FK
        UUID notification_id FK
        VARCHAR reason
        TEXT details
        VARCHAR status "PENDING | REVIEWED | RESOLVED"
        TIMESTAMPTZ created_at
    }

    conversations ||--o{ messages : "contains"
    users ||--o{ callback_requests : "receives"
    users ||--o{ conversations : "participates"
    service_providers ||--o{ callback_requests : "requests"
    service_providers ||--o{ conversations : "participates"
    users ||--o{ spam_reports : "reports"
```

## Bot & AI Domain

```mermaid
erDiagram
    bots {
        UUID id PK
        UUID service_provider_id FK
        VARCHAR name
        TEXT purpose
        VARCHAR department
        VARCHAR status "DRAFT | ACTIVE | PAUSED | ARCHIVED"
        UUID industry_profile_id FK
        TIMESTAMPTZ created_at
    }

    bot_configurations {
        UUID id PK
        UUID bot_id FK
        VARCHAR tone "professional | casual | friendly"
        VARCHAR writing_style "concise | detailed | conversational"
        TEXT[] supported_languages
        INT[] working_days
        INT max_turns_before_escalation
        JSONB escalation_rules
        NUMERIC temperature "0.0 - 2.0"
        TEXT custom_system_prompt
    }

    bot_permissions {
        UUID id PK
        UUID bot_id FK
        VARCHAR tool_name
        BOOLEAN is_allowed
        JSONB constraints
    }

    bot_knowledge_sources {
        UUID id PK
        UUID bot_id FK
        VARCHAR source_type "URL | FILE | TEXT"
        VARCHAR source_url
        TEXT content
        VARCHAR status "PENDING | INDEXED | FAILED"
    }

    bot_action_logs {
        UUID id PK
        UUID bot_id FK
        UUID conversation_id FK
        UUID user_id FK
        VARCHAR action_type
        VARCHAR tool_name
        VARCHAR policy_decision "ALLOW | DENY"
        INT duration_ms
        JSONB input_data
        JSONB output_data
        TIMESTAMPTZ created_at
    }

    bot_analytics {
        UUID id PK
        UUID bot_id FK
        DATE date
        INT total_actions
        INT successful_actions
        INT escalations
        INT avg_response_time_ms
    }

    bots ||--|| bot_configurations : "configured by"
    bots ||--o{ bot_permissions : "has"
    bots ||--o{ bot_knowledge_sources : "learns from"
    bots ||--o{ bot_action_logs : "logs"
    bots ||--o{ bot_analytics : "tracked by"
    service_providers ||--o{ bots : "owns"
```

## Document & Webhook Domain

```mermaid
erDiagram
    documents {
        UUID id PK
        UUID service_provider_id FK
        UUID uploaded_by FK
        VARCHAR file_name
        VARCHAR content_type
        BIGINT file_size
        VARCHAR s3_key
        VARCHAR status "ACTIVE | ARCHIVED | DELETED"
        TIMESTAMPTZ created_at
    }

    document_shares {
        UUID id PK
        UUID document_id FK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR share_context
        TIMESTAMPTZ shared_at
        TIMESTAMPTZ expires_at
    }

    document_classifications {
        UUID id PK
        UUID document_id FK
        VARCHAR classification "STATEMENT | INVOICE | AGREEMENT | REPORT | OTHER"
        NUMERIC confidence
    }

    webhook_subscriptions {
        UUID id PK
        UUID service_provider_id FK
        VARCHAR url
        TEXT[] events
        VARCHAR secret_hash
        VARCHAR status "ACTIVE | PAUSED | DISABLED"
        INT failure_count
        TIMESTAMPTZ last_delivery_at
        JSONB custom_headers
    }

    webhook_deliveries {
        UUID id PK
        UUID subscription_id FK
        VARCHAR event_type
        JSONB payload
        VARCHAR status "PENDING | SUCCESS | FAILED"
        INT attempts
        INT response_status
        TEXT response_body
        TIMESTAMPTZ created_at
    }

    api_keys {
        UUID id PK
        UUID service_provider_id FK
        VARCHAR name
        VARCHAR key_hash UK
        VARCHAR key_prefix "ti_live_ | ti_test_"
        TEXT[] scopes
        INT rate_limit_per_minute
        TIMESTAMPTZ expires_at
        BOOLEAN is_active
    }

    documents ||--o{ document_shares : "shared via"
    documents ||--o{ document_classifications : "classified as"
    webhook_subscriptions ||--o{ webhook_deliveries : "delivers"
    service_providers ||--o{ documents : "uploads"
    service_providers ||--o{ webhook_subscriptions : "subscribes"
    service_providers ||--o{ api_keys : "has"
```

## Compliance & Analytics Domain

```mermaid
erDiagram
    policy_decision_logs {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR category
        VARCHAR communication_type
        BOOLEAN allowed
        VARCHAR decision_code
        TEXT reason
        TEXT[] applied_rules
        TIMESTAMPTZ evaluated_at
    }

    consent_records {
        UUID id PK
        UUID user_id FK
        UUID service_provider_id FK
        VARCHAR consent_type
        BOOLEAN granted
        TIMESTAMPTZ granted_at
        TIMESTAMPTZ revoked_at
    }

    analytics_daily {
        UUID id PK
        UUID service_provider_id FK
        DATE date
        INT notifications_sent
        INT notifications_delivered
        INT notifications_read
        INT callbacks_requested
        INT callbacks_approved
        INT callbacks_rejected
        INT messages_sent
        INT bot_actions
        INT policy_denials
    }

    audit_logs {
        UUID id PK
        UUID actor_id FK
        VARCHAR actor_type "USER | SP_USER | SYSTEM | PLATFORM_ADMIN"
        VARCHAR action
        VARCHAR entity_type
        UUID entity_id
        JSONB metadata
        VARCHAR ip_address
        TIMESTAMPTZ created_at
    }

    industry_profiles {
        UUID id PK
        VARCHAR industry_key UK
        VARCHAR display_name
        TEXT description
        JSONB default_reason_codes
        JSONB default_templates
        JSONB compliance_hints
        JSONB bot_prompt_pack
        JSONB dashboard_presets
        JSONB analytics_presets
    }

    tenants {
        UUID id PK
        VARCHAR name
        INT max_service_providers
        INT max_notifications_per_day
        JSONB features
        TIMESTAMPTZ created_at
    }

    service_providers ||--o{ policy_decision_logs : "logged for"
    service_providers ||--o{ analytics_daily : "tracked"
    tenants ||--o{ service_providers : "contains"
```
