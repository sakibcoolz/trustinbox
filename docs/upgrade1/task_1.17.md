# Task 1.17 — Tab Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Tabs.tsx`

---

## Objective

Build an underline-style tab component with lazy-loaded content panels for organizing content within pages.

---

## Current State

No tab component exists. Multi-section pages have no way to segment content.

---

## Requirements

### 1. Tab Appearance
- [x] Underline style: active tab has `border-b-2 border-accent-blue text-text-primary font-medium`
- [x] Inactive: `text-text-secondary hover:text-text-primary`
- [x] Tab row has bottom border: `border-b border-border-primary`
- [x] Optional icon before tab label

### 2. Tab Behavior
- [x] Click tab switches visible panel
- [x] Lazy rendering: panel content mounts only on first activation (remains mounted after)
- [x] Optional controlled mode (`activeTab` + `onTabChange` props)
- [x] Optional uncontrolled mode (internal state with `defaultTab`)
- [x] Tab content transition: fade-in on switch (100ms)

### 3. URL Sync
- [x] Optional `syncUrl` prop: active tab name sent to URL `?tab=name`
- [x] On page refresh, restores active tab from URL

### 4. Component API
```typescript
interface Tab {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  defaultTab?: string;
  onTabChange?: (key: string) => void;
  syncUrl?: boolean;
  children: React.ReactNode; // TabPanel children
}

interface TabPanelProps {
  tabKey: string;
  children: React.ReactNode;
}
```

---

## Implementation Plan

```tsx
export function Tabs({ tabs, activeTab: controlled, defaultTab, onTabChange, syncUrl, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultTab || tabs[0]?.key);
  const active = controlled ?? internal;
  const [mounted, setMounted] = useState<Set<string>>(new Set([active]));

  function switchTab(key: string) {
    setInternal(key);
    setMounted(prev => new Set(prev).add(key));
    onTabChange?.(key);
    if (syncUrl) { /* update URL search params */ }
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-border-primary" role="tablist">
        {tabs.map(tab => (
          <button key={tab.key} role="tab" aria-selected={active === tab.key} disabled={tab.disabled}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              active === tab.key
                ? 'border-accent-blue text-text-primary font-medium'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="flex items-center gap-2">
              {tab.icon && <tab.icon size={14} />}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-status-error text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">{tab.badge}</span>
              )}
            </span>
          </button>
        ))}
      </div>
      <div className="pt-4">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          const panelKey = (child.props as TabPanelProps).tabKey;
          if (!mounted.has(panelKey)) return null;
          return <div role="tabpanel" hidden={panelKey !== active}>{child}</div>;
        })}
      </div>
    </div>
  );
}

export function TabPanel({ children }: TabPanelProps) {
  return <>{children}</>;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Tabs.tsx` | Create |

---

## Acceptance Criteria

- [x] Active tab shows blue underline and bold text
- [x] Clicking tab switches panel content
- [x] Lazy rendering: panels mount on first view, then stay mounted
- [x] Badge count shows red pill on tab
- [x] Disabled tabs are non-interactive and dimmed
- [x] URL sync option preserves tab state across refresh
- [x] Accessible: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`

---

## Dependencies

- **Blocked by**: Task 1.11 (colors)
- **Blocks**: Tasks 10.7, 13.1, 15.1 (tabbed interfaces)
- **Related**: Task 17.8 (URL state management)
