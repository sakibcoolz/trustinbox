# Task 10.7 — BotConfigEditor on Detail Page

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/bots/[id]`  
> **File**: `apps/provider/src/app/bots/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the bot detail page from hardcoded `mockBot` data to a GraphQL-powered view. Integrate the `BotConfigEditor` component with real `updateBotConfiguration` mutations. Show live stats from `BotAnalytics`, and provide tabs for Configuration, System Prompt, and Channels/Rules backed by real data.

---

## Current State

```tsx
// apps/provider/src/app/bots/[id]/page.tsx — 169 lines
const mockBot = {
  id: 'bot-1', name: 'Support Assistant', status: 'Active', model: 'GPT-4o',
  personality: 'Professional, helpful, concise', temperature: 0.7, maxTokens: 2048,
  systemPrompt: 'You are a helpful customer support assistant...', channels: ['Chat', 'In-App'],
  escalationRules: ['Billing disputes', 'Account deletion', 'Legal inquiries'],
  createdAt: '2024-02-15', lastActive: '2 min ago', conversations: 1240, avgRating: 4.6, escalationRate: '8.2%',
};
```

Also: standalone `BotConfigEditor.tsx` component (87 lines) exists but is NOT used by the detail page.

**Issues**:
- All data hardcoded — no GraphQL query
- `model`, `personality`, `temperature`, `maxTokens` are in the mock but belong to `BotConfiguration` type
- `channels`, `escalationRules` not in Configuration — they're JSON fields
- Stats (conversations, avgRating, escalationRate) should come from `BotAnalytics`
- `BotConfigEditor` not integrated — detail page has inline duplicate config form
- Save buttons non-functional
- No loading/error states

### GraphQL Schema

```graphql
query {
  bot(id: ID!, serviceProviderId: ID!): Bot!
  botConfiguration(botId: ID!, serviceProviderId: ID!): BotConfiguration!
  botPermissions(botId: ID!, serviceProviderId: ID!): [BotPermission!]!
}

type BotConfiguration {
  botId: ID!
  tone: String
  writingStyle: String
  supportedLanguages: [String!]!
  workingHoursStart: String
  workingHoursEnd: String
  workingDays: [Int!]!
  maxTurnsBeforeEscalation: Int
  escalationRulesJson: String
  humanHandoffPolicyJson: String
  customSystemPrompt: String
  temperature: Float
}
```

---

## Requirements

### 1. Data Integration

- Fetch `bot(id, serviceProviderId)` for basic info + analytics
- Fetch `botConfiguration(botId, serviceProviderId)` for config fields
- Fetch `botPermissions(botId, serviceProviderId)` for permission toggles

### 2. Header Section

| Element | Source |
|---------|--------|
| Bot name | `bot.name` |
| Avatar | `bot.avatarUrl` or initial fallback |
| Status badge | `bot.status` → mapped label + color |
| Purpose | `bot.purpose` |
| Created | `bot.createdAt` |
| Last Active | `bot.analytics.lastActiveAt` |

### 3. Stats Cards (from BotAnalytics)

| Metric | Source |
|--------|--------|
| Total Conversations | `bot.analytics.totalConversations` |
| Avg Rating | `bot.analytics.satisfactionScore` |
| Escalation Rate | `bot.analytics.escalationRate` |
| Resolution Rate | `bot.analytics.resolutionRate` |

### 4. Tabs

| Tab | Content | Save Mutation |
|-----|---------|---------------|
| Configuration | Model, temperature, tone, working hours, escalation settings | `updateBotConfiguration` |
| System Prompt | System prompt editor + test panel | `updateBotConfiguration` |
| Permissions | 10 tool toggles | `setBotPermission` per tool |

### 5. BotConfigEditor Integration

- Use the existing `BotConfigEditor` component in Configuration tab
- Extend it to include `tone`, `writingStyle`, `workingHours`
- Wire `onSave` to `updateBotConfiguration` mutation

### 6. Navigation Links

- Knowledge Sources → `/bots/[id]/knowledge`
- Analytics → `/bots/[id]/analytics`

---

## Implementation Plan

```tsx
'use client';

import { use } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_BOT, GET_BOT_CONFIGURATION } from '@/lib/graphql/bots';
import BotConfigEditor from '@/components/BotConfigEditor';

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { serviceProviderId } = useServiceProvider();

  const { data: botData, loading } = useQuery(GET_BOT, {
    variables: { id, serviceProviderId },
  });
  const { data: configData } = useQuery(GET_BOT_CONFIGURATION, {
    variables: { botId: id, serviceProviderId },
  });

  if (loading) return <BotDetailSkeleton />;
  const bot = botData?.bot;
  const config = configData?.botConfiguration;

  return (
    <div className="p-8 space-y-6">
      {/* Header with real bot data */}
      {/* Stats from bot.analytics */}
      {/* Tabs: Config / Prompt / Permissions */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/page.tsx` | **Modify** | Replace mock data with GraphQL queries, integrate BotConfigEditor |
| `apps/provider/src/components/BotConfigEditor.tsx` | **Modify** | Extend with tone, writingStyle, workingHours fields; wire onSave to mutation |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add GET_BOT, GET_BOT_CONFIGURATION queries |

---

## Acceptance Criteria

- [ ] Bot data fetched from `bot(id, serviceProviderId)` on mount
- [ ] Configuration fetched from `botConfiguration(botId, serviceProviderId)`
- [ ] Header shows name, avatar, status badge, purpose, created date, last active
- [ ] Stats cards show real analytics data
- [ ] Configuration tab uses BotConfigEditor with onSave → `updateBotConfiguration`
- [ ] System Prompt tab shows prompt editor + test panel
- [ ] Permissions tab shows tool toggles from `botPermissions` query
- [ ] Save buttons call correct mutations
- [ ] Loading/error states
- [ ] Mock data (`mockBot`, inline config form) fully removed
- [ ] Knowledge and Analytics navigation links work

---

## Dependencies

- **Blocked by**: Task 10.22 (GraphQL bot queries), Task 10.18 (updateBotConfiguration mutation)
- **Blocks**: Tasks 10.8, 10.9, 10.10 (activity log, status toggle, delete)
- **Related**: Task 10.6 (test panel — embedded in prompt tab)
