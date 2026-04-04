# Task 5.6 — Bot Configuration Wizard Enhancement

> **Phase**: 5 — Provider Portal: Completion
> **Goal**: Expand the current 5-step bot creation wizard to a 7-step wizard with Knowledge Sources and dedicated Test Chat steps, improving the creation flow and API wiring.
> **Primary File**: `apps/provider/src/app/bots/new/page.tsx`
> **Reference Files**: `apps/provider/src/app/bots/[id]/knowledge/page.tsx`, `apps/provider/src/app/bots/[id]/page.tsx`, `apps/provider/src/lib/graphql/bots.ts`

---

## Objective

The bot creation wizard currently has 5 steps: **Basics → Model → Prompt → Permissions → Deploy**. Task 5.6 expands this to a 7-step wizard: **Basics → Personality → Tools → Knowledge Sources → Permissions → Test Chat → Deploy**. The "Model" and "Prompt" steps merge into "Personality", a new "Knowledge Sources" step is added (reusing existing `AddSourceForm` patterns), and "Test Chat" becomes a dedicated step rather than an inline panel on the Prompt step.

---

## Current State

### Wizard Structure (`bots/new/page.tsx`, 492 lines)

```tsx
const STEPS = ['Basics', 'Model', 'Prompt', 'Permissions', 'Deploy'];

interface WizardForm {
  name: string;
  purpose: string;
  description: string;
  department: string;
  industryProfileId: string;
  aiModel: string;
  temperature: number;
  maxResponseTokens: number;
  tone: string;
  writingStyle: string;
  systemPrompt: string;
  enabledTools: string[];
  deployOnCreate: boolean;
}
```

- **Step 1 (Basics)**: Name, purpose (dropdown), description, department, industry profile ID
- **Step 2 (Model)**: AI model card selection, temperature slider, max response tokens, tone dropdown, writing style dropdown
- **Step 3 (Prompt)**: System prompt textarea (left) + `BotTestPanel` inline (right) in a 2-column grid
- **Step 4 (Permissions)**: Tool checkboxes from `ALLOWED_BOT_TOOLS` with name/label/description
- **Step 5 (Deploy)**: Review summary table + deploy-immediately checkbox + create button

### Creation Flow (`handleCreate`)

```tsx
// Step 1: Create bot
const { botId } = await createBot({ name, purpose, description, department, ... });

// Step 2: Update configuration
await updateConfig({ botId, aiModel, temperature, maxResponseTokens, tone, writingStyle, customSystemPrompt });

// Step 3: Set permissions (loop)
for (const tool of ALLOWED_BOT_TOOLS) {
  await setPermission({ botId, toolName: tool.name, enabled: form.enabledTools.includes(tool.name) });
}

// Step 4: Deploy if requested
if (form.deployOnCreate) {
  await updateBot({ botId, status: 'ACTIVE' });
}
```

### BotTestPanel (inline, ~40 lines)

```tsx
function BotTestPanel({ systemPrompt, botId }: { systemPrompt: string; botId?: string }) {
  // Uses useExecuteBotAction() with actionType: 'test_prompt'
  // Shows policy denied / escalated / normal response
  // Chat message list + input
}
```

### Knowledge Page (separate, `bots/[id]/knowledge/page.tsx`)

- `AddSourceForm`: sourceType (DOCUMENT/URL/TEXT/FAQ/API), name, description, content/file upload
- `RemoveSourceButton`: with confirmation dialog
- Uses: `useBotKnowledgeSources`, `useAddKnowledgeSource`, `useRemoveKnowledgeSource`
- File types: PDF, TXT, MD, DOCX — max 10 MB
- Source types: Document upload with drag-and-drop, URL input, plain text area, FAQ Q&A format, API/OpenAPI spec

---

## Requirements

### Sub-task 5.6.1 — Restructure Wizard Steps to 7

- [ ] Update `STEPS` array to 7 steps:
  ```tsx
  const STEPS = ['Basics', 'Personality', 'Tools', 'Knowledge', 'Permissions', 'Test Chat', 'Deploy'];
  ```
- [ ] Merge current Step 2 (Model) and Step 3 (Prompt) into a single **Personality** step (Step 2)
  - Keep all Model fields: AI model card selection, temperature slider, max response tokens
  - Add tone + writing style dropdowns (currently in Model)
  - Add system prompt textarea (currently in Prompt) below model settings
  - Add language selection dropdown (new field)
- [ ] Rename current Step 4 (Permissions with tools) to **Tools** (Step 3)
  - Keep all `ALLOWED_BOT_TOOLS` checkboxes
  - Add per-tool policy check indicator (badge showing if policy service allows the tool)
- [ ] Add new **Knowledge** step (Step 4) — see Sub-task 5.6.2
- [ ] Keep **Permissions** as Step 5 — but focus on user interaction permissions and escalation triggers (see Sub-task 5.6.4)
- [ ] Add new **Test Chat** step (Step 6) — see Sub-task 5.6.3
- [ ] Keep **Deploy** as Step 7 — update review summary to include new steps
- [ ] Update step navigation: Back/Next buttons, step indicator circles, `canAdvance()` validation
- [ ] Update `WizardForm` interface with new fields:
  ```tsx
  interface WizardForm {
    // Basics
    name: string;
    purpose: string;
    description: string;
    department: string;
    industryProfileId: string;
    // Personality
    aiModel: string;
    temperature: number;
    maxResponseTokens: number;
    tone: string;
    writingStyle: string;
    language: string;
    systemPrompt: string;
    // Tools (existing)
    enabledTools: string[];
    // Knowledge (new)
    knowledgeSources: KnowledgeSourceEntry[];
    // Permissions (new)
    escalationTriggers: string[];
    maxConversationLength: number;
    allowFileSharing: boolean;
    // Deploy
    deployOnCreate: boolean;
  }
  ```

### Sub-task 5.6.2 — Knowledge Sources Step

- [ ] Create inline Knowledge Sources step (Step 4) in the wizard
  - Reuse the pattern from `bots/[id]/knowledge/page.tsx` `AddSourceForm`
  - Show a list of added sources with type icon, name, and remove button
  - "Add Source" button opens an inline form (not a separate page)
- [ ] Source types with appropriate input fields:
  - **DOCUMENT**: Drag-and-drop file upload (PDF, TXT, MD, DOCX — max 10 MB)
  - **URL**: URL text input with basic validation
  - **TEXT**: Multi-line textarea for pasting content
  - **FAQ**: Structured Q&A textarea with format hints (`Q: …\nA: …`)
  - **API**: API endpoint / OpenAPI spec textarea (monospace font)
- [ ] Track sources in wizard state (`knowledgeSources` array) — don't persist until final create
  - Each entry: `{ sourceType, name, description?, content?, file? }`
  - Show count badge on step indicator: "Knowledge (3)"
- [ ] `canAdvance()` for this step: allow advancing with zero sources (optional step)
- [ ] Wire to API in `handleCreate` after bot creation:
  ```tsx
  // Step 4: Add knowledge sources
  for (const source of form.knowledgeSources) {
    await addSource({
      botId,
      serviceProviderId: spId,
      sourceType: source.sourceType,
      name: source.name,
      description: source.description,
      content: source.content,
      fileType: source.file?.name.split('.').pop(),
      fileSize: source.file?.size,
    });
  }
  ```

### Sub-task 5.6.3 — Dedicated Test Chat Step

- [ ] Move `BotTestPanel` from inline on Prompt step to a dedicated **Test Chat** step (Step 6)
- [ ] Expand the test panel to full-width layout:
  - Left side (60%): Chat interface with messages and input
  - Right side (40%): Configuration summary showing current personality settings (model, temperature, tone, prompt preview)
- [ ] Show test status indicators:
  - Policy decision badge (ALLOWED / DENIED) per message
  - Escalation indicator when bot escalates to human
  - Response time in ms
- [ ] Add "Clear Chat" button to reset test conversation
- [ ] Add pre-built test scenarios as quick-action buttons:
  ```tsx
  const TEST_SCENARIOS = [
    { label: 'Greeting', message: 'Hello, I need help' },
    { label: 'Complex Query', message: 'I want to file a complaint about my recent order #12345' },
    { label: 'Out of Scope', message: 'What is the meaning of life?' },
    { label: 'Escalation', message: 'I want to speak to a human agent' },
  ];
  ```
- [ ] Handle case where bot hasn't been created yet (test uses preview mode with `botId: 'test'`)
- [ ] Handle case where bot was created in an earlier step (use real `createdBotId`)

### Sub-task 5.6.4 — Permissions & Escalation Triggers

- [ ] Restructure Step 5 (Permissions) to focus on user interaction permissions:
  - **Conversation limits**: Max conversation length (number input)
  - **File sharing**: Toggle to allow/disallow file attachments in bot conversations
  - **Escalation triggers**: Configurable keyword/intent list that triggers human handoff
    ```tsx
    // Default escalation triggers
    const DEFAULT_ESCALATION_TRIGGERS = [
      'speak to human', 'talk to agent', 'escalate', 'complaint', 'manager',
    ];
    ```
  - **Auto-escalation**: Toggle + threshold for consecutive unresolved messages
- [ ] Keep tool permissions from Step 3 (Tools) visible as read-only summary
- [ ] Add escalation trigger input with tag-style UI:
  - Text input + Enter to add
  - Click "×" on tag to remove
  - Show default triggers as suggestions
- [ ] Wire new permission fields in `handleCreate`:
  ```tsx
  // Step 5: Set permissions (tools already set, add interaction permissions)
  await updateConfig({
    botId,
    escalationTriggers: form.escalationTriggers,
    maxConversationLength: form.maxConversationLength,
    allowFileSharing: form.allowFileSharing,
  });
  ```

### Sub-task 5.6.5 — Updated Deploy Step & Creation Flow

- [ ] Update Deploy/Review step (Step 7) to show all 6 previous steps:
  ```tsx
  const REVIEW_ITEMS = [
    { label: 'Name', value: form.name },
    { label: 'Purpose', value: purposeLabel },
    { label: 'Model', value: modelLabel },
    { label: 'Temperature', value: String(form.temperature) },
    { label: 'Tone / Style', value: `${form.tone} / ${form.writingStyle}` },
    { label: 'Language', value: form.language },
    { label: 'System Prompt', value: truncated prompt },
    { label: 'Enabled Tools', value: `${form.enabledTools.length} of ${ALLOWED_BOT_TOOLS.length}` },
    { label: 'Knowledge Sources', value: `${form.knowledgeSources.length} sources` },
    { label: 'Escalation Triggers', value: `${form.escalationTriggers.length} triggers` },
    { label: 'Max Conversation Length', value: String(form.maxConversationLength) },
  ];
  ```
- [ ] Update `handleCreate` to orchestrate the full 7-step creation:
  1. Create bot (name, purpose, description, department)
  2. Update configuration (model, temperature, tokens, tone, style, prompt, language, escalation, conversation limits)
  3. Set tool permissions (loop through enabled tools)
  4. Add knowledge sources (loop through sources)
  5. Set interaction permissions
  6. Deploy if requested (set status to ACTIVE)
- [ ] Add progress indicator during creation (show which step is executing):
  ```tsx
  const [createProgress, setCreateProgress] = useState<string>('');
  // "Creating bot..." → "Configuring..." → "Setting permissions..." → "Adding knowledge..." → "Deploying..."
  ```
- [ ] Handle partial failure: if creation succeeds but later steps fail, redirect to bot detail page with error toast suggesting manual completion
- [ ] Keep the deploy-immediately checkbox + draft warning

### Sub-task 5.6.6 — Step Validation & UX Polish

- [ ] Add `canAdvance()` validation for each step:
  - **Basics**: `name.length >= 2` and `purpose` selected (existing)
  - **Personality**: `aiModel` selected and `systemPrompt.length >= 10` (existing logic, combined)
  - **Tools**: Always valid (can have zero tools)
  - **Knowledge**: Always valid (optional)
  - **Permissions**: Always valid (has defaults)
  - **Test Chat**: Always valid (testing is optional)
  - **Deploy**: Always valid
- [ ] Add step completion indicators (green checkmark on completed steps)
- [ ] Allow clicking on any previously completed step to go back and edit
- [ ] Add unsaved changes warning if navigating away mid-wizard (`beforeunload`)
- [ ] Handle responsive layout: steps indicator should wrap on narrow screens
- [ ] Ensure wizard state persists during step navigation (already works via `useState`)
- [ ] Loading state on "Create" button with spinner and progress text

---

## Implementation Notes

### Hooks Available (from `@/lib/graphql/bots`)
```tsx
import {
  useCreateBot,              // POST /api/bots
  useUpdateBotConfiguration, // PUT /api/bots/{id}/configuration
  useSetBotPermission,       // PUT /api/bots/{id}/permissions
  useUpdateBot,              // PUT /api/bots/{id}
  useExecuteBotAction,       // POST /api/bots/{id}/actions
  useAddKnowledgeSource,     // POST /api/bots/{id}/knowledge
  ALLOWED_BOT_TOOLS,         // Static list of tool definitions
  BotStatus,
} from '@/lib/graphql/bots';
```

### API Wiring (per task2.md)
| Wizard Step | API Endpoint |
|-------------|-------------|
| Steps 1-2 (Basics + Personality) | `POST /api/bots` → `PUT /api/bots/{id}/configuration` |
| Step 3 (Tools) | `PUT /api/bots/{id}/permissions` |
| Step 4 (Knowledge) | `POST /api/bots/{id}/knowledge` (per source) |
| Step 5 (Permissions) | `PUT /api/bots/{id}/permissions` / `PUT /api/bots/{id}/configuration` |
| Step 6 (Test Chat) | `POST /api/bots/{id}/actions` with `actionType: 'test_prompt'` |
| Step 7 (Deploy) | `PUT /api/bots/{id}` with `status: 'ACTIVE'` |

### Knowledge Source Types (from existing `AddSourceForm`)
```tsx
type KnowledgeSourceType = 'DOCUMENT' | 'URL' | 'TEXT' | 'FAQ' | 'API';

const SOURCE_TYPE_ICONS: Record<string, typeof FileText> = {
  DOCUMENT: FileText,
  URL: Globe,
  TEXT: AlignLeft,
  FAQ: HelpCircle,
  API: Code,
};
```

### File Structure
Keep the wizard in a single page file (`bots/new/page.tsx`) but consider extracting step components if the file exceeds ~600 lines:
```
apps/provider/src/app/bots/new/
  page.tsx              # Main wizard orchestrator
```
If extraction needed:
```
apps/provider/src/components/bots/wizard/
  BasicsStep.tsx
  PersonalityStep.tsx
  ToolsStep.tsx
  KnowledgeStep.tsx
  PermissionsStep.tsx
  TestChatStep.tsx
  DeployStep.tsx
```

---

## Verification Checklist

- [ ] Wizard shows 7 steps in the step indicator with correct labels
- [ ] Step navigation (Back/Next) works across all 7 steps
- [ ] Clicking a completed step circles navigates back to that step
- [ ] Basics step: name validation (min 2 chars), purpose required
- [ ] Personality step: model selection, temperature slider, tone/style dropdowns, system prompt (min 10 chars)
- [ ] Tools step: all `ALLOWED_BOT_TOOLS` shown as checkboxes, can toggle each
- [ ] Knowledge step: can add DOCUMENT/URL/TEXT/FAQ/API sources, list shows added sources, can remove
- [ ] Permissions step: escalation trigger tag input works, conversation limit input, file sharing toggle
- [ ] Test Chat step: can send messages, bot responds, policy decisions shown, clear chat works
- [ ] Deploy step: review summary shows all configuration, deploy checkbox works, draft warning shown
- [ ] Full creation flow: bot created → configured → permissions set → knowledge added → deployed (if checked)
- [ ] Partial failure handled: redirects to bot detail page with error message
- [ ] Create button shows progress indicator during creation
- [ ] Permission check: non-bot-creators see "no permission" message
- [ ] Responsive layout: steps indicator wraps correctly on narrow viewports
