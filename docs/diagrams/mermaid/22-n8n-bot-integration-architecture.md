# 22 — n8n & Bot Integration Architecture

> **Principal Architect view** — Complete end-to-end architecture for the TrustInbox bot system and its n8n workflow automation integration. Every component, data flow, security boundary, and lifecycle state is derived directly from the production codebase.

---

## 1. System Context — Where Bots & n8n Fit

```mermaid
graph TB
    subgraph "Service Provider (SP)"
        SPAdmin["SP Admin / Agent<br/>Provider Portal :6060"]
    end

    subgraph "Customer"
        User["Customer<br/>Web App :3000 / Hybrid App"]
    end

    subgraph "TrustInbox Platform"
        GW["Gateway :4000<br/>REST + GraphQL + SSE"]

        subgraph "Bot Plane"
            BotSvc["bot-service :50059<br/>Bot lifecycle + workflow dispatch"]
        end

        subgraph "AI Plane"
            AISvc["ai-service :50057<br/>LLM · RAG · Spam · Categorizer"]
        end

        subgraph "Policy Plane"
            PS["policy-service :50053<br/>Mandatory gatekeeper"]
        end

        subgraph "Workflow Plane"
            N8N["n8n :5678<br/>Visual workflow automation<br/>(private network)"]
        end

        subgraph "Platform Services"
            NS["notification-service"]
            Comm["communication-service"]
            Doc["document-service"]
        end

        subgraph "Data"
            PG["PostgreSQL 16<br/>bot_configurations<br/>bot_workflow_configs<br/>bot_workflow_suspensions<br/>bot_action_logs<br/>knowledge_chunks"]
            Redis["Redis 7<br/>Events · Cache"]
        end
    end

    subgraph "External LLMs"
        OpenAI["OpenAI API"]
        Anthropic["Anthropic API"]
    end

    SPAdmin -->|"REST/GraphQL"| GW
    User -->|"REST/GraphQL"| GW
    GW -->|"gRPC"| BotSvc
    GW -->|"gRPC"| AISvc
    BotSvc -->|"gRPC"| AISvc
    BotSvc -->|"gRPC"| PS
    BotSvc -->|"HMAC-signed HTTP POST"| N8N
    N8N -->|"HTTP POST resume callback"| GW
    AISvc -->|"HTTPS"| OpenAI & Anthropic
    BotSvc --> PG
    BotSvc --> Redis
    N8N -->|"HTTP (internal)"| NS & Comm & Doc
```

---

## 2. Bot Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : CreateBot(name, purpose, department)

    DRAFT --> ACTIVE : UpdateBotStatus(ACTIVE)\n[has config + ≥1 permission]
    DRAFT --> ARCHIVED : Archive

    ACTIVE --> PAUSED : UpdateBotStatus(PAUSED)
    ACTIVE --> ARCHIVED : Archive
    ACTIVE --> ACTIVE : ExecuteAction\nAddKnowledgeSource\nUpdateConfig\nAddWorkflow

    PAUSED --> ACTIVE : UpdateBotStatus(ACTIVE)
    PAUSED --> ARCHIVED : Archive

    ARCHIVED --> [*]

    note right of DRAFT
        Default state after CreateBot.
        Bot cannot respond to users.
        SP configures:
        · system_prompt, tone, temperature
        · knowledge sources
        · tool permissions
        · n8n workflow registrations
    end note

    note right of ACTIVE
        Bot responds to user messages.
        ExecuteAction pipeline active.
        Policy gate enforced per turn.
    end note
```

---

## 3. Bot Configuration Data Model

```mermaid
erDiagram
    BOTS {
        uuid id PK
        uuid service_provider_id FK
        varchar name
        varchar purpose
        varchar department
        varchar status "DRAFT|ACTIVE|PAUSED|ARCHIVED"
        varchar avatar_url
        timestamptz created_at
    }

    BOT_CONFIGURATIONS {
        uuid bot_id PK_FK
        varchar tone
        varchar writing_style
        text[] supported_languages
        int[] working_days
        varchar working_hours_start
        varchar working_hours_end
        int max_turns_before_escalation
        float temperature
        text custom_system_prompt
        jsonb escalation_rules
        jsonb human_handoff_policy
        jsonb compliance_restrictions
    }

    BOT_PERMISSIONS {
        uuid id PK
        uuid bot_id FK
        varchar tool_name
        boolean is_allowed
        jsonb constraints
    }

    KNOWLEDGE_SOURCES {
        uuid id PK
        uuid bot_id FK
        varchar source_type "DOCUMENT|URL|TEXT|FAQ|API|WORKFLOW"
        varchar name
        text content
        varchar s3_key
        varchar status "PENDING|PROCESSING|ACTIVE|FAILED"
        int chunk_count
    }

    KNOWLEDGE_CHUNKS {
        uuid id PK
        uuid bot_id FK
        uuid source_id FK
        text content
        vector embedding
        float relevance_score
        int chunk_index
        varchar source_name
    }

    BOT_WORKFLOW_CONFIGS {
        uuid id PK
        uuid bot_id FK
        varchar workflow_id "SP-chosen logical ID e.g. crm-lookup"
        varchar workflow_name
        varchar webhook_path "n8n relative path /webhook/abc123"
        text description
        boolean is_active
    }

    BOT_WORKFLOW_SUSPENSIONS {
        uuid id PK
        varchar resume_token "32-byte hex, one-time use"
        uuid bot_id FK
        uuid conversation_id
        uuid user_id
        varchar workflow_id
        varchar status "PENDING|RESUMED|EXPIRED"
        text result_json
        timestamptz expires_at "NOW() + 15 minutes"
        timestamptz resumed_at
    }

    BOT_ACTION_LOGS {
        uuid id PK
        uuid bot_id FK
        uuid conversation_id
        uuid user_id
        varchar action_type
        varchar tool_used
        text input_summary
        text output_summary
        varchar policy_decision
        int duration_ms
        boolean success
    }

    BOTS ||--|| BOT_CONFIGURATIONS : "has"
    BOTS ||--o{ BOT_PERMISSIONS : "has many"
    BOTS ||--o{ KNOWLEDGE_SOURCES : "has many"
    KNOWLEDGE_SOURCES ||--o{ KNOWLEDGE_CHUNKS : "chunked into"
    BOTS ||--o{ BOT_WORKFLOW_CONFIGS : "registers"
    BOTS ||--o{ BOT_WORKFLOW_SUSPENSIONS : "suspends on"
    BOTS ||--o{ BOT_ACTION_LOGS : "logged in"
```

---

## 4. Bot Action Execution — Complete Call Graph

```mermaid
sequenceDiagram
    participant User as Customer (Web/App)
    participant GW as Gateway :4000
    participant Bot as bot-service :50059
    participant PS as policy-service
    participant AI as ai-service
    participant LLM as LLM Router
    participant Tool as ToolExecutor
    participant N8N as n8n :5678
    participant PG as PostgreSQL
    participant Redis as Redis Streams

    User->>GW: POST /api/v1/bots/:id/action<br/>{message, conversationId}

    Note over Bot: ① Load & validate
    GW->>Bot: gRPC ExecuteAction(botId, userId, message)
    Bot->>PG: SELECT bots WHERE id=$1 AND status='ACTIVE'
    Bot->>PG: SELECT bot_permissions WHERE bot_id=$1

    Note over Bot: ② Permission check
    Bot->>Bot: CheckPermission(botId, "chat")
    alt permission missing → 403

    Note over PS: ③ Policy gate
    Bot->>PS: gRPC EvaluateBotAction(botId, userId, "chat")
    PS->>PG: 9-step evaluation
    PS-->>Bot: {allowed:true}

    Note over AI: ④ RAG knowledge retrieval
    Bot->>AI: gRPC ProcessBotAction(message, config, history[])
    AI->>PG: SELECT knowledge_chunks<br/>ORDER BY embedding <-> $query LIMIT 5<br/>WHERE relevance_score >= 0.7
    PG-->>AI: chunks[]
    AI->>AI: buildAugmentedPrompt(query, chunks)

    Note over LLM: ⑤ LLM completion
    AI->>LLM: ChatCompletion(messages[], tools[], temp, maxTokens)
    LLM-->>AI: {content, tool_calls:[{name, args}]}

    alt tool_calls includes "execute_workflow"
        Note over N8N: ⑥a n8n workflow dispatch
        AI->>Tool: Execute("execute_workflow", {workflow_id, input_data, async})
        Tool->>Bot: dispatchWorkflowTool(workflowId, inputJSON)
        Bot->>PG: SELECT bot_workflow_configs WHERE workflow_id=$1 AND is_active=true
        PG-->>Bot: {webhook_path: "/webhook/abc123"}

        alt async=false (synchronous)
            Bot->>N8N: POST {baseURL}/webhook/abc123<br/>X-TrustInbox-Signature: sha256={hmac}<br/>X-TrustInbox-Timestamp: {ts}<br/>{workflowId, botId, spId, convId, userId, inputData}
            N8N->>N8N: Execute workflow nodes
            N8N-->>Bot: {success:true, data:{...}}
            Bot-->>Tool: {status:"executed", success:true, data}
            Tool-->>AI: toolResult JSON
            AI->>LLM: Follow-up with tool result
            LLM-->>AI: Final answer

        else async=true (suspended)
            Bot->>Bot: generateResumeToken() → 32-byte hex
            Bot->>PG: INSERT bot_workflow_suspensions<br/>(token, botId, convId, status=PENDING, expires=+15min)
            Bot->>N8N: POST /webhook/abc123<br/>{..., resumeCallbackUrl: "/api/v1/workflows/resume/{token}"}
            N8N-->>Bot: {success:true} (ACK only)
            Bot-->>Tool: {status:"suspended", resume_url}
            Tool-->>AI: suspended JSON
            AI-->>Bot: {response:"Processing... I'll follow up shortly"}
            Bot-->>GW: {response, suspended:true}
            GW-->>User: "Processing..."

            Note over N8N: n8n executes async
            N8N->>N8N: HTTP nodes / CRM / external APIs
            N8N->>GW: POST /api/v1/workflows/resume/{token}<br/>{result: {...}}
            GW->>Bot: gRPC ResumeWorkflow(token, resultJSON)
            Bot->>PG: SELECT suspensions WHERE token=$1 AND status=PENDING
            Bot->>PG: UPDATE status=RESUMED, result_json=$2, resumed_at=NOW()
            Bot->>Redis: PUBLISH bot.action.executed {resumed:true}
            Bot-->>GW: {conversationId, userId, result}
            GW->>User: SSE "bot_resumed" {result}
        end

    else regular tool call (send_notification, etc.)
        Note over Tool: ⑥b Standard tool execution
        AI->>Tool: Execute(toolName, argsJSON)
        Tool->>Tool: registry.HasTool(name) — permission validated
        Tool-->>AI: toolResult
        AI->>LLM: Follow-up
        LLM-->>AI: Final answer
    end

    Note over AI: ⑦ Output spam guard
    AI->>AI: SpamDetector.Detect(response)<br/>score ≥ 0.8 → BLOCK response

    AI-->>Bot: {response, toolsUsed[], tokens, durationMS}

    Note over Bot: ⑧ Persist & emit
    Bot->>PG: INSERT bot_action_logs<br/>(botId, convId, toolUsed, response,<br/>durationMS, spamScore, success)
    Bot->>Redis: XADD bot.action.executed
    Bot-->>GW: {response, metadata}
    GW-->>User: 200 {message: response}
```

---

## 5. n8n Integration Architecture — Detailed

```mermaid
graph TB
    subgraph "TrustInbox Private Network"
        subgraph "bot-service"
            WF_UC["BotUseCase.dispatchWorkflowTool()"]
            N8N_CLIENT["n8n.Client\nbaseURL: http://n8n:5678\nTimeout: 30s"]
            HMAC["addSignatureHeaders()\nHMAC-SHA256(secret, body)\nX-TrustInbox-Signature\nX-TrustInbox-Timestamp"]
            SUSP_REPO["SuspensionRepository\nINSERT bot_workflow_suspensions\nstatus=PENDING\nexpiresAt = NOW() + 15m"]
        end

        subgraph "Gateway :4000"
            RESUME_EP["POST /api/v1/workflows/resume/:token"]
            BOT_GRPC["gRPC → BotUseCase.ResumeWorkflow()"]
        end

        subgraph "n8n :5678"
            WH_TRIGGER["Webhook Trigger node\n/webhook/{path}\nVerifies X-TrustInbox-Signature"]
            NODES["Workflow Nodes:\n• HTTP Request\n• OpenAI / AI Transform\n• CRM / Salesforce\n• Database Query\n• IF / Switch\n• Set / Merge\n• Code (JavaScript)\n• Send Email\n• Slack / Teams"]
            WH_CALLBACK["HTTP Request node\nPOST {resumeCallbackUrl}\n{success, data}"]
        end

        subgraph "PostgreSQL"
            WFCFG["bot_workflow_configs\nworkflow_id (logical)\nwebhook_path (/webhook/abc)\nis_active"]
            WFSUSP["bot_workflow_suspensions\nresume_token (32-byte hex)\nstatus: PENDING→RESUMED\nexpiresAt: +15 min"]
        end
    end

    subgraph "External APIs (called by n8n)"
        CRM["Salesforce / HubSpot"]
        ERP["ERP Systems"]
        EMAIL_SVC["Email / SMTP"]
        EXTAPI["Any HTTP API"]
    end

    WF_UC -->|"1. lookup webhook_path"| WFCFG
    WF_UC -->|"2. async: insert suspension"| WFSUSP
    WF_UC --> HMAC
    HMAC --> N8N_CLIENT
    N8N_CLIENT -->|"3. POST /webhook/{path}"| WH_TRIGGER
    WH_TRIGGER --> NODES
    NODES --> CRM & ERP & EMAIL_SVC & EXTAPI
    NODES -->|"4. async: callback POST"| WH_CALLBACK
    WH_CALLBACK --> RESUME_EP
    RESUME_EP --> BOT_GRPC
    BOT_GRPC -->|"5. mark RESUMED"| WFSUSP

    style WF_UC fill:#1c2028,color:#e4e7eb
    style N8N_CLIENT fill:#1c2028,color:#e4e7eb
    style WH_TRIGGER fill:#2a1a0a,color:#f59e0b
    style NODES fill:#2a1a0a,color:#f59e0b
    style WH_CALLBACK fill:#2a1a0a,color:#f59e0b
```

---

## 6. Sync vs Async Workflow Execution Paths

```mermaid
flowchart TD
    Start["LLM invokes tool_call:\nexecute_workflow\n{workflow_id, input_data, async}"]

    Start --> Check{async?}

    Check -->|"false\n(sync path)"| SyncTrigger

    subgraph "Synchronous Path (default)"
        SyncTrigger["POST /webhook/{path}\nX-TrustInbox-Signature header\n{workflowId, botId, spId, convId, userId, inputData}"]
        SyncWait["Wait for HTTP response\n(30s timeout)"]
        SyncResult["{success:true, data:{...}}"]
        SyncReturn["Return tool result to LLM\nLLM generates final answer\nBot responds to user immediately"]
        SyncTrigger --> SyncWait --> SyncResult --> SyncReturn
    end

    Check -->|"true\n(async path)"| GenToken

    subgraph "Asynchronous Path"
        GenToken["generateResumeToken()\n32-byte cryptographically random hex"]
        PersistSusp["INSERT bot_workflow_suspensions\n{token, botId, convId, userId,\nstatus=PENDING, expiresAt=+15min}"]
        BuildURL["resumeCallbackUrl =\nbaseURL + /api/v1/workflows/resume/{token}"]
        AsyncTrigger["POST /webhook/{path}\n{..., resumeCallbackUrl}"]
        BotSuspended["Bot returns:\n'Processing... I'll follow up shortly'\nConversation is suspended"]
        N8NRuns["n8n executes workflow\n(minutes to hours)"]
        N8NCallback["POST resumeCallbackUrl\n{result:{...}}"]
        GWReceives["Gateway receives callback\nPOST /api/v1/workflows/resume/{token}"]
        ValidateToken["Validate:\n• token exists in suspensions\n• status == PENDING\n• NOW() < expiresAt"]
        MarkResumed["UPDATE suspensions\nstatus=RESUMED\nresult_json=payload\nresumed_at=NOW()"]
        PublishEvent["PUBLISH bot.action.executed\n{resumed:true, result}"]
        SSEUser["Gateway → SSE 'bot_resumed'\nUser sees result in chat"]

        GenToken --> PersistSusp --> BuildURL --> AsyncTrigger
        AsyncTrigger --> BotSuspended
        AsyncTrigger --> N8NRuns
        N8NRuns --> N8NCallback --> GWReceives
        GWReceives --> ValidateToken --> MarkResumed --> PublishEvent --> SSEUser
    end

    style GenToken fill:#0d1017,color:#3b82f6
    style ValidateToken fill:#0d1017,color:#22c55e
    style BotSuspended fill:#0d1017,color:#f59e0b
    style SSEUser fill:#0d1017,color:#22c55e
```

---

## 7. n8n Security Model

```mermaid
graph TB
    subgraph "Outbound Security (TrustInbox → n8n)"
        S1["HMAC-SHA256 Request Signing\nMAC = HMAC(secret, requestBody)\nHeader: X-TrustInbox-Signature: sha256={hex}\nHeader: X-TrustInbox-Timestamp: {unix}"]
        S2["Private Network Only\nn8n baseURL = http://n8n:5678\nNever exposed to public internet\nDocker internal network"]
        S3["30-second timeout\nFailed trigger = bizerr.Internal\nBot returns error to user, logged"]
        S4["1MB response limit\nLimitReader prevents memory abuse"]
    end

    subgraph "Inbound Security (n8n → Gateway)"
        S5["One-time Resume Token\n32-byte crypto/rand hex\nSingle use (PENDING → RESUMED)"]
        S6["15-minute TTL\nexpiresAt = NOW() + 15min\nExpired tokens → 400 InvalidInput"]
        S7["Status guard\nOnly PENDING suspensions can be resumed\nAlready resumed → 400"]
        S8["Token scoped to bot + conversation\nResumeWorkflow validates ownership\nNo cross-bot token reuse possible"]
    end

    subgraph "Workflow Permission Control"
        S9["Workflow Registration\nbob_workflow_configs.is_active must = true\nInactive workflow → 400 error, no trigger"]
        S10["Tool Allowlist\nexecute_workflow must be in bot_permissions\nLLM cannot trigger workflows for bots\nthat don't have execute_workflow permitted"]
        S11["Policy Gate\nEvaluateBotAction() runs BEFORE\nany workflow dispatch"]
    end
```

---

## 8. Provider Portal — Bot Management UI Flow

```mermaid
sequenceDiagram
    participant PUI as Provider Portal :6060
    participant GW as Gateway :4000
    participant Bot as bot-service
    participant AI as ai-service
    participant PG as PostgreSQL

    Note over PUI: /bots/new — Create bot
    PUI->>GW: POST /api/v1/bots<br/>{name, purpose, department, avatarUrl}
    GW->>Bot: gRPC CreateBot(spId, name, purpose)
    Bot->>PG: INSERT bots (status=DRAFT)
    Bot->>PG: INSERT bot_configurations (defaults)
    Bot->>PG: INSERT bot_permissions[] (11 tools, all=true)
    Bot-->>GW: {botId, status:DRAFT}
    GW-->>PUI: 201 {botId}

    Note over PUI: /bots/:id/config — Configure
    PUI->>GW: PATCH /api/v1/bots/:id/config<br/>{tone, systemPrompt, temperature, maxTurns}
    GW->>Bot: gRPC UpdateBotConfig(botId, config)
    Bot->>PG: UPSERT bot_configurations
    Bot-->>GW: {updated:true}

    Note over PUI: /bots/:id/knowledge — Add knowledge
    PUI->>GW: POST /api/v1/bots/:id/knowledge<br/>{type:DOCUMENT, name, content}
    GW->>Bot: gRPC AddKnowledgeSource(botId, type, content)
    Bot->>PG: INSERT knowledge_sources (status=PROCESSING)
    Bot->>AI: gRPC IndexKnowledge(botId, chunks[])
    AI->>AI: Split into ~512 token chunks
    AI->>AI: Generate embeddings (OpenAI)
    AI->>PG: INSERT knowledge_chunks (content, embedding, score)
    AI-->>Bot: {indexed:true, chunkCount:24}
    Bot->>PG: UPDATE knowledge_sources SET status=ACTIVE, chunk_count=24
    Bot-->>GW: {knowledgeSourceId, chunkCount:24}
    GW-->>PUI: 201

    Note over PUI: /bots/:id/workflows — Register n8n workflow
    PUI->>GW: POST /api/v1/bots/:id/workflows<br/>{workflowId:"crm-lookup", webhookPath:"/webhook/abc123", name}
    GW->>Bot: gRPC CreateWorkflowConfig(botId, spId, workflowId, webhookPath)
    Bot->>Bot: Validate webhookPath starts with "/"
    Bot->>PG: INSERT bot_workflow_configs
    Bot-->>GW: {configId}
    GW-->>PUI: 201 {configId}

    Note over PUI: Activate bot
    PUI->>GW: PATCH /api/v1/bots/:id/status {status:ACTIVE}
    GW->>Bot: gRPC UpdateBotStatus(ACTIVE)
    Bot->>PG: UPDATE bots SET status=ACTIVE
    Bot->>Bot: PUBLISH events.BotCreated
    Bot-->>GW: {status:ACTIVE}
    GW-->>PUI: 200 — Bot is live ✓
```

---

## 9. Bot Analytics & Observability

```mermaid
graph TB
    subgraph "Per-Action Telemetry"
        A1["bot_action_logs (PostgreSQL)\nbotId · convId · userId\ntoolUsed · durationMS\nspamScore · success · errorMessage"]
        A2["OTel Span: BotUseCase.ExecuteAction\nattrs: bot_id, user_id, sp_id,\ntools_used[], tokens, latency_ms"]
        A3["OTel Span: n8n.Client.Trigger\nattrs: workflow_id, bot_id"]
        A4["OTel Span: BotUseCase.dispatchWorkflowTool\nattrs: bot_id, suspended:bool"]
        A5["Redis Event: bot.action.executed\n{botId, convId, toolName, workflowId, resumed}"]
    end

    subgraph "Aggregated Analytics (bot_analytics)"
        B1["total_conversations"]
        B2["total_messages_sent / received"]
        B3["total_actions_executed"]
        B4["total_escalations"]
        B5["avg_response_time_ms"]
        B6["avg_turns_per_conversation"]
        B7["escalation_rate (%)"]
        B8["resolution_rate (%)"]
        B9["satisfaction_score"]
    end

    subgraph "Workflow Analytics"
        C1["Sync workflows:\n• trigger count\n• success rate\n• avg duration"]
        C2["Async workflows:\n• suspension count\n• resume rate\n• expired token count\n• avg resume latency"]
    end

    subgraph "Export Pipeline"
        OTel["OTel Collector :4317"]
        Jaeger["Jaeger — full trace per bot turn"]
        Grafana["Grafana — bot performance dashboard"]
    end

    A1 & A2 & A3 & A4 --> OTel
    A5 --> B1 & B2 & B3 & B4
    A1 --> C1 & C2
    OTel --> Jaeger & Grafana
```

---

## 10. Complete Component Dependency Map

```mermaid
graph LR
    subgraph "bot-service internal"
        BotUC["BotUseCase"]
        subgraph "Repositories (interfaces)"
            R1["BotRepository"]
            R2["BotConfigurationRepository"]
            R3["BotPermissionRepository"]
            R4["KnowledgeSourceRepository"]
            R5["BotActionLogRepository"]
            R6["BotAnalyticsRepository"]
            R7["BotWorkflowConfigRepository"]
            R8["BotWorkflowSuspensionRepository"]
        end
        subgraph "External interfaces"
            PC["PolicyChecker\n→ policy-service gRPC"]
            WD["WorkflowDispatcher\n→ n8n.Client (HTTP)"]
            AIC["aiv1.AIServiceClient\n→ ai-service gRPC"]
            PUB["events.Publisher\n→ Redis Streams"]
        end
    end

    subgraph "infra implementations"
        P1["postgres.BotRepo"]
        P2["postgres.ConfigRepo"]
        P3["postgres.PermissionRepo"]
        P4["postgres.KnowledgeRepo"]
        P5["postgres.ActionLogRepo"]
        P6["postgres.AnalyticsRepo"]
        P7["postgres.WorkflowRepo"]
        P8["postgres.SuspensionRepo"]
        N8["n8n.dispatcherAdapter\n→ n8n.Client"]
    end

    BotUC --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8
    BotUC --> PC & WD & AIC & PUB

    R1 .->|implements| P1
    R2 .->|implements| P2
    R3 .->|implements| P3
    R4 .->|implements| P4
    R5 .->|implements| P5
    R6 .->|implements| P6
    R7 .->|implements| P7
    R8 .->|implements| P8
    WD .->|implements| N8
```

---

## 11. Real-World n8n Workflow Examples

```mermaid
graph TB
    subgraph "Example A: Synchronous CRM Lookup"
        A1["Bot receives: 'What is my account balance?'"]
        A2["LLM: tool_call execute_workflow\n{workflow_id:'crm-lookup', async:false,\ninput_data:{customer_id}}"]
        A3["n8n: HTTP Request → Salesforce API\nGET /accounts/{customerId}"]
        A4["n8n returns: {balance:1234.56, tier:'gold'}"]
        A5["LLM: 'Your balance is $1,234.56. You are a Gold tier member.'"]
        A1-->A2-->A3-->A4-->A5
    end

    subgraph "Example B: Async Multi-Step Onboarding"
        B1["Bot receives: 'I want to open an account'"]
        B2["LLM: tool_call execute_workflow\n{workflow_id:'onboarding', async:true}"]
        B3["n8n: Create lead → Send KYC email\n→ Wait for doc upload → Verify"]
        B4["Bot responds: 'I've started your application.\nYou'll receive an email shortly.'"]
        B5["Minutes later: n8n POSTs resume callback\n{kycApproved:true, accountNumber:'ACC-789'}"]
        B6["User receives SSE bot_resumed:\n'Great news! Your account ACC-789 is approved.'"]
        B1-->B2-->B3
        B2-->B4
        B3-->B5-->B6
    end

    subgraph "Example C: Compliance Notification Sequence"
        C1["Scheduled n8n trigger (not user-initiated)\nCron: every Monday 09:00"]
        C2["n8n: Query PG for customers\nwith expiring documents"]
        C3["n8n: For each customer\nPOST /api/v1/notifications (internal)"]
        C4["notification-service creates notification\nPolicy gate enforced per customer"]
        C5["Customers receive 'Document expiry reminder'"]
        C1-->C2-->C3-->C4-->C5
    end
```

---

## Principal Architect Observations

| Area | Observation | Recommendation |
|---|---|---|
| **Async suspension TTL** | Resume token expires in 15 minutes. Long-running n8n workflows (e.g. KYC, document review) will expire before n8n calls back. | Make TTL configurable per `BotWorkflowConfig`. Default 15m is fine for fast workflows; compliance flows need 24h+. |
| **Resume token storage** | Stored in PostgreSQL. High-volume bots with many async workflows create rows that need cleanup. | Add a CleanupProcessor job in worker-service to DELETE expired+resumed suspensions older than 7 days. |
| **n8n HMAC verification** | Bot signs outbound requests. n8n workflow **must** verify `X-TrustInbox-Signature` on its webhook trigger node. This is configuration responsibility of the SP who builds the n8n workflow. | Add a verification code snippet to onboarding docs and optionally enforce on the bot side if n8n returns a 401 (reject webhook). |
| **n8n single point of failure** | Synchronous path blocks for 30s timeout if n8n is down. All sync workflow calls fail. | Circuit-breaker pattern in `n8n.Client`. After 5 consecutive failures, open the circuit and return a graceful "workflow service unavailable" message. |
| **Knowledge indexing at ingestion** | Embedding model is called at ingestion time (OpenAI `text-embedding-3-small`). If the model changes, historical vectors become incomparable. | Pin the embedding model name in `bot_knowledge_sources` table and store model version alongside each `knowledge_chunk`. |
| **Tool allowlist enforcement** | `execute_workflow` must be in `bot_permissions.is_allowed=true` for the bot to trigger n8n. Correct by design — but SP could accidentally revoke all tool permissions. | Add a validation in `UpdateBotStatus(ACTIVE)` that warns if a bot has zero active permissions. |
| **n8n calling TrustInbox APIs** | n8n workflows can call platform APIs (create notification, etc.) via HTTP Request nodes using internal service URLs. | These calls bypass the gateway RBAC. Create a dedicated n8n service account token with limited scope, not the SP admin JWT. |
