# Task 10.6 — Bot Test Panel

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P2 — Enhancement  
> **Estimated Scope**: Medium  
> **Route**: `/bots/new` (Step 3) and `/bots/[id]`  
> **File**: `apps/provider/src/app/bots/new/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a "Test Panel" that allows the provider to send a test message and see the bot's response in real-time during prompt editing. This is used in Step 3 (Prompt) of the wizard and on the bot detail page's System Prompt tab.

---

## Current State

Step 3 only has a textarea for the system prompt. No way to test the prompt before deploying.

```tsx
{step === 3 && (
  <>
    <h3 className="text-sm font-semibold">System Prompt</h3>
    <p className="text-xs text-text-muted">Define how your bot should behave and respond</p>
    <textarea value={form.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={10}
      className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono ..." />
  </>
)}
```

### GraphQL Schema

```graphql
input ExecuteBotActionInput {
  botId: ID!
  serviceProviderId: ID!
  conversationId: ID!
  userId: ID!
  actionType: String!
  toolName: String
  inputJson: String
}

mutation { executeBotAction(input: ExecuteBotActionInput!): ExecuteBotActionResult! }

type ExecuteBotActionResult {
  success: Boolean!
  outputJson: String
  policyDecision: String
  policyReason: String
  escalated: Boolean!
}
```

---

## Requirements

### 1. Split Layout

```
┌──────────────────────────┬──────────────────────────┐
│ System Prompt Editor     │ Test Panel               │
│                          │                          │
│ [textarea with prompt]   │ [chat-like interface]    │
│                          │                          │
│                          │ User: "What's my bal..." │
│                          │ Bot: "I can help you..." │
│                          │                          │
│                          │ [input] [Send]           │
└──────────────────────────┴──────────────────────────┘
```

### 2. Test Panel Features

- Chat-like interface: user messages (right), bot responses (left)
- Text input + Send button
- Shows bot response from `executeBotAction` mutation (or a dedicated test endpoint)
- Loading indicator while generating response
- "Clear" button to reset conversation
- Disclaimer: "Test mode — responses may differ from production"

### 3. Behavior

- **In wizard**: Uses the current system prompt from the form state (not yet saved)
- **On detail page**: Uses the saved system prompt
- If bot not yet created (wizard): may need a test-only endpoint or skip `botId` requirement
- Messages are ephemeral — not persisted

---

## Implementation Plan

```tsx
function BotTestPanel({ systemPrompt, botId }: { systemPrompt: string; botId?: string }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Call test endpoint or executeBotAction
      const response = await testBotPrompt(systemPrompt, userMsg);
      setMessages((prev) => [...prev, { role: 'bot', text: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error generating response' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-card border border-border-primary rounded-xl">
      <div className="flex items-center justify-between p-3 border-b border-border-primary">
        <h4 className="text-xs font-semibold text-text-secondary">Test Panel</h4>
        <button onClick={() => setMessages([])} className="text-xs text-text-muted hover:text-text-secondary">
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'bg-accent-purple/10 text-text-primary'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-accent-purple/10 rounded-lg text-sm text-text-muted animate-pulse">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border-primary flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm"
          placeholder="Type a test message…" />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="px-3 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>

      <p className="px-3 pb-2 text-xs text-text-muted">
        Test mode — responses may differ in production
      </p>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/new/page.tsx` | **Modify** | Add test panel to Step 3 |
| `apps/provider/src/components/BotTestPanel.tsx` | **Create** | Reusable test panel component |
| `apps/provider/src/app/bots/[id]/page.tsx` | **Modify** | Add test panel to System Prompt tab |

---

## Acceptance Criteria

- [ ] Split layout: system prompt editor on left, test panel on right
- [ ] User can type a message and see bot response
- [ ] Loading state while generating response
- [ ] Chat messages displayed in chronological order
- [ ] "Clear" button resets conversation
- [ ] Test panel works in wizard (Step 3) and detail page
- [ ] Disclaimer text shown
- [ ] Enter key triggers send

---

## Dependencies

- **Blocked by**: Task 10.5 (wizard Step 3), Task 10.21 (executeBotAction mutation)
- **Blocks**: None
- **Related**: Task 10.7 (bot detail page — also hosts test panel)
