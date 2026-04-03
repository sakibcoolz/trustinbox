# Business Flow: Privacy Preferences and DND Management

## Overview

TrustInbox puts users in complete control of their communication preferences. Users configure which categories of communication they accept, set Do Not Disturb (DND) windows, manage availability slots for callbacks, and maintain a block list of unwanted service providers. These preferences are the primary input to the policy engine.

## Actors

- **Customer**: Configures their privacy preferences
- **User Service**: Stores and serves preference data
- **Policy Service**: Reads preferences during evaluation
- **Any SP**: Affected by customer's preference settings

## Flow Steps

### Phase 1: Privacy Preferences Setup

1. Customer navigates to **Settings** in the web app
2. **Communication Category Controls** (7 toggles):

| Toggle | Default | Effect |
|--------|---------|--------|
| Allow Personal Notifications | ON | Receive personal messages from contacts |
| Allow SP Notifications | ON | Receive service provider notifications |
| Allow Advertisements | OFF | Receive promotional content (opt-in) |
| Allow Callbacks | ON | Receive callback requests |
| Require Callback Approval | ON | All callbacks need explicit approval |
| Allow Document Sharing | ON | Receive shared documents |
| Allow Bot Conversations | ON | Allow AI bot interactions |

3. Changes saved via GraphQL mutation to user-service
4. Policy service reads these preferences on every evaluation

### Phase 2: DND Rule Management

5. Customer opens **DND Rules** section
6. Creates DND rules with:
   - **Name**: Label for the rule (e.g., "Night Quiet Hours")
   - **Start time**: e.g., 22:00
   - **End time**: e.g., 07:00
   - **Days**: Select days of the week (multi-select)
   - **Category scope**: Apply to all categories or specific ones
7. DND rules support overnight windows:
   - Start 22:00, End 07:00 means "from 10 PM tonight to 7 AM tomorrow"
   - System correctly handles the day boundary crossing
8. Multiple DND rules can overlap (any active rule blocks communication)
9. CRUD operations: Create, Edit, Delete DND rules

### Phase 3: Availability Slots (Callbacks)

10. Customer opens **Availability** section
11. Sets weekly availability slots:
    - Day of week + time range (e.g., Monday 10:00-12:00, Wednesday 14:00-16:00)
    - Displayed to SPs when requesting callbacks
12. If RequireCallbackApproval is ON:
    - SPs see available slots and request a specific slot
    - Customer approves or suggests alternative
13. If RequireCallbackApproval is OFF:
    - SPs can book available slots directly
    - Customer still receives notification of scheduled callback

### Phase 4: Block List Management

14. Customer can block SPs from:
    - Notification detail (block after receiving unwanted notification)
    - SP profile page (preemptive block)
    - Conversation thread (block mid-conversation)
    - Settings block list page
15. When an SP is blocked:
    - All communications from that SP are auto-denied by policy
    - Existing conversations are marked as `BLOCKED`
    - SP receives generic "communication not allowed" response
    - SP does NOT know they are specifically blocked (privacy)
16. Customer can unblock SPs from the Settings block list

### Phase 5: SP Directory Preferences

17. Customer can browse the verified SP directory
18. For each SP, customer can:
    - View SP profile (industry, trust score, verification status)
    - View relationship history (past notifications, callbacks, conversations)
    - Block/unblock the SP
    - Customize category preferences per SP (override global defaults)

## Preference Hierarchy

```
Global Default Preferences
    |
    v
Per-SP Override (if set)
    |
    v
DND Rules (time-based override)
    |
    v
Block List (absolute deny)
```

- Block list always wins (cannot be overridden)
- DND rules override category allows
- Per-SP overrides take precedence over global defaults
- Global defaults apply when no overrides exist

## Data Model

```
privacy_preferences
  user_id (FK, PK)
  allow_personal_notifications (BOOLEAN, default true)
  allow_sp_notifications (BOOLEAN, default true)
  allow_advertisements (BOOLEAN, default false)
  allow_callbacks (BOOLEAN, default true)
  require_callback_approval (BOOLEAN, default true)
  allow_document_sharing (BOOLEAN, default true)
  allow_bot_conversations (BOOLEAN, default true)
  updated_at (TIMESTAMPTZ)

dnd_rules
  id (UUID)
  user_id (FK)
  name (VARCHAR)
  start_time (TIME)
  end_time (TIME)
  days (TEXT[])
  category_scope (TEXT[], nullable)  -- null means all categories
  is_active (BOOLEAN)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)

availability_slots
  id (UUID)
  user_id (FK)
  day_of_week (VARCHAR)
  start_time (TIME)
  end_time (TIME)
  is_active (BOOLEAN)
  created_at (TIMESTAMPTZ)

blocked_providers
  id (UUID)
  user_id (FK)
  service_provider_id (FK)
  reason (VARCHAR, nullable)
  blocked_at (TIMESTAMPTZ)
```

## Business Rules

- **Advertisements are opt-in**: Default is OFF; users must explicitly enable
- **Callback approval default**: ON for all new users (safety-first)
- **DND overnight handling**: System correctly handles windows crossing midnight
- **Block is private**: SPs are never told they are specifically blocked
- **Unblock is immediate**: Unblocking an SP immediately allows communication
- **Per-SP overrides**: Users can be more permissive or restrictive per SP
- **Multiple DND rules**: Any active rule blocks -- they OR together
- **Availability display**: SPs see available slots but not unavailable ones
- **Preference changes are real-time**: Policy uses latest preferences on every evaluation

## Events Published

| Event | Trigger |
|-------|---------|
| `consent.granted` | User enables a communication category |
| `consent.revoked` | User disables a communication category |
| `dnd.rule.created` | New DND rule created |
| `dnd.rule.updated` | DND rule modified |
| `dnd.rule.deleted` | DND rule removed |
| `customer.blocked` | User blocks an SP |
| `customer.unblocked` | User unblocks an SP |
| `availability.updated` | User updates callback availability |
