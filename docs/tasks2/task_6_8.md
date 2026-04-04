# Task 6.8 — Bot Interaction E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete bot lifecycle: Provider configures bot → Deploys → Customer triggers bot interaction → Bot responds via AI service → Policy-denied actions logged → Escalation to human agent works → Bot responses appear in conversation.
> **Type**: Integration test scenario validating the bot pipeline across bot-service, ai-service, policy-service, and the conversation layer.

---

## Objective

Verify that a bot configured in the Provider Portal can be deployed, interact with customers through conversations, execute AI-powered actions with policy gating, escalate to human agents when needed, and that all interactions are tracked and auditable.

---

## Architecture Flow

```
Provider Portal (/bots/new)
  └─ 5-step wizard: Details → Configuration → Permissions → Knowledge → Review
  └─ POST /api/bots (create)
       └─ Gateway → gRPC → bot-service (:50059)
            ├─ botRepo.Create() → PostgreSQL (status: DRAFT)
            ├─ configRepo.Create() → default configuration
            ├─ permRepo.SetPermissions() → tool permissions
            └─ sourceRepo.Add() → knowledge sources

Provider Portal (/bots/{id}) → Deploy
  └─ POST /api/bots/{id}/deploy
       └─ bot-service: status DRAFT → ACTIVE
            └─ publisher.Publish(BotDeployed)

Customer Triggers Bot (Web App or API):
  └─ POST /api/bots/{id}/execute
       └─ Gateway → gRPC → bot-service (:50059)
            └─ ExecuteBotAction(botID, userID, actionType, inputJson)
                 ├─ Step 1: PolicyChecker.EvaluateBotAction(botID, userID, toolName)
                 │    ├─ ALLOW → proceed
                 │    └─ DENY → return policyDecision with reason
                 ├─ Step 2: aiClient.Execute() → gRPC → ai-service (:50057)
                 │    └─ orchestrator.go
                 │         ├─ ChatCompletion → LLM (OpenAI)
                 │         ├─ ExecuteTool → tool execution if needed
                 │         ├─ QueryKnowledge → RAG from knowledge sources
                 │         └─ SummarizeConversation → context summary
                 ├─ Step 3: Record action in bot_action_logs
                 └─ Step 4: Publish BotActionExecuted event

Bot Response in Conversation:
  └─ Response appears in conversation with senderType = BOT
       ├─ Provider Portal: sees bot messages in conversation thread
       └─ Web App: customer sees bot response inline

Escalation to Human:
  └─ Bot detects need for human → escalation flag
       └─ Conversation assigned to human agent
            └─ Provider Portal: notification + conversation reassigned
```

---

## Current State

### Provider Portal — Bot Wizard (`apps/provider/src/app/bots/new/page.tsx`, ~492 lines)

- **Status**: FULLY IMPLEMENTED with 5-step wizard
- Steps:
  1. **Details**: name, purpose, department, industry profile, avatar
  2. **Configuration**: greeting, tone, max turns, response length, language
  3. **Permissions**: tool-level toggles (e.g., search_orders, update_account, escalate)
  4. **Knowledge**: upload documents, add URLs, connect to FAQ
  5. **Review**: summary of all settings + deploy button
- Saves as DRAFT on create, separate deploy action

### Provider Portal — Bot Mutations (`apps/provider/src/lib/mutations/bots.ts`, ~35 lines)

```tsx
useCreateBot(input)              → POST /api/bots
useUpdateBot(id, input)          → PUT /api/bots/{id}
useDeleteBot(id)                 → DELETE /api/bots/{id}
useUpdateBotConfiguration(id)    → PUT /api/bots/{id}/configuration
useSetBotPermission(id)          → POST /api/bots/{id}/permissions
useAddKnowledgeSource(id)        → POST /api/bots/{id}/knowledge
useRemoveKnowledgeSource(id, srcId) → DELETE /api/bots/{id}/knowledge/{srcId}
useExecuteBotAction(id)          → POST /api/bots/{id}/execute
```

### Bot Service — Use Case (`services/bot-service/internal/usecase/bot.go`, ~300+ lines)

```go
type BotUseCase struct {
    botRepo    repository.BotRepository
    configRepo repository.BotConfigurationRepository
    permRepo   repository.BotPermissionRepository
    sourceRepo repository.KnowledgeSourceRepository
    actionRepo repository.BotActionLogRepository
    statsRepo  repository.BotStatsRepository
    policy     PolicyChecker
    aiClient   aiv1.AIServiceClient  // gRPC client to ai-service
    publisher  events.Publisher
    log        *zap.Logger
}

func (uc *BotUseCase) CreateBot(ctx context.Context, ...) (*entity.Bot, error) {
    // Validate name, purpose → entity with DRAFT status → default config → persist
}

func (uc *BotUseCase) ExecuteBotAction(ctx context.Context, botID, userID, actionType, inputJson string) (*ExecuteResult, error) {
    // 1. PolicyChecker.EvaluateBotAction(ctx, botID, userID, actionType)
    //    → allowed bool, reason string, err error
    // 2. If denied: return result with policyDecision = reason
    // 3. aiClient.Execute(ctx, &aiv1.ExecuteRequest{...})
    //    → gRPC call to ai-service
    // 4. Log action in bot_action_logs
    // 5. Publish BotActionExecuted event
    // Return: outputJson, policyDecision, escalated bool
}
```

### AI Service — Orchestrator (`services/ai-service/internal/usecase/orchestrator.go`, ~150 lines)

```go
type Orchestrator struct {
    router      *llm.Router
    toolExecutor *tools.Executor
    rag         *rag.Engine
    summarizer  *summarizer.Summarizer
    categorizer *categorizer.Categorizer
    spamDetector *spam.Detector
    log         *zap.Logger
}

// Methods:
// ChatCompletion(ctx, messages, model, temperature) → response
// ExecuteTool(ctx, toolName, params) → result
// QueryKnowledge(ctx, query, sourceIDs) → documents
// SummarizeConversation(ctx, messages) → summary
// CategorizeMessage(ctx, message) → category
// DetectSpam(ctx, message) → score, isSpam
```

### Policy Service — Bot Action Check

- `PolicyChecker.EvaluateBotAction(ctx, botID, userID, toolName)` → (allowed, reason, err)
- Checks: bot is active, user has interaction with this SP, tool is in permitted list
- Returns boolean allowed + reason string

### Web App — Conversations

- Bot responses appear in conversation thread with `senderType = BOT`
- Bot messages styled differently (bot avatar, "Bot" label)
- Customer can reply to bot messages — triggers next bot turn

---

## Requirements

### Sub-task 6.8.1 — Provider Portal: Create and Configure Bot

- [ ] Navigate to Provider Portal → `/bots/new`
- [ ] **Step 1 — Details**:
  - Name: "Support Assistant"
  - Purpose: "Handle customer inquiries about account features and billing"
  - Department: "Customer Support"
  - Select industry profile (if applicable)
  - Upload avatar (optional)
  - Click Next
- [ ] **Step 2 — Configuration**:
  - Greeting: "Hello! I'm your support assistant. How can I help you today?"
  - Tone: "Professional and friendly"
  - Max conversation turns: 10
  - Response length: "Medium"
  - Language: "English"
  - Click Next
- [ ] **Step 3 — Permissions**:
  - Enable tools:
    - `search_orders` → ON
    - `view_account` → ON
    - `update_account` → OFF (restricted)
    - `escalate_to_human` → ON
  - Click Next
- [ ] **Step 4 — Knowledge**:
  - Add knowledge source: upload FAQ document
  - Add URL: company help center URL
  - Click Next
- [ ] **Step 5 — Review**:
  - Verify all settings displayed correctly
  - Click "Create Bot"
- [ ] Verify bot persisted:
  ```sql
  SELECT id, name, status, service_provider_id, department
  FROM bots WHERE name = 'Support Assistant'
  ORDER BY created_at DESC LIMIT 1;
  ```
  - Status: `DRAFT`

### Sub-task 6.8.2 — Provider Portal: Deploy Bot

- [ ] Navigate to `/bots/<bot-id>`
- [ ] Click "Deploy" / "Activate" button
- [ ] Verify bot status changes:
  ```sql
  SELECT status FROM bots WHERE id = '<bot-id>';
  ```
  - Status: `ACTIVE`
- [ ] Verify `bot.deployed` event published
- [ ] Verify bot appears in active bots list on Provider Portal
- [ ] Verify bot configuration and permissions are locked after deployment (or require redeploy)

### Sub-task 6.8.3 — Customer: Trigger Bot Interaction

- [ ] As a customer (Web App or API), initiate conversation with the bot:
  - Navigate to conversations or use bot trigger endpoint
  - Send message: "What are the features of my current plan?"
- [ ] Verify request reaches bot-service:
  - `ExecuteBotAction(botID, userID, "chat", inputJson)`
  - inputJson contains the customer message
- [ ] Verify policy check passes:
  - `PolicyChecker.EvaluateBotAction` → allowed = true
  - Bot is ACTIVE, user has relationship with SP, action type is permitted
- [ ] Verify AI service called:
  - gRPC to ai-service: `Execute` RPC
  - orchestrator.ChatCompletion with conversation context
  - QueryKnowledge for relevant FAQ content (RAG)
- [ ] Verify bot response returned:
  - outputJson contains coherent response about account features
  - policyDecision: empty (allowed)
  - escalated: false

### Sub-task 6.8.4 — Conversation: Bot Response Appears

- [ ] Verify bot response in conversation thread:
  - **Web App**: customer sees bot response inline
    - Bot message has bot avatar and "Bot" label
    - Message content matches AI response
    - Timestamp correct
  - **Provider Portal**: SP agent sees bot conversation
    - Bot messages labeled with bot name
    - Customer messages and bot responses interspersed
- [ ] Verify conversation record:
  ```sql
  SELECT sender_type, sender_id, body, created_at
  FROM messages
  WHERE conversation_id = '<conv-id>'
  ORDER BY created_at;
  ```
  - Customer message: sender_type = `USER`
  - Bot response: sender_type = `BOT`, sender_id = bot ID
- [ ] Verify bot action logged:
  ```sql
  SELECT bot_id, user_id, action_type, input, output, policy_decision, escalated
  FROM bot_action_logs
  WHERE bot_id = '<bot-id>' AND user_id = '<user-id>'
  ORDER BY created_at DESC LIMIT 1;
  ```

### Sub-task 6.8.5 — Multi-Turn Conversation

- [ ] Customer sends follow-up message: "Can you look up my recent orders?"
- [ ] Verify bot-service receives with conversation context (previous messages)
- [ ] Verify tool execution (if `search_orders` is permitted):
  - AI decides to use `search_orders` tool
  - orchestrator.ExecuteTool("search_orders", params)
  - Tool returns order data
  - Bot formats response with order details
- [ ] Verify max turns enforcement:
  - After 10 turns, bot should indicate it has reached the conversation limit
  - Or escalate to human agent
- [ ] Verify each turn is logged in bot_action_logs

### Sub-task 6.8.6 — Policy-Denied Bot Action

- [ ] Customer sends: "Please update my email address to new@example.com"
- [ ] Bot attempts to use `update_account` tool
- [ ] Verify policy check DENIES the action:
  - `PolicyChecker.EvaluateBotAction(botID, userID, "update_account")` → allowed = false
  - Reason: "Tool 'update_account' is not permitted for this bot"
- [ ] Verify bot response handles denial gracefully:
  - Bot tells customer: "I'm not able to update account details directly. Let me connect you with a human agent."
  - policyDecision field populated with denial reason
- [ ] Verify denial logged:
  ```sql
  SELECT action_type, policy_decision FROM bot_action_logs
  WHERE bot_id = '<bot-id>' AND action_type = 'update_account';
  ```
  - policy_decision: "Tool not permitted"
- [ ] Verify Provider Portal: bot action log shows denied action with reason
- [ ] Check Jaeger trace: `bot-service / ExecuteBotAction` span with policy denial attribute

### Sub-task 6.8.7 — Escalation to Human Agent

- [ ] Customer says: "I want to speak with a real person"
- [ ] Verify bot triggers escalation:
  - AI detects escalation intent
  - Bot uses `escalate_to_human` tool (permitted)
  - `ExecuteResult.Escalated = true`
- [ ] Verify escalation handling:
  - Conversation flagged for human assignment
  - Bot sends final message: "I'm connecting you with a human agent now."
  - `bot.escalated` event published
- [ ] Verify Provider Portal:
  - Agent receives notification of escalation
  - Conversation appears in agent's queue or inbox
  - Agent can see full bot conversation history
  - Agent takes over — subsequent messages from agent (senderType = `AGENT`)
- [ ] Verify Web App:
  - Customer sees transition message from bot
  - Next response comes from human agent
  - Conversation continues seamlessly

### Sub-task 6.8.8 — Bot Analytics & Audit Trail

- [ ] Navigate to Provider Portal → `/bots/<bot-id>` → Analytics tab
- [ ] Verify bot statistics:
  - Total interactions count
  - Average response time
  - Escalation rate
  - Policy denial count
  - Customer satisfaction (if tracked)
- [ ] Verify action audit trail:
  - All actions logged with timestamp, user, action type, input/output
  - Policy decisions captured
  - Escalation events recorded
- [ ] Verify analytics-service has bot metrics:
  ```sql
  SELECT * FROM bot_stats
  WHERE bot_id = '<bot-id>';
  ```
- [ ] Verify events published:
  - `bot.action.executed` — for each successful action
  - `bot.action.denied` — for policy-denied actions
  - `bot.escalated` — for escalation events

---

## Verification Checklist

- [ ] Provider Portal: 5-step wizard → create bot → DRAFT status → deploy → ACTIVE
- [ ] Customer triggers bot → policy check passes → AI service processes → response returned
- [ ] Bot response appears in conversation with senderType=BOT for both Web App and Provider Portal
- [ ] Multi-turn conversation maintains context across turns
- [ ] Tool execution: permitted tools work, denied tools return graceful policy rejection
- [ ] Policy-denied actions: logged with reason, bot responds gracefully to customer
- [ ] Escalation: bot hands off to human agent, full conversation history preserved
- [ ] Provider Portal: agent receives escalation, takes over conversation seamlessly
- [ ] Bot action logs: complete audit trail of all interactions in bot_action_logs table
- [ ] Bot analytics: interaction counts, escalation rates, denial counts tracked
- [ ] Jaeger: traces span bot-service → ai-service → LLM call with timing data
- [ ] Events: bot.action.executed, bot.action.denied, bot.escalated published correctly
