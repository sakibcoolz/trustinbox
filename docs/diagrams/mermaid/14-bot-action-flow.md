# 14 — Bot Action Execution Flow

> AI bot lifecycle, permission model, tool execution, policy gating, and LLM integration.

## Bot Architecture Overview

```mermaid
graph TB
    subgraph "Provider Portal"
        BotMgmt["Bot Management<br/>/bots · /bots/new · /bots/[id]<br/>Create, configure, deploy"]
    end

    subgraph "Gateway (:4000)"
        BotAPI["REST API<br/>/api/v1/bots/*"]
    end

    subgraph "bot-service (:50059)"
        BotUC["BotUseCase<br/>CRUD, config, permissions"]
        BotRepo["BotRepository<br/>bot_configurations<br/>bot_permissions<br/>bot_knowledge_sources"]
    end

    subgraph "ai-service (:50057)"
        Orch["Orchestrator<br/>Route to appropriate handler"]
        Cat["Categorizer<br/>Classify incoming messages"]
        Spam["SpamDetector<br/>Score message content"]
        RAG["RAG Engine<br/>Knowledge retrieval"]
        Sum["Summarizer<br/>Conversation summaries"]
        Tool["ToolExecutor<br/>11 built-in tools"]
    end

    subgraph "LLM Provider"
        OpenAI["OpenAI API<br/>GPT-4 / GPT-3.5"]
    end

    BotMgmt --> BotAPI --> BotUC
    BotUC --> BotRepo
    BotUC --> Orch
    Orch --> Cat & Spam & RAG & Sum & Tool
    Orch --> OpenAI
```

## Bot Action Execution Flow

```mermaid
sequenceDiagram
    participant User as End User
    participant GW as Gateway
    participant Bot as bot-service
    participant AI as ai-service
    participant PS as policy-service
    participant Tool as ToolExecutor
    participant LLM as OpenAI

    User->>GW: POST /api/v1/bots/:id/action<br/>{message, conversationId}
    GW->>Bot: gRPC ExecuteAction()

    Note over Bot: Step 1: Load bot configuration
    Bot->>Bot: GetBotByID(botID)
    Bot->>Bot: Verify bot is ACTIVE

    Note over Bot: Step 2: Check bot permissions
    Bot->>Bot: CheckPermission(botID, "chat")
    alt Permission denied
        Bot-->>GW: Forbidden "bot lacks chat permission"
        GW-->>User: 403
    end

    Note over Bot: Step 3: Policy check
    Bot->>PS: EvaluatePolicy(userID, botSPID, category)
    alt Policy denied
        PS-->>Bot: {allowed: false, reason}
        Bot-->>GW: PolicyDenied
        GW-->>User: 403
    end

    Note over Bot: Step 4: AI processing
    Bot->>AI: gRPC ProcessBotAction(message, botConfig, context)

    AI->>AI: Build prompt with:<br/>• System instructions (bot config)<br/>• Knowledge context (RAG)<br/>• Conversation history<br/>• Available tools

    AI->>LLM: Chat completion request<br/>{model, messages[], tools[], temperature}
    LLM-->>AI: Response (may include tool_calls)

    alt LLM requests tool execution
        AI->>Tool: Execute tool(s) requested
        Note over Tool: Validate tool is in bot's<br/>allowed_tools list
        Tool->>Tool: Execute (e.g., send_notification,<br/>create_callback, search_knowledge)
        Tool-->>AI: Tool result
        AI->>LLM: Follow-up with tool results
        LLM-->>AI: Final response
    end

    AI-->>Bot: {response, toolsUsed[], tokens}

    Bot->>Bot: Publish event: bot.action.executed
    Bot-->>GW: {response, metadata}
    GW-->>User: 200 {response}
```

## Bot Permission Model

```mermaid
graph TB
    subgraph "Bot Configuration"
        BotConfig["bot_configurations<br/>id · name · sp_id · status<br/>model · temperature · max_tokens<br/>system_prompt · welcome_message"]
    end

    subgraph "Bot Permissions (bot_permissions)"
        P1["📨 send_notification<br/>Can send notifications on behalf of SP"]
        P2["📞 create_callback<br/>Can initiate callback requests"]
        P3["💬 chat<br/>Can engage in conversations"]
        P4["📄 access_documents<br/>Can read shared documents"]
        P5["🔍 search_knowledge<br/>Can query knowledge base"]
        P6["📊 view_analytics<br/>Can access analytics data"]
        P7["🏷️ manage_tags<br/>Can manage customer tags"]
        P8["📝 manage_notes<br/>Can manage customer notes"]
    end

    subgraph "Knowledge Sources (bot_knowledge_sources)"
        K1["📁 File uploads<br/>PDF, TXT, MD"]
        K2["🔗 URL sources<br/>Website content"]
        K3["📋 Custom text<br/>FAQ, instructions"]
    end

    BotConfig --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8
    BotConfig --> K1 & K2 & K3
```

## 11 Built-in Tools

```mermaid
graph TB
    subgraph "Communication Tools"
        T1["send_notification<br/>Send notification to user<br/>Requires: send_notification permission"]
        T2["create_callback<br/>Request callback with user<br/>Requires: create_callback permission"]
        T3["send_message<br/>Send message in conversation<br/>Requires: chat permission"]
    end

    subgraph "Knowledge Tools"
        T4["search_knowledge<br/>Query RAG knowledge base<br/>Requires: search_knowledge permission"]
        T5["get_document<br/>Retrieve document content<br/>Requires: access_documents permission"]
    end

    subgraph "Customer Tools"
        T6["get_customer_info<br/>Fetch customer profile (limited)<br/>Requires: chat permission"]
        T7["add_customer_tag<br/>Tag a customer<br/>Requires: manage_tags permission"]
        T8["add_customer_note<br/>Add note about customer<br/>Requires: manage_notes permission"]
    end

    subgraph "Analytics Tools"
        T9["get_analytics<br/>Fetch dashboard metrics<br/>Requires: view_analytics permission"]
    end

    subgraph "Internal Tools"
        T10["escalate_to_human<br/>Hand off to human agent<br/>Always available"]
        T11["end_conversation<br/>Close the conversation<br/>Always available"]
    end
```

## Bot Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create bot
    DRAFT --> ACTIVE: Deploy / activate
    DRAFT --> DELETED: Delete before deploy
    ACTIVE --> PAUSED: Pause bot
    ACTIVE --> DELETED: Delete active bot
    PAUSED --> ACTIVE: Resume bot
    PAUSED --> DELETED: Delete paused bot

    state ACTIVE {
        [*] --> Ready
        Ready --> Processing: Receive action
        Processing --> Ready: Return response
        Processing --> Escalated: escalate_to_human
    }
```

## Bot Chat Handoff Flow

```mermaid
sequenceDiagram
    participant User as End User
    participant Bot as Bot (AI)
    participant Agent as Human Agent
    participant CS as communication-service
    participant DB as PostgreSQL

    Note over User,Bot: Bot conversation in progress

    User->>Bot: "I need to speak with a real person"
    Bot->>Bot: Detect escalation intent
    Bot->>Bot: Execute tool: escalate_to_human<br/>{reason: "user requested", summary: "..."}

    Bot->>CS: Transfer conversation to human queue
    CS->>DB: UPDATE conversations<br/>SET assigned_to = NULL,<br/>status = 'WAITING_AGENT',<br/>bot_summary = "..."

    CS->>CS: Publish event: bot.escalated
    Bot-->>User: "I'm connecting you with a human agent.<br/>They'll have context from our conversation."

    Note over Agent: Agent picks up from queue

    Agent->>CS: Accept conversation
    CS->>DB: UPDATE conversations<br/>SET assigned_to = agent_id,<br/>status = 'ACTIVE'

    Agent->>Agent: Read bot_summary for context
    Agent->>User: "Hi, I can see you were discussing...<br/>How can I help?"
```

## Test Prompt Flow (Development Only)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Bot as bot-service
    participant AI as ai-service
    participant LLM as OpenAI

    Dev->>Bot: gRPC TestPrompt(botID, testMessage)

    Note over Bot: test_prompt BYPASSES policy<br/>Used for development testing only

    Bot->>Bot: Load bot configuration
    Bot->>AI: ProcessBotAction(testMessage, config)
    AI->>LLM: Chat completion
    LLM-->>AI: Response
    AI-->>Bot: {response}
    Bot-->>Dev: {response, tokens_used}

    Note over Dev: No events published<br/>No analytics recorded<br/>No policy evaluation
```
