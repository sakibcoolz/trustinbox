# Business Flow: AI Bot Interaction & Human Handoff

## Overview

Service providers configure AI bots to handle initial customer interactions. Bots operate within policy-gated boundaries — every bot action is checked against the user's preferences and the bot's permission set. When a bot cannot resolve a query, it escalates to a human agent.

## Actors

- **Customer**: Initiates conversation or receives bot-initiated message
- **Bot Service**: Manages bot lifecycle and action execution
- **AI Service**: Provides LLM-powered responses, classification, and summarization
- **Policy Service**: Gates every bot action against user preferences
- **Communication Service**: Manages the conversation thread
- **Human Agent**: Receives escalated conversations

## Flow Steps

### Phase 1: Bot Configuration (SP Admin)

1. SP Admin creates bot via **Bots → New Bot** wizard:
   - **Name, description, avatar**: Bot identity
   - **Industry profile**: Pre-loads system prompt and persona from industry templates
   - **Tone**: Professional / Friendly / Formal / Casual
   - **Working hours**: When the bot is active (respects DND separately)
   - **Temperature**: LLM creativity setting (0.0–1.0)
   - **Escalation rules**: When to hand off to human (keywords, sentiment, failure count)
2. SP Admin configures **Tool Permissions**:
   - `lookup_account` — allowed/denied
   - `check_balance` — allowed/denied
   - `schedule_callback` — allowed/denied
   - `create_notification` — allowed/denied
   - `fetch_document` — allowed/denied
   - (10 total tools available)
3. SP Admin attaches **Knowledge Sources**:
   - Documents (PDF, DOCX)
   - URLs (crawled and indexed)
   - FAQ pairs (manual entry)
4. Bot status transitions: `DRAFT` → `ACTIVE`

### Phase 2: Customer Initiates Conversation

5. Customer opens conversation with SP via web app or provider-initiated message
6. Communication service routes to bot if:
   - SP has an active bot assigned
   - Bot is within working hours
   - User has not requested human-only communication
7. Bot sends greeting message using configured persona

### Phase 3: Bot Conversation Loop

8. Customer sends message
9. Bot service processes message:
   a. **Classification**: AI service categorizes intent (inquiry, complaint, request, etc.)
   b. **Knowledge lookup**: RAG pipeline searches knowledge sources for relevant context
   c. **LLM generation**: AI service generates response using system prompt + context + conversation history
   d. **Tool execution** (if needed):
      - Bot determines a tool call is needed (e.g., `lookup_account`)
      - **Permission check**: Is this tool allowed for this bot?
      - **Policy check**: Is this action allowed for this user? (DND, consent, etc.)
      - If both pass → execute tool → include result in response
      - If denied → bot explains it cannot perform the action
10. Bot sends response to customer
11. Action audit log entry created for every tool execution

### Phase 4: Escalation to Human Agent

12. Escalation triggers:
    - Customer explicitly requests human agent ("talk to a person")
    - Sentiment analysis detects frustration or anger
    - Bot fails to resolve after N attempts (configurable)
    - Bot encounters a query outside its knowledge base
    - Tool execution fails repeatedly
13. Bot service initiates handoff:
    - Generates conversation summary via AI service
    - Marks conversation as `escalated`
    - Notifies available human agents
14. Human agent receives:
    - Full conversation history
    - AI-generated summary
    - Customer context (virtual ID, relationship history, recent interactions)
15. Agent takes over the conversation — bot stops responding
16. Event published: `bot.escalated`

### Phase 5: Bot Analytics

17. Bot service tracks per-bot metrics:
    - Total conversations handled
    - Messages sent / received
    - Tool executions (success / denied / failed)
    - Escalation rate
    - Average conversation duration
    - Customer satisfaction (if feedback collected)
18. Analytics visible in **Bots → [Bot ID] → Analytics** dashboard

## Bot Statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Created but not active |
| `ACTIVE` | Live and handling conversations |
| `PAUSED` | Temporarily disabled |
| `ARCHIVED` | Permanently deactivated |

## Business Rules

- **Policy gating is mandatory**: Every bot action (tool execution, message send) is policy-checked
- **Tool permissions are strict**: A bot cannot use tools not explicitly allowed by the SP admin
- **DND respect**: Bot messages are blocked during user DND windows
- **Consent required**: Bot cannot initiate conversation with users who haven't consented
- **Knowledge sources are SP-scoped**: A bot can only access knowledge uploaded by its own SP
- **Escalation is irreversible**: Once escalated, the bot does not re-enter the conversation
- **Audit trail**: Every bot action, tool execution, and escalation is logged with timestamps and actor IDs

## Error Cases

- Bot not active → route to human agent directly
- LLM provider unavailable → graceful fallback message + escalate
- Tool execution timeout → log failure + inform customer + offer escalation
- Knowledge source empty → bot responds with generic message + escalate if repeated

## Events Published

| Event | Trigger |
|-------|---------|
| `bot.created` | New bot created |
| `bot.activated` | Bot set to ACTIVE |
| `bot.archived` | Bot permanently deactivated |
| `bot.action.executed` | Bot executes a tool action |
| `bot.escalated` | Conversation handed off to human |
| `message.sent` | Bot sends a message |
| `conversation.created` | New conversation started with bot |
