# 20 — End-to-End AI Architecture

> Complete map of every AI capability in TrustInbox: how they are wired, what they do, what models they use, and where each component sits in the clean architecture stack.

---

## AI System Overview

```mermaid
graph TB
    subgraph "Trigger Surfaces"
        T1["💬 Bot Chat<br/>User sends message to AI bot"]
        T2["📬 Notification Submission<br/>SP submits notification content"]
        T3["🔍 Policy Evaluation<br/>Any communication attempt"]
        T4["📊 Conversation End<br/>SP requests summary"]
        T5["⚙️ n8n Workflow<br/>Automated workflow trigger"]
    end

    subgraph "Gateway Layer :4000"
        GW["GraphQL BFF<br/>Routes to bot-service / ai-service"]
    end

    subgraph "bot-service :50059"
        direction TB
        BotUC["BotUseCase<br/>Orchestrates bot lifecycle"]
        BotPerm["Permission Check<br/>8 granular permissions"]
        BotPS["Policy Gate<br/>→ policy-service"]
        BotKS["KnowledgeSource Mgmt<br/>File/URL/Text ingestion"]
        BotWF["n8n Dispatcher<br/>Workflow trigger path"]
        BotLog["ActionLog<br/>Audit trail per execution"]
    end

    subgraph "ai-service :50057"
        direction TB
        Orch["🎯 Orchestrator<br/>Entry point for all AI ops"]

        subgraph "Pipeline Components"
            RAG["📚 RAG Pipeline<br/>Knowledge retrieval<br/>top_k=5 · min_score=0.7"]
            Sum["📝 Summarizer<br/>Brief / Detailed / ActionItems"]
            Cat["🏷️ Categorizer<br/>PERSONAL · ORGANIZATIONAL · ADVERTISEMENT"]
            Spam["🛡️ SpamDetector<br/>Heuristic + LLM · score 0–1"]
            Tool["🔧 ToolExecutor<br/>11 registered tools"]
        end

        subgraph "LLM Infrastructure"
            Router["🔀 LLM Router<br/>Provider selection + fallback"]
            OAI["OpenAI Provider<br/>GPT-4 / GPT-4-turbo / GPT-3.5"]
            Anth["Anthropic Provider<br/>Claude 3 Opus / Sonnet / Haiku"]
        end
    end

    subgraph "Storage"
        PG["PostgreSQL<br/>knowledge_chunks<br/>bot_configurations<br/>bot_action_logs"]
        Redis["Redis<br/>AI result cache<br/>rate limits"]
    end

    subgraph "External LLM APIs"
        OAI_API["OpenAI API<br/>api.openai.com"]
        Anth_API["Anthropic API<br/>api.anthropic.com"]
    end

    T1 & T5 --> GW --> BotUC
    T2 --> Cat
    T3 --> Spam
    T4 --> GW

    BotUC --> BotPerm --> BotPS
    BotPS --> Orch
    BotUC --> BotKS --> RAG
    BotUC --> BotWF
    BotUC --> BotLog

    Orch --> RAG & Sum & Cat & Spam & Tool
    Orch --> Router

    Router --> OAI --> OAI_API
    Router --> Anth --> Anth_API

    RAG --> PG
    Tool --> PG
    BotLog --> PG
    Orch -.->|cache| Redis
```

---

## AI Processing Pipeline (Full Detail)

```mermaid
sequenceDiagram
    participant User as Customer
    participant Bot as bot-service
    participant AI as ai-service Orchestrator
    participant RAG as RAG Pipeline
    participant PG as PostgreSQL<br/>(knowledge_chunks)
    participant LLM as LLM Router
    participant Tool as ToolExecutor
    participant Spam as SpamDetector
    participant NS as notification-service
    participant OTel as OpenTelemetry

    User->>Bot: ExecuteAction(botId, userId, message, convId)

    Note over Bot: Step 1 — Load & validate bot config
    Bot->>PG: SELECT bot_configurations WHERE id=$1 AND status='ACTIVE'
    Bot->>PG: SELECT bot_permissions WHERE bot_id=$1

    Note over Bot: Step 2 — Permission check
    Bot->>Bot: CheckPermission("chat") in bot_permissions
    alt Missing permission
        Bot-->>User: 403 Forbidden
    end

    Note over Bot: Step 3 — Policy gate
    Bot->>Bot: EvaluatePolicy(userId, botSpId, category)
    alt Policy denied
        Bot-->>User: 403 PolicyDenied
    end

    Note over AI: Step 4 — RAG retrieval
    Bot->>AI: ProcessBotAction(message, config, history[])
    AI->>RAG: Query(botId, message, topK=5, minScore=0.7)
    RAG->>PG: SELECT content, source_name, relevance_score<br/>FROM knowledge_chunks WHERE bot_id=$1<br/>ORDER BY embedding <-> $2 LIMIT $3
    PG-->>RAG: chunks[] (cosine similarity)
    RAG->>RAG: buildAugmentedPrompt(query, chunks)<br/>Prepend: "Use following knowledge sources..."
    RAG-->>AI: {chunks, augmentedPrompt, totalSearched}

    Note over AI: Step 5 — Build LLM messages
    AI->>AI: Compose message array:<br/>[system: botConfig.systemPrompt,<br/> assistant: RAG context,<br/> user[]: conversation history,<br/> user: current message]

    Note over AI: Step 6 — First LLM call
    AI->>LLM: ChatCompletion(provider, model, messages[], tools[], temp, maxTokens)
    LLM->>LLM: Route to OpenAI or Anthropic<br/>based on req.Provider or fallback
    LLM-->>AI: {content, toolCalls:[], usage:{promptTokens, completionTokens}}

    alt LLM returned tool_calls
        Note over Tool: Step 7 — Tool execution loop
        loop For each requested tool
            AI->>Tool: Execute(toolName, argsJSON, botId)
            Tool->>Tool: Validate tool in registry.HasTool(name)
            alt Tool: send_notification
                Tool->>NS: CreateNotification(userId, title, body)
                NS-->>Tool: {notifId}
            else Tool: request_callback
                Tool->>Tool: Build callback request payload
            else Tool: search_knowledge
                Tool->>RAG: Query(botId, args.query)
                RAG-->>Tool: {chunks, augmentedPrompt}
            else Tool: get_customer_profile
                Tool->>Tool: Fetch limited profile (privacy-safe subset)
            else Tool: evaluate_policy
                Tool->>Tool: Policy check result
            end
            Tool-->>AI: {success, resultJSON, durationMS}
        end

        Note over AI: Step 8 — Follow-up LLM call with tool results
        AI->>LLM: ChatCompletion(messages[] + toolResults[])
        LLM-->>AI: Final answer content
    end

    Note over Spam: Step 9 — Output spam guard
    AI->>Spam: Detect(botResponse, senderType="BOT")
    Spam->>Spam: computeHeuristicSignals:<br/>• urgency keywords (weight 0.15 each)<br/>• link density (>2 links)<br/>• CAPS ratio (>30%)<br/>• phone/email patterns<br/>• prohibited phrases
    Spam->>LLM: llmAnalysis(response, prompt)
    LLM-->>Spam: {score:0.0-1.0, explanation}
    Spam->>Spam: aggregateScore(signals)<br/>weighted average
    Spam->>Spam: makeDecision:<br/>score≥0.8 → BLOCK<br/>score≥0.5 → FLAG<br/>else → ALLOW

    alt Spam BLOCK
        Spam-->>AI: {isSpam:true, decision:BLOCK}
        AI-->>Bot: {response:"I cannot help with that", toolsUsed:[]}
    else Spam ALLOW / FLAG
        AI-->>Bot: {response, toolsUsed[], tokens, latency}
    end

    Note over Bot: Step 10 — Persist & event
    Bot->>PG: INSERT bot_action_logs<br/>(botId, userId, convId, message, response,<br/>toolsUsed[], tokensUsed, durationMS, spamScore)
    Bot->>Bot: PUBLISH bot.action.executed
    Bot-->>User: {response, metadata}
    Bot->>OTel: Span: BotUseCase.ExecuteAction<br/>attrs: bot_id, user_id, tools_used, tokens, latency
```

---

## AI Component Architecture (Clean Layers)

```mermaid
graph TB
    subgraph "ai-service — Clean Architecture"
        subgraph "Domain Layer"
            E1["entity.CompletionRequest/Response"]
            E2["entity.RAGQueryRequest/Response"]
            E3["entity.ToolExecutionRequest/Result"]
            E4["entity.SpamDetectRequest/Response"]
            E5["entity.CategorizeRequest/Response"]
            E6["entity.SummarizeRequest/Response"]
            E7["entity.KnowledgeChunk"]
            E8["entity.ToolDefinition"]
            R1["repository.KnowledgeChunkRepository<br/>(interface)"]
        end

        subgraph "UseCase Layer"
            UC1["Orchestrator<br/>Entry point, delegates to sub-components"]
            UC2["RAGPipeline<br/>Retrieve + augment prompt"]
            UC3["Summarizer<br/>LLM-based summarization"]
            UC4["Categorizer<br/>LLM JSON classification"]
            UC5["SpamDetector<br/>Heuristic + LLM scoring"]
            UC6["ToolExecutor + ToolRegistry<br/>Named tool dispatch"]
        end

        subgraph "Infrastructure Layer"
            I1["llm.Router<br/>Provider selection"]
            I2["llm.OpenAIProvider<br/>openai.ChatCompletion"]
            I3["llm.AnthropicProvider<br/>anthropic.Messages"]
            I4["postgres.KnowledgeChunkRepo<br/>pgvector similarity search"]
        end

        subgraph "Delivery Layer"
            D1["grpc.AIHandler<br/>Proto → usecase → proto"]
        end
    end

    D1 --> UC1
    UC1 --> UC2 & UC3 & UC4 & UC5 & UC6
    UC2 --> R1
    UC2 & UC3 & UC4 & UC5 --> I1
    I1 --> I2 & I3
    I4 ..|> R1
```

---

## LLM Provider Routing

```mermaid
flowchart LR
    Req["CompletionRequest<br/>provider: 'openai'|'anthropic'|''"]
    Router["LLM Router"]
    OAI["OpenAI Provider<br/>Models:<br/>• gpt-4<br/>• gpt-4-turbo<br/>• gpt-3.5-turbo"]
    Anth["Anthropic Provider<br/>Models:<br/>• claude-3-opus<br/>• claude-3-sonnet<br/>• claude-3-haiku"]
    Fallback["Fallback Provider<br/>(configured at startup<br/>via OPENAI_API_KEY /<br/>ANTHROPIC_API_KEY env vars)"]

    Req -->|"provider specified"| Router
    Router -->|"'openai'"| OAI
    Router -->|"'anthropic'"| Anth
    Router -->|"'' (empty)"| Fallback
    Fallback --> OAI
```

---

## RAG Knowledge Pipeline

```mermaid
graph TB
    subgraph "Ingestion (bot-service)"
        I1["SP uploads knowledge source<br/>(PDF / URL / text)"]
        I2["bot-service chunks content<br/>~512 tokens per chunk"]
        I3["ai-service.IndexKnowledge(botId, chunks[])"]
        I4["LLM embedding call<br/>(text-embedding-3-small or similar)"]
        I5["INSERT knowledge_chunks<br/>(bot_id, content, source_name,<br/>embedding vector, chunk_index)"]
    end

    subgraph "Retrieval (at query time)"
        R1["User message arrives"]
        R2["RAGPipeline.Query(botId, query, topK=5, minScore=0.7)"]
        R3["SELECT ... FROM knowledge_chunks<br/>WHERE bot_id=$1<br/>ORDER BY embedding &lt;-&gt; $2 LIMIT $3"]
        R4["Filter: relevanceScore ≥ 0.7"]
        R5["buildAugmentedPrompt:<br/>Prepend source context to query"]
        R6["Augmented prompt → LLM"]
    end

    I1 --> I2 --> I3 --> I4 --> I5
    R1 --> R2 --> R3 --> R4 --> R5 --> R6
```

---

## Spam Detection Signal Pipeline

```mermaid
flowchart TD
    Input["SpamDetectRequest<br/>{content, senderId, senderType}"]

    subgraph "Phase 1: Heuristic Signals"
        H1["Urgency keywords<br/>(urgent, act now, expires…)<br/>weight: 0.15 per keyword, max 0.6"]
        H2["Link density<br/>(>2 URLs)<br/>weight: 0.1 per link, max 0.5"]
        H3["CAPS ratio<br/>(>30% uppercase)<br/>weight: 0.3"]
        H4["Phone/email pattern<br/>weight: 0.2 (suspicious context)"]
        H5["Prohibited phrases<br/>(casino, wire transfer…)<br/>weight: 0.3 per match"]
    end

    subgraph "Phase 2: LLM Analysis"
        L1["Prompt: 'Analyze this for spam indicators.<br/>Return JSON: {score:0.0-1.0, explanation}'"]
        L2["LLM Router → completion"]
        L3["Parse JSON score + explanation<br/>weight: 0.4 in aggregate"]
    end

    subgraph "Phase 3: Aggregation"
        A1["Weighted average of all signals"]
        A2{"Score threshold"}
        A3["≥ 0.8 → BLOCK"]
        A4["≥ 0.5 → FLAG (allow, mark)"]
        A5["< 0.5 → ALLOW"]
    end

    Input --> H1 & H2 & H3 & H4 & H5
    Input --> L1 --> L2 --> L3
    H1 & H2 & H3 & H4 & H5 & L3 --> A1
    A1 --> A2
    A2 --> A3 & A4 & A5
```

---

## Smart Categorization Flow

```mermaid
sequenceDiagram
    participant Caller as notification-service / gateway
    participant Cat as ai-service Categorizer
    participant LLM as LLM Router (OpenAI)

    Caller->>Cat: CategorizeMessage({content, senderType, senderId, contextMetadata})

    Cat->>Cat: Build userContent:<br/>- "Sender type: ORGANIZATION"<br/>- "Message: {content}"<br/>- "Context: {metadata JSON}"

    Cat->>LLM: ChatCompletion<br/>system: categorizationSystemPrompt<br/>user: userContent<br/>temperature=0.1, maxTokens=512

    Note over LLM: System prompt instructs LLM to return JSON:<br/>{ primary_category, confidence,<br/>  subcategory, all_categories[], reasoning }

    LLM-->>Cat: JSON response (may be in markdown code block)

    Cat->>Cat: Parse: extract JSON between { and }
    Cat->>Cat: Map to entity.CategorizeResponse:<br/>primary_category: PERSONAL | ORGANIZATIONAL | ADVERTISEMENT<br/>confidence: 0.0–1.0<br/>reasoning: string

    Cat-->>Caller: CategorizeResponse

    Note over Caller: Used for:<br/>• Auto-categorize incoming notifications<br/>• Spam + category mismatch detection<br/>• Industry compliance hints
```

---

## Conversation Summarization Flow

```mermaid
sequenceDiagram
    participant PUI as Provider Portal
    participant GW as Gateway
    participant AI as ai-service Summarizer
    participant LLM as LLM Router

    PUI->>GW: POST /api/v1/conversations/:id/summarize<br/>?type=ACTION_ITEMS
    GW->>AI: gRPC SummarizeConversation(convId, messages[], summaryType)

    AI->>AI: buildSummarizationPrompt(SUMMARY_ACTION_ITEMS)
    Note over AI: "Focus primarily on extracting<br/>actionable items and next steps.<br/>Return JSON: {summary, key_topics[],<br/>action_items[], sentiment}"

    AI->>AI: formatConversation(messages[])<br/>→ "Agent: ...\nUser: ...\nAgent: ..."

    AI->>LLM: ChatCompletion<br/>temperature=0.3, maxTokens=1024

    LLM-->>AI: JSON summary

    AI->>AI: parseSummarizationResponse:<br/>extract JSON, map fields
    AI-->>GW: {summary, keyTopics[], actionItems[], sentiment, messageCount}
    GW-->>PUI: summary display

    Note over PUI: 3 summary types:<br/>• BRIEF: 2-3 sentence overview<br/>• DETAILED: comprehensive coverage<br/>• ACTION_ITEMS: next steps focus
```

---

## n8n Workflow AI Automation Path

```mermaid
graph LR
    subgraph "bot-service"
        BotUC["BotUseCase.TriggerWorkflow(workflowId, input)"]
        Disp["n8n Dispatcher (dispatcherAdapter)"]
        Client["n8n HTTP Client"]
    end

    subgraph "n8n (external)"
        WH["Webhook trigger endpoint"]
        Nodes["Workflow nodes:<br/>• HTTP Request<br/>• OpenAI node<br/>• Code node<br/>• IF/Switch<br/>• Set/Merge"]
        Callback["Resume callback URL"]
    end

    subgraph "TrustInbox Backend"
        GW["Gateway resume endpoint<br/>/api/v1/workflows/resume"]
    end

    BotUC --> Disp --> Client
    Client -->|"POST {webhookPath}"| WH
    WH --> Nodes
    Nodes -->|"async result"| Callback
    Callback --> GW --> BotUC

    Note1["Input payload:<br/>workflowId, botId, spId,<br/>conversationId, userId,<br/>resumeCallbackURL, inputData"]
    Note2["Use cases:<br/>• Multi-step customer onboarding<br/>• Conditional notification sequences<br/>• CRM data sync + notify<br/>• Automated follow-up flows"]

    Client -.-> Note1
    Nodes -.-> Note2
```

---

## AI Observability

```mermaid
graph TB
    subgraph "Every AI Operation Emits"
        S1["OpenTelemetry Span<br/>service: ai-service<br/>operation: Orchestrator.ChatCompletion<br/>attrs: provider, model, bot_id,<br/>tokens_used, latency_ms"]
        S2["Span: ToolExecutor.Execute<br/>attrs: tool_name, bot_id, duration_ms, success"]
        S3["Span: RAGPipeline.Query<br/>attrs: bot_id, top_k, chunks_found, min_score"]
        S4["Span: SpamDetector.Detect<br/>attrs: sender_id, score, decision"]
        S5["Span: Categorizer.Categorize<br/>attrs: sender_type, primary_category, confidence"]
    end

    subgraph "Metrics (OTel Counters)"
        M1["trustinbox.bot.actions (counter)<br/>labels: bot_id, tool_name, sp_id"]
        M2["trustinbox.bot.escalations (counter)<br/>labels: bot_id, sp_id"]
        M3["trustinbox.llm.tokens (histogram)<br/>labels: provider, model"]
        M4["trustinbox.spam.decisions (counter)<br/>labels: decision, sender_type"]
    end

    subgraph "Audit Log (PostgreSQL)"
        DB["bot_action_logs<br/>bot_id · user_id · conversation_id<br/>input_message · output_response<br/>tools_used[] · tokens_used<br/>duration_ms · spam_score<br/>created_at"]
    end

    subgraph "Export Pipeline"
        OTel["OTel Collector :4317"]
        Jaeger["Jaeger :16686<br/>Distributed traces"]
        Prom["Prometheus :9091<br/>Metrics scrape"]
        Grafana["Grafana :3100<br/>AI performance dashboards"]
    end

    S1 & S2 & S3 & S4 & S5 --> OTel
    M1 & M2 & M3 & M4 --> OTel
    S1 & S2 & S3 & S4 & S5 --> DB

    OTel --> Jaeger & Prom
    Prom --> Grafana
```

---

## AI Security Model

```mermaid
graph TB
    subgraph "Input Guards (BEFORE LLM)"
        G1["✅ Policy gate — every bot action must pass policy evaluation<br/>No LLM call if policy denies"]
        G2["✅ Permission check — bot must have 'chat' permission<br/>Tool calls require corresponding permission"]
        G3["✅ Tool allowlist — bot.allowed_tools[] controls which tools the LLM can invoke<br/>LLM cannot request unregistered tools"]
        G4["✅ Rate limiting — gateway enforces 500 req/min per SP<br/>LLM provider rate limits respected via router"]
    end

    subgraph "Output Guards (AFTER LLM)"
        G5["✅ Spam detection on bot output (score ≥ 0.8 → BLOCK response)<br/>Prevents prompt injection reaching users"]
        G6["✅ Tool result validation — each tool validates its own output<br/>Invalid JSON returns {success:false} not raw error"]
        G7["✅ Response audit — every action logged in bot_action_logs<br/>spam_score, tools_used, full input+output stored"]
    end

    subgraph "Data Privacy"
        G8["✅ PII never sent to LLM — get_customer_profile returns<br/>anonymized subset only (no phone, no real email)"]
        G9["✅ Knowledge isolation — RAG only queries chunks for current bot_id<br/>Cross-bot knowledge leakage impossible"]
        G10["✅ Conversation history scoped by conversationId<br/>No cross-conversation context bleed"]
    end
```

---

## AI Capabilities Matrix

| Capability | Component | Model Used | Trigger | Output |
|---|---|---|---|---|
| **Chat completion** | `Orchestrator.ChatCompletion` | GPT-4 / Claude 3 (configurable per bot) | Bot chat message | Natural language response |
| **Tool execution** | `ToolExecutor` | n/a (deterministic) | LLM `tool_calls` in response | JSON result passed back to LLM |
| **Knowledge retrieval** | `RAGPipeline` | Embedding model + cosine similarity | Every bot message | Top-5 knowledge chunks + augmented prompt |
| **Spam detection** | `SpamDetector` | GPT-3.5 (LLM phase) + heuristics | Notification submission / bot output | Score 0–1 + ALLOW/FLAG/BLOCK decision |
| **Categorization** | `Categorizer` | GPT-3.5 temperature=0.1 | Incoming message / notification | PERSONAL / ORGANIZATIONAL / ADVERTISEMENT |
| **Summarization** | `Summarizer` | GPT-4 temperature=0.3 | SP requests summary | Brief / Detailed / Action items |
| **Workflow automation** | `n8n Dispatcher` | Delegated to n8n nodes | Bot action or scheduled trigger | Async callback result |

---

## Observations & Key Findings

### What Was Achieved

1. **Dual LLM provider** — OpenAI and Anthropic are both registered at startup with runtime routing. Each bot can specify its preferred provider; empty → fallback provider from config.

2. **RAG is bot-scoped** — Knowledge chunks are isolated by `bot_id`. An SP cannot accidentally leak knowledge between their own bots. Cross-SP leakage is impossible by design.

3. **Spam detection is dual-phase** — heuristics first (deterministic, zero LLM cost), then LLM analysis only if needed. Score aggregation is weighted average with LLM signal weight=0.4.

4. **Output spam guard closes the prompt injection loop** — Even if a malicious user crafts a prompt that makes the LLM generate harmful output, the spam detector runs on the response before it reaches the user.

5. **Tool execution is sandboxed by permission** — The `allowed_tools[]` in `bot_permissions` is validated inside `ToolExecutor.Execute()`, not in the gateway. Even if the LLM hallucinates a tool call, it cannot execute unregistered or unpermitted tools.

6. **n8n provides complex automation** — The `WorkflowDispatcher` interface is backed by n8n via HTTP webhooks. This allows no-code multi-step workflows (CRM sync → conditional notify → follow-up) without writing service code.

7. **Full audit trail** — Every LLM call produces a `bot_action_logs` row with input, output, tools used, token count, duration, and spam score. This satisfies enterprise compliance requirements.

8. **Categorization supports auto-tagging** — The categorizer runs at 0.1 temperature (near-deterministic) and returns confidence scores. Used both for routing and compliance hints on industry profiles.
