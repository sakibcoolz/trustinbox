# Task 10.5 — BotStudioWizard Component

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P0 — Core creation flow  
> **Estimated Scope**: XL  
> **Route**: `/bots/new`  
> **File**: `apps/provider/src/app/bots/new/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the bot creation wizard from a 4-step mock form to a 5-step wizard backed by GraphQL mutations. Align form fields with `CreateBotInput`, `UpdateBotConfigurationInput`, and `SetBotPermissionInput` schemas. Add the missing Step 5 (Deploy) and replace the mock submit handler with real mutations.

---

## Current State

```tsx
// apps/provider/src/app/bots/new/page.tsx — 169 lines
const [step, setStep] = useState(1);
const [form, setForm] = useState({
  name: '', purpose: 'support', model: 'GPT-4o', personality: '',
  systemPrompt: '', temperature: '0.7', maxTokens: '2048',
  channels: [] as string[], escalationTopics: '',
});
const steps = ['Basics', 'Model', 'Prompt', 'Channels'];

async function handleCreate() {
  await new Promise((r) => setTimeout(r, 500));
  window.location.href = '/bots';
}
```

**Issues**:
- Only 4 steps — plan requires 5 (missing Deploy step)
- `model`, `personality`, `temperature`, `maxTokens` not in `CreateBotInput` — they belong to `UpdateBotConfigurationInput`
- `channels`, `escalationTopics` not in any input — channels are part of configuration
- Submit is mocked (`setTimeout` + hard redirect)
- No avatar upload (plan: Step 1)
- No permissions step (plan: Step 4 — what actions bot can perform)
- No `department`, `industryProfileId` from `CreateBotInput`

### GraphQL Inputs

```graphql
input CreateBotInput {
  serviceProviderId: ID!
  name: String!
  purpose: String!
  department: String
  industryProfileId: ID
  avatarUrl: String
}

input UpdateBotConfigurationInput {
  botId: ID!
  serviceProviderId: ID!
  tone: String
  writingStyle: String
  customSystemPrompt: String
  temperature: Float
  maxTurnsBeforeEscalation: Int
  escalationRulesJson: String
  humanHandoffPolicyJson: String
  # ... more fields
}

input SetBotPermissionInput {
  botId: ID!
  serviceProviderId: ID!
  toolName: String!
  isAllowed: Boolean!
  constraintsJson: String
}
```

### Allowed Bot Tools (from domain)

```
get_customer_profile, search_knowledge_base, evaluate_policy,
send_notification, schedule_callback, share_document,
create_ticket, update_ticket, escalate_to_human, check_account_status
```

---

## Requirements

### 1. Wizard Steps

| Step | Title | Fields | Schema |
|------|-------|--------|--------|
| 1 | **Basics** | name, purpose, description/department, avatar upload, industryProfileId | `CreateBotInput` |
| 2 | **Model** | AI model selection, temperature, system prompt, tone, writingStyle | `UpdateBotConfigurationInput` |
| 3 | **Prompt** | System prompt editor with syntax highlighting, test panel | `UpdateBotConfigurationInput.customSystemPrompt` |
| 4 | **Permissions** | Toggle each allowed bot tool (10 tools) | `SetBotPermissionInput[]` |
| 5 | **Deploy** | Activate/save as draft, assign routing rules, review | `updateBot(status)` |

### 2. Two-Phase Mutation Flow

Since `CreateBotInput` only creates the bot entity, configuration and permissions require follow-up mutations:

1. **Step 1 submit**: Call `createBot(input)` → get `bot.id`
2. **Step 2-3 submit**: Call `updateBotConfiguration(input)` with the new `bot.id`
3. **Step 4 submit**: Call `setBotPermission(input)` for each tool
4. **Step 5 submit**: Call `updateBot(input: { status: ACTIVE })` to activate

**Alternative**: Save draft after Step 1, then configure — each step saves independently.

### 3. Form State

```tsx
interface BotWizardState {
  // Step 1 — Basics
  name: string;
  purpose: string;
  department: string;
  industryProfileId: string;
  avatarUrl: string;
  // Step 2 — Model
  tone: string;
  writingStyle: string;
  temperature: number;
  maxTurnsBeforeEscalation: number;
  // Step 3 — Prompt
  customSystemPrompt: string;
  // Step 4 — Permissions
  permissions: Record<string, boolean>;
  // Step 5 — Deploy
  activateImmediately: boolean;
}
```

### 4. Step Validation

| Step | Required | Validation |
|------|----------|------------|
| 1 | name, purpose | name ≥ 2 chars, purpose not empty |
| 2 | temperature | 0 ≤ temperature ≤ 1 |
| 3 | customSystemPrompt | ≥ 20 chars |
| 4 | — | At least one permission enabled |
| 5 | — | Review only |

---

## Implementation Plan

### Step 4 — Permissions (new)

```tsx
const BOT_TOOLS = [
  { name: 'get_customer_profile', label: 'View Customer Profile', description: 'Access customer data' },
  { name: 'search_knowledge_base', label: 'Search Knowledge Base', description: 'Query indexed documents' },
  { name: 'evaluate_policy', label: 'Evaluate Policy', description: 'Check policy before actions' },
  { name: 'send_notification', label: 'Send Notification', description: 'Send notifications to users' },
  { name: 'schedule_callback', label: 'Schedule Callback', description: 'Create callback requests' },
  { name: 'share_document', label: 'Share Document', description: 'Share documents with users' },
  { name: 'create_ticket', label: 'Create Ticket', description: 'Create support tickets' },
  { name: 'update_ticket', label: 'Update Ticket', description: 'Update existing tickets' },
  { name: 'escalate_to_human', label: 'Escalate to Human', description: 'Hand off to human agent' },
  { name: 'check_account_status', label: 'Check Account Status', description: 'View account details' },
];

{step === 4 && (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold">Bot Permissions</h3>
    <p className="text-xs text-text-muted">Choose what actions this bot can perform</p>
    {BOT_TOOLS.map((tool) => (
      <label key={tool.name} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
        <div>
          <p className="text-sm font-medium">{tool.label}</p>
          <p className="text-xs text-text-muted">{tool.description}</p>
        </div>
        <input type="checkbox"
          checked={form.permissions[tool.name] ?? false}
          onChange={(e) => updatePermission(tool.name, e.target.checked)}
          className="accent-accent-purple" />
      </label>
    ))}
  </div>
)}
```

### Multi-mutation submit

```tsx
async function handleDeploy() {
  // 1. Create bot
  const { data: botData } = await createBot({
    variables: { input: { serviceProviderId, name: form.name, purpose: form.purpose, department: form.department } },
  });
  const botId = botData.createBot.id;

  // 2. Configure
  await updateBotConfiguration({
    variables: { input: { botId, serviceProviderId, customSystemPrompt: form.customSystemPrompt, temperature: form.temperature, tone: form.tone } },
  });

  // 3. Set permissions
  for (const [toolName, isAllowed] of Object.entries(form.permissions)) {
    if (isAllowed) {
      await setBotPermission({
        variables: { input: { botId, serviceProviderId, toolName, isAllowed: true } },
      });
    }
  }

  // 4. Activate if chosen
  if (form.activateImmediately) {
    await updateBot({
      variables: { input: { botId, serviceProviderId, status: 'ACTIVE' } },
    });
  }

  router.push(`/bots/${botId}`);
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/new/page.tsx` | **Modify** | Rewrite with 5 steps, schema-aligned fields, real mutations |
| `apps/provider/src/lib/graphql/bots.ts` | **Create** (partial) | CREATE_BOT, UPDATE_BOT_CONFIG, SET_BOT_PERMISSION mutations |

---

## Acceptance Criteria

- [ ] 5-step wizard: Basics → Model → Prompt → Permissions → Deploy
- [ ] Step 1 fields align with `CreateBotInput` (name, purpose, department, avatarUrl)
- [ ] Step 2-3 fields align with `UpdateBotConfigurationInput`
- [ ] Step 4 shows all 10 allowed bot tools with toggles
- [ ] Step 5 review + activate/save-as-draft choice
- [ ] Multi-mutation flow: createBot → updateBotConfiguration → setBotPermission[]
- [ ] Step validation prevents advancing with missing required fields
- [ ] Loading states during each mutation step
- [ ] Error handling with toast notifications
- [ ] Redirects to bot detail page on success

---

## Dependencies

- **Blocked by**: Tasks 10.17 (createBot/updateBot), 10.18 (updateBotConfiguration), 10.19 (setBotPermission)
- **Blocks**: Task 10.6 (test panel — embedded in Step 3)
- **Related**: Task 10.7 (bot detail — redirect target)
