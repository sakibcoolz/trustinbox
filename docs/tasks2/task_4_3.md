# Task 4.3 — Global Search (Cmd+K)

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.3 — Global Search (Cmd+K)
> **Files**: `apps/web/src/components/ui/search-modal.tsx` (new), `apps/web/src/components/layout/header.tsx`, `apps/web/src/hooks/useGlobalSearch.ts` (new), `apps/web/src/lib/graphql/search.ts` (new)
> **Dependencies**: Phase 3 (pages wired to real data for search results)
> **Reference**: `apps/provider/src/components/Header.tsx` — SearchModal implementation

---

## Objective

Build a global search command palette (Cmd+K / Ctrl+K) that searches across notifications, conversations, documents, and service providers. Provides grouped, navigable results with keyboard support, debounced input, and loading states. Replace the current static search input in the header with a trigger that opens the modal.

---

## Current State

### Header Search — Static Input (Not Functional)
```typescript
// apps/web/src/components/layout/header.tsx — center section
<div className="flex-1 max-w-sm mx-4 hidden md:block">
  <div className="relative">
    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" ...>
      <path ... d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search messages, people, files..."
      className="w-full bg-bg-tertiary border border-border-primary rounded-lg pl-8 pr-3 py-1.5 text-sm ..."
    />
  </div>
</div>
```
- Input exists but `search` state is local and does nothing
- No search results, no API calls, no navigation
- No keyboard shortcut

### Provider App Reference — SearchModal
```typescript
// apps/provider/src/components/Header.tsx — Working reference implementation
// - Cmd+K / Ctrl+K keyboard shortcut
// - Fixed overlay modal at 15vh from top
// - Search input with ESC key hint
// - Placeholder results area
// - Backdrop blur with click-to-dismiss
// - animate-modal-in animation
```

### No Search GraphQL Query
```
❌ No dedicated `search` query in GraphQL schema
✅ serviceProviders(search: String, ...) — has search parameter
✅ notifications(category, status, ...) — filterable but no text search
✅ In-memory: SSE notifications buffer, chat conversations — searchable client-side
```

---

## Requirements

### 4.3.1 — Create Search Modal Component
- [x] Create `apps/web/src/components/ui/search-modal.tsx`:
  - [x] Full-screen overlay with backdrop blur (`bg-black/50 backdrop-blur-sm`)
  - [x] Centered modal card (max-w-lg, 15vh from top)
  - [x] Search input with auto-focus on open
  - [x] ESC key to close, click backdrop to close
  - [x] Keyboard shortcut hint badge (`⌘K` / `Ctrl+K`)
  - [x] Loading spinner during search
  - [x] Grouped results sections: Notifications, Conversations, Service Providers, Documents
  - [x] Empty state: "No results found for [query]"
  - [x] Initial state: "Type to search across all resources"
  - [x] Keyboard navigation: Arrow Up/Down to navigate, Enter to select

### 4.3.2 — Create Global Search Hook
- [x] Create `apps/web/src/hooks/useGlobalSearch.ts`:
  - [x] Accept `query: string` parameter
  - [x] Debounce search by 300ms
  - [x] Search across multiple sources in parallel:
    - Notifications: client-side filter from SSE buffer by title/body match
    - Conversations: client-side filter from chat context by participant name
    - Service Providers: GraphQL `serviceProviders(search: query)` query
    - Documents: client-side filter from documents by name (if loaded)
  - [x] Return `{ results: SearchResults, loading: boolean, error: Error | null }`
  - [x] Cancel in-flight requests when query changes

### 4.3.3 — Wire Keyboard Shortcut
- [x] In `header.tsx` or `search-modal.tsx`:
  - [x] Listen for `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) keydown
  - [x] `e.preventDefault()` to prevent browser default behavior
  - [x] Toggle search modal open/closed
  - [x] Register listener on mount, cleanup on unmount

### 4.3.4 — Replace Header Search Input
- [x] Update `apps/web/src/components/layout/header.tsx`:
  - [x] Replace the static `<input>` with a clickable trigger button
  - [x] Button shows search icon + "Search..." placeholder + `⌘K` badge
  - [x] Click → opens search modal
  - [x] Remove `search` local state variable
  - [x] Also accessible from mobile via a search icon in the header

### 4.3.5 — Navigate on Result Selection
- [x] Each search result item → navigable:
  - [x] Notification → `/inbox?id=<notification-id>`
  - [x] Conversation → `/conversations` (select conversation)
  - [x] Service Provider → `/service-providers` or `/service-providers/<sp-id>`
  - [x] Document → `/documents?id=<doc-id>`
- [x] Close modal after navigation
- [x] Use `router.push()` from `next/navigation`

---

## Implementation Details

### Search Result Types

```typescript
// apps/web/src/hooks/useGlobalSearch.ts

interface SearchResult {
  id: string;
  type: 'notification' | 'conversation' | 'service-provider' | 'document';
  title: string;
  subtitle: string;
  href: string;
  icon: 'inbox' | 'chat' | 'building' | 'file';
}

interface SearchResults {
  notifications: SearchResult[];
  conversations: SearchResult[];
  serviceProviders: SearchResult[];
  documents: SearchResult[];
  total: number;
}
```

### Search Modal Component

```tsx
// apps/web/src/components/ui/search-modal.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { results, loading } = useGlobalSearch(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const allResults = [
    ...results.notifications,
    ...results.conversations,
    ...results.serviceProviders,
    ...results.documents,
  ];

  const handleSelect = useCallback((result: { href: string }) => {
    router.push(result.href);
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    }
  }, [allResults, selectedIndex, handleSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-bg-card border border-border-primary rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notifications, conversations, providers, files..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">Type to search across all resources</p>
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {results.notifications.length > 0 && (
                <ResultGroup label="Notifications" results={results.notifications} />
              )}
              {results.conversations.length > 0 && (
                <ResultGroup label="Conversations" results={results.conversations} />
              )}
              {results.serviceProviders.length > 0 && (
                <ResultGroup label="Service Providers" results={results.serviceProviders} />
              )}
              {results.documents.length > 0 && (
                <ResultGroup label="Documents" results={results.documents} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, results }: { label: string; results: SearchResult[] }) {
  return (
    <div>
      <div className="px-4 py-2 text-2xs font-semibold text-text-muted uppercase tracking-wider bg-bg-secondary/50">
        {label}
      </div>
      {results.slice(0, 5).map((result) => (
        <button
          key={result.id}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover transition-colors"
        >
          <span className="text-sm text-text-primary truncate">{result.title}</span>
          <span className="text-xs text-text-muted truncate ml-auto">{result.subtitle}</span>
        </button>
      ))}
    </div>
  );
}
```

### Header Trigger Button (replaces static input)

```tsx
// Updated header center section
<div className="flex-1 max-w-sm mx-4 hidden md:block">
  <button
    onClick={() => setSearchOpen(true)}
    className="w-full flex items-center gap-2 bg-bg-tertiary border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-muted hover:border-border-hover transition-colors"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
    <span className="flex-1 text-left">Search...</span>
    <kbd className="px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] font-mono">
      ⌘K
    </kbd>
  </button>
</div>
```

### Keyboard Shortcut Registration

```typescript
// In header.tsx or search-modal parent
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Search Hook with Debounce

```typescript
// apps/web/src/hooks/useGlobalSearch.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_SERVICE_PROVIDERS } from '@/lib/graphql/search';

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const { notifications } = useNotifications();
  const { conversations } = useChat();
  const timerRef = useRef<NodeJS.Timeout>();
  const [searchSPs] = useLazyQuery(SEARCH_SERVICE_PROVIDERS);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(emptyResults);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const q = query.toLowerCase();

      // Client-side: notifications
      const notifResults = notifications
        .filter((n) => n.title.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          type: 'notification' as const,
          title: n.title,
          subtitle: n.category || '',
          href: `/inbox?id=${n.id}`,
          icon: 'inbox' as const,
        }));

      // Client-side: conversations
      const convResults = conversations
        .filter((c) => c.participantName?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          type: 'conversation' as const,
          title: c.participantName || 'Conversation',
          subtitle: c.lastMessage?.text?.slice(0, 50) || '',
          href: '/conversations',
          icon: 'chat' as const,
        }));

      // Server-side: service providers
      let spResults: SearchResult[] = [];
      try {
        const { data } = await searchSPs({ variables: { search: query, limit: 5 } });
        spResults = (data?.serviceProviders?.nodes || []).map((sp: any) => ({
          id: sp.id,
          type: 'service-provider' as const,
          title: sp.name,
          subtitle: sp.industry || '',
          href: `/service-providers`,
          icon: 'building' as const,
        }));
      } catch { /* ignore search errors */ }

      setResults({
        notifications: notifResults,
        conversations: convResults,
        serviceProviders: spResults,
        documents: [], // TODO: wire when documents query available
        total: notifResults.length + convResults.length + spResults.length,
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query, notifications, conversations, searchSPs]);

  return { results, loading };
}
```

---

## Verification

- [x] `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) opens the search modal
- [x] Header search area shows trigger button with `⌘K` hint
- [x] Clicking header search trigger opens the modal
- [x] Search input auto-focuses on modal open
- [x] ESC closes the modal, backdrop click closes the modal
- [x] Typing query → 300ms debounce → results appear grouped by type
- [x] Results sections: Notifications, Conversations, Service Providers (Documents when available)
- [x] Arrow Up/Down navigates results, Enter selects and navigates
- [x] Empty query shows "Type to search..." message
- [x] No results shows "No results found for [query]" message
- [x] Loading spinner shows during search
- [x] Selecting a result navigates to correct page and closes modal
- [x] Works on mobile via search icon (no keyboard shortcut needed)
- [x] No body scroll while modal is open
