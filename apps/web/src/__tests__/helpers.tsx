/// <reference types="vitest/globals" />
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';

// ─── Types ──────────────────────────────────────────────

export interface MockUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string;
  role: string;
  virtualPublicId: string;
}

export interface MockAuthValue {
  user: MockUser | null;
  token: string | null;
  xmppToken: string | null;
  xmppJid: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  refreshAccessToken: ReturnType<typeof vi.fn>;
  updateAvatar: ReturnType<typeof vi.fn>;
}

// ─── Mock Factories ─────────────────────────────────────

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-1',
    username: 'testuser',
    fullName: 'Test User',
    email: 'test@example.com',
    avatar: '',
    role: 'CUSTOMER',
    virtualPublicId: 'VID-001',
    ...overrides,
  };
}

export function createMockAuthValue(overrides: Partial<MockAuthValue> = {}): MockAuthValue {
  const user = overrides.user ?? createMockUser();
  return {
    user,
    token: 'mock-jwt-token',
    xmppToken: 'mock-xmpp-token',
    xmppJid: 'user-1@trustinbox.local',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue('new-token'),
    updateAvatar: vi.fn(),
    ...overrides,
  };
}

export function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    type: 'GENERAL',
    title: 'Test Notification',
    body: 'Test notification body',
    read: false,
    createdAt: new Date().toISOString(),
    data: {},
    ...overrides,
  };
}

export function createMockCallback(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cb-1',
    serviceProviderName: 'Test Company',
    reason: 'Account inquiry',
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    preferredStart: new Date().toISOString(),
    preferredEnd: new Date(Date.now() + 3600000).toISOString(),
    approvedSlotStart: null,
    approvedSlotEnd: null,
    rejectionReason: null,
    ...overrides,
  };
}

export function createMockDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    name: 'Report.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
    serviceProviderName: 'Test Company',
    sharedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

export function createMockServiceProvider(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp-1',
    name: 'Test Company',
    industry: 'Technology',
    verified: true,
    trustScore: 85,
    description: 'A test service provider',
    ...overrides,
  };
}

export function createMockDNDRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dnd-1',
    scopeType: 'GLOBAL',
    startTime: '22:00',
    endTime: '07:00',
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    serviceProviderId: null,
    serviceProviderName: null,
    ...overrides,
  };
}

export function createMockAvailabilitySlot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    dayOfWeek: 'MON',
    startTime: '09:00',
    endTime: '17:00',
    ...overrides,
  };
}

export function createMockPrivacyPreference(overrides: Record<string, unknown> = {}) {
  return {
    allowPersonalNotifications: true,
    allowSPNotifications: true,
    allowAdvertisements: false,
    allowCallbackRequests: true,
    allowChat: true,
    allowDocumentShares: true,
    requireCallApproval: true,
    ...overrides,
  };
}

// ─── Fetch Mock Helpers ─────────────────────────────────

export interface FetchMockRoute {
  url: string | RegExp;
  method?: string;
  response: unknown;
  status?: number;
}

export function setupFetchMock(routes: FetchMockRoute[] = []) {
  const originalFetch = global.fetch;
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();

    for (const route of routes) {
      const urlMatch = typeof route.url === 'string' ? url.includes(route.url) : route.url.test(url);
      const methodMatch = !route.method || route.method.toUpperCase() === method;
      if (urlMatch && methodMatch) {
        return new Response(JSON.stringify(route.response), {
          status: route.status ?? 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }) as typeof global.fetch;

  return () => { global.fetch = originalFetch; };
}

// ─── Apollo Mock Helper ─────────────────────────────────

export function createApolloMock(
  query: MockedResponse['request']['query'],
  variables: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): MockedResponse {
  return {
    request: { query, variables },
    result: { data },
  };
}

export function createApolloErrorMock(
  query: MockedResponse['request']['query'],
  variables: Record<string, unknown> | undefined,
  errorMessage: string,
): MockedResponse {
  return {
    request: { query, variables },
    error: new Error(errorMessage),
  };
}

// ─── Render with Providers ──────────────────────────────

// Mock auth context module — re-exported for tests to override
let mockAuthValue: MockAuthValue = createMockAuthValue();

export function setMockAuth(value: MockAuthValue) {
  mockAuthValue = value;
}

export function getMockAuth() {
  return mockAuthValue;
}

interface WrapperOptions {
  auth?: Partial<MockAuthValue>;
  apolloMocks?: MockedResponse[];
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperOptions & { renderOptions?: Omit<RenderOptions, 'wrapper'> } = {},
) {
  const { apolloMocks = [], renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={apolloMocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
