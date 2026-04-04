import '@testing-library/jest-dom/vitest';

// ─── Mock next/navigation ───────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// ─── Mock next/image ────────────────────────────────────

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

// ─── Mock IntersectionObserver ──────────────────────────

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', { value: MockIntersectionObserver });

// ─── Mock matchMedia ────────────────────────────────────

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Mock localStorage ──────────────────────────────────

const localStorageStore: Record<string, string> = {};

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
    removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
    clear: vi.fn(() => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); }),
    get length() { return Object.keys(localStorageStore).length; },
    key: vi.fn((i: number) => Object.keys(localStorageStore)[i] ?? null),
  },
});

// ─── Mock EventSource (SSE) ─────────────────────────────

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = MockEventSource.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  private listeners: Record<string, Array<(ev: MessageEvent) => void>> = {};

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      const openListeners = this.listeners['open'] || [];
      openListeners.forEach((cb) => cb(new MessageEvent('open')));
      this.onopen?.(new Event('open'));
    }, 0);
  }

  addEventListener(type: string, cb: (ev: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  removeEventListener(type: string, cb: (ev: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== cb);
    }
  }

  close() { this.readyState = MockEventSource.CLOSED; }

  // Test helper — emit event from outside
  __emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    (this.listeners[type] || []).forEach((cb) => cb(event));
    if (type === 'message') this.onmessage?.(event);
  }
}

Object.defineProperty(window, 'EventSource', { value: MockEventSource });

// ─── Mock Audio (for notification sounds) ───────────────

Object.defineProperty(window, 'Audio', {
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    volume: 1,
    currentTime: 0,
  })),
});

// ─── Mock Notification API ──────────────────────────────

Object.defineProperty(window, 'Notification', {
  value: Object.assign(vi.fn(), { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') }),
});

// ─── Mock navigator.serviceWorker ───────────────────────

Object.defineProperty(navigator, 'serviceWorker', {
  value: { register: vi.fn().mockResolvedValue({}) },
  writable: true,
});
