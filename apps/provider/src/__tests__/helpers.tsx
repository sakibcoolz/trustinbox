/// <reference types="vitest/globals" />
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import type { MeUser, ServiceProviderDetail, ServiceProviderMembership } from '@/lib/graphql/types';

// ─── Mock Auth Context ──────────────────────────────────

interface MockAuthValue {
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: string | null;
  activeServiceProvider: ServiceProviderDetail | null;
  serviceProviders: ServiceProviderMembership[];
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
  switchServiceProvider: ReturnType<typeof vi.fn>;
}

const defaultAuthValue: MockAuthValue = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  role: null,
  activeServiceProvider: null,
  serviceProviders: [],
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  switchServiceProvider: vi.fn(),
};

export function createMockUser(overrides: Partial<MeUser> = {}): MeUser {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    username: 'admin',
    role: 'SP_ADMIN',
    activeServiceProvider: {
      id: 'sp-1',
      name: 'Test Company',
      industry: 'Technology',
      status: 'ACTIVE',
      memberCount: 5,
      createdAt: new Date().toISOString(),
    } as ServiceProviderDetail,
    serviceProviders: [
      { id: 'sp-1', name: 'Test Company', industry: 'Technology', role: 'SP_ADMIN', status: 'ACTIVE' } as ServiceProviderMembership,
    ],
    ...overrides,
  } as MeUser;
}

export function createAuthValue(overrides: Partial<MockAuthValue> = {}): MockAuthValue {
  const user = overrides.user ?? createMockUser();
  return {
    ...defaultAuthValue,
    user,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    activeServiceProvider: (user as MeUser)?.activeServiceProvider ?? null,
    serviceProviders: (user as MeUser)?.serviceProviders ?? [],
    ...overrides,
  };
}

// We need to mock the module at test level. This provides the value for the mock.
let currentAuthValue: MockAuthValue = defaultAuthValue;

export function setMockAuthValue(value: MockAuthValue) {
  currentAuthValue = value;
}

export function getMockAuthValue() {
  return currentAuthValue;
}

// ─── Wrapper Providers ──────────────────────────────────

interface WrapperOptions {
  auth?: Partial<MockAuthValue>;
  mocks?: MockedResponse[];
}

export function createWrapper({ auth, mocks = [] }: WrapperOptions = {}) {
  const authValue = createAuthValue(auth);
  setMockAuthValue(authValue);

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperOptions & { renderOptions?: Omit<RenderOptions, 'wrapper'> } = {},
) {
  const { auth, mocks, renderOptions } = options;
  const Wrapper = createWrapper({ auth, mocks });
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ─── Mock Data Factories ────────────────────────────────

export function createMockNotification(overrides = {}) {
  return {
    id: 'notif-1',
    subject: 'Test Notification',
    body: 'Test body',
    category: 'ORGANIZATIONAL',
    channel: 'PUSH',
    status: 'DELIVERED',
    recipientVirtualId: 'VID-001',
    createdAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCallback(overrides = {}) {
  return {
    id: 'cb-1',
    customerId: 'VID-001',
    customerName: 'Jane Doe',
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    preferredTime: new Date().toISOString(),
    reason: 'Account inquiry',
    assignedAgentId: null,
    ...overrides,
  };
}

export function createMockConversation(overrides = {}) {
  return {
    id: 'conv-1',
    participantVirtualId: 'VID-001',
    participantName: 'Jane Doe',
    lastMessage: 'Hello, how can I help?',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    status: 'ACTIVE',
    ...overrides,
  };
}

export function createMockCampaign(overrides = {}) {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    status: 'DRAFT',
    category: 'ORGANIZATIONAL',
    audienceSize: 100,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockWebhook(overrides = {}) {
  return {
    id: 'wh-1',
    url: 'https://example.com/webhook',
    events: ['NotificationDelivered', 'CallbackCreated'],
    status: 'ACTIVE',
    failureCount: 0,
    maxRetries: 5,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockBot(overrides = {}) {
  return {
    id: 'bot-1',
    name: 'Test Bot',
    description: 'A test bot',
    status: 'ACTIVE',
    model: 'gpt-4',
    totalInteractions: 42,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
