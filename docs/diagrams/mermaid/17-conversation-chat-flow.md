# 17 — Conversation & Chat Flow

> Secure messaging between users and service providers via WebSocket hub, XMPP, and persistence layer.

## Chat Architecture

```mermaid
graph TB
    subgraph "Provider Portal (:6060)"
        ProviderWS["WebSocket Client<br/>Connect to /ws"]
        ProviderUI["Conversation UI<br/>Message list, thread view<br/>Typing indicators"]
    end

    subgraph "Web App (:3000)"
        UserXMPP["XMPP Client (strophe.js)<br/>WebSocket :5280/ws"]
        UserUI["Chat UI<br/>Conversation threads"]
    end

    subgraph "Gateway (:4000)"
        WSHub["WebSocket Hub<br/>Connection manager<br/>8 message types"]
        SSEEP["SSE Endpoint<br/>Real-time updates"]
    end

    subgraph "ejabberd (:5222 / :5280)"
        XMPP["XMPP Server<br/>Message routing<br/>Presence management<br/>Offline message storage"]
    end

    subgraph "communication-service (:50056)"
        ConvUC["ConversationUseCase<br/>CRUD, messages, status"]
        MsgUC["MessageUseCase<br/>Send, history, search"]
    end

    subgraph "PostgreSQL"
        ConvDB["conversations<br/>messages<br/>conversation_participants"]
    end

    subgraph "Redis"
        PubSub["Pub/Sub channels:<br/>chat:broadcast<br/>presence:events"]
    end

    ProviderWS --> WSHub
    UserXMPP --> XMPP
    WSHub --> ConvUC & MsgUC
    XMPP --> ConvUC & MsgUC
    ConvUC & MsgUC --> ConvDB
    WSHub <--> PubSub
    XMPP <--> PubSub
```

## Conversation Creation Flow

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant GW as Gateway
    participant CS as communication-service
    participant PS as policy-service
    participant DB as PostgreSQL
    participant Redis as Redis

    SP->>GW: POST /api/v1/conversations<br/>{userId, subject, initialMessage}
    GW->>CS: gRPC CreateConversation()

    CS->>PS: EvaluatePolicy(userID, spID, "service_provider", "conversation")
    alt Policy denied
        PS-->>CS: {allowed: false}
        CS-->>GW: PermissionDenied
        GW-->>SP: 403
    end
    PS-->>CS: {allowed: true}

    CS->>DB: INSERT INTO conversations<br/>(id, sp_id, user_id, subject,<br/>status='ACTIVE', created_by, created_at)

    CS->>DB: INSERT INTO conversation_participants<br/>(conversation_id, user_id, role='provider')
    CS->>DB: INSERT INTO conversation_participants<br/>(conversation_id, user_id, role='customer')

    CS->>DB: INSERT INTO messages<br/>(id, conversation_id, sender_id,<br/>content, type='TEXT', created_at)

    CS->>Redis: PUBLISH chat:broadcast<br/>{type: conversation.created, data}
    CS->>Redis: XADD trustinbox:events<br/>{type: conversation.created}

    CS-->>GW: {conversation, firstMessage}
    GW-->>SP: 201 Created
```

## Real-Time Message Flow (Provider → User)

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant WS as WebSocket Hub<br/>(Gateway)
    participant CS as communication-service
    participant DB as PostgreSQL
    participant Redis as Redis Pub/Sub
    participant XMPP as ejabberd
    participant User as Web App

    SP->>WS: WebSocket: {type: "send_message",<br/>conversationId, content, contentType}

    WS->>CS: gRPC SendMessage()
    CS->>DB: INSERT INTO messages<br/>(id, conversation_id, sender_id,<br/>content, content_type, created_at)

    CS->>DB: UPDATE conversations<br/>SET last_message_at = NOW(),<br/>last_message_preview = content

    CS->>Redis: PUBLISH chat:broadcast<br/>{type: message.new, conversationId,<br/>senderId, content}

    Redis-->>WS: Broadcast to connected providers
    WS-->>SP: WebSocket: {type: "message_received",<br/>message details}

    Redis-->>XMPP: Route to XMPP
    XMPP-->>User: XMPP message stanza<br/>(via WebSocket :5280/ws)

    Note over User: User sees message in real-time
```

## WebSocket Message Types

```mermaid
graph TB
    subgraph "Client → Server"
        C1["send_message<br/>{conversationId, content, contentType}"]
        C2["typing_start<br/>{conversationId}"]
        C3["typing_stop<br/>{conversationId}"]
        C4["mark_read<br/>{conversationId, messageId}"]
    end

    subgraph "Server → Client"
        S1["message_received<br/>{message, conversation}"]
        S2["typing_indicator<br/>{conversationId, userId, isTyping}"]
        S3["message_read<br/>{conversationId, messageId, readBy}"]
        S4["presence_update<br/>{userId, status: online/offline}"]
    end
```

## Conversation State Machine

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Created by SP or user
    ACTIVE --> WAITING_AGENT: Bot escalates
    ACTIVE --> RESOLVED: Agent resolves
    ACTIVE --> CLOSED: Either party closes
    WAITING_AGENT --> ACTIVE: Agent picks up
    RESOLVED --> ACTIVE: User reopens
    RESOLVED --> CLOSED: Auto-close after 7 days
    CLOSED --> [*]
```

## Presence Management

```mermaid
sequenceDiagram
    participant User as User/Agent
    participant WS as WebSocket Hub
    participant Redis as Redis
    participant Others as Other Connected Clients

    Note over User,WS: Connection established
    User->>WS: WebSocket connect
    WS->>Redis: SET presence:<userId> online EX 120
    WS->>Redis: PUBLISH presence:events<br/>{userId, status: online}
    Redis-->>Others: presence_update {online}

    Note over User,WS: Heartbeat every 30s
    loop Every 30 seconds
        WS->>Redis: EXPIRE presence:<userId> 120
    end

    Note over User,WS: Disconnect
    User->>WS: WebSocket close / timeout
    WS->>Redis: DEL presence:<userId>
    WS->>Redis: PUBLISH presence:events<br/>{userId, status: offline}
    Redis-->>Others: presence_update {offline}
```

## Message Types & Content

```mermaid
graph TB
    subgraph "Message Types"
        TEXT["📝 TEXT<br/>Plain text message"]
        IMAGE["🖼️ IMAGE<br/>Image attachment<br/>via document-service"]
        FILE["📎 FILE<br/>File attachment<br/>via document-service"]
        SYSTEM["⚙️ SYSTEM<br/>System notifications<br/>(joined, left, transferred)"]
        BOT["🤖 BOT<br/>AI bot response<br/>May include tool results"]
    end

    subgraph "Message Metadata"
        Meta["JSONB metadata:<br/>• file_url (for attachments)<br/>• file_name, file_size<br/>• bot_action (for bot msgs)<br/>• tools_used[] (for bot msgs)"]
    end

    TEXT & IMAGE & FILE & SYSTEM & BOT --> Meta
```

## Conversation Search & History

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant GW as Gateway
    participant CS as communication-service
    participant DB as PostgreSQL

    SP->>GW: GET /api/v1/conversations/:id/messages<br/>?limit=50&before=<messageId>

    GW->>CS: gRPC ListMessages(conversationID, cursor, limit)

    CS->>DB: SELECT * FROM messages<br/>WHERE conversation_id = $1<br/>AND id < $2<br/>ORDER BY created_at DESC<br/>LIMIT $3

    DB-->>CS: [{message}, ...] (cursor pagination)

    CS-->>GW: {messages, hasMore, nextCursor}
    GW-->>SP: JSON response

    Note over SP: Infinite scroll with cursor-based pagination
```
