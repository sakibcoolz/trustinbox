import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DelegationTimeline } from '@/components/ai/DelegationTimeline';
import type { AgentDelegationLog, Bot } from '@/lib/types';

function makeDelegation(overrides: Partial<AgentDelegationLog> = {}): AgentDelegationLog {
  return {
    id: 'd-1',
    managerBotId: 'bot-mgr',
    targetBotId: 'bot-cs',
    serviceProviderId: 'sp-1',
    threadId: 't-1',
    delegationDepth: 0,
    confidenceScore: 0.9,
    inputSummary: 'hello [EMAIL]',
    outputSummary: 'routed',
    durationMs: 50,
    success: true,
    createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

const BOTS: Bot[] = [
  {
    id: 'bot-mgr',
    name: 'Manager',
    status: 'ACTIVE',
    agentType: 'MANAGER',
    model: 'gpt-4',
    provider: 'openai',
    totalInteractions: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'bot-cs',
    name: 'Support',
    status: 'ACTIVE',
    agentType: 'CUSTOMER_SERVICE',
    model: 'gpt-4',
    provider: 'openai',
    totalInteractions: 0,
    createdAt: '',
    updatedAt: '',
  },
];

describe('DelegationTimeline', () => {
  it('shows empty state when no delegations', () => {
    render(<DelegationTimeline delegations={[]} />);
    expect(screen.getByText(/No agent delegations/i)).toBeInTheDocument();
  });

  it('renders bot names from provided bot list', () => {
    render(<DelegationTimeline delegations={[makeDelegation()]} bots={BOTS} />);
    expect(screen.getByText(/Manager/)).toBeInTheDocument();
    expect(screen.getByText(/Support/)).toBeInTheDocument();
  });

  it('marks max-depth delegations with the error styling', () => {
    const { container } = render(
      <DelegationTimeline delegations={[makeDelegation({ delegationDepth: 3 })]} bots={BOTS} />,
    );
    expect(container.querySelector('.border-status-error\\/30')).toBeInTheDocument();
    expect(screen.getByText(/max/i)).toBeInTheDocument();
  });

  it('orders delegations chronologically', () => {
    render(
      <DelegationTimeline
        delegations={[
          makeDelegation({
            id: 'd-2',
            createdAt: new Date('2025-01-01T00:01:00Z').toISOString(),
            intentDetected: 'second',
          }),
          makeDelegation({
            id: 'd-1',
            createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
            intentDetected: 'first',
          }),
        ]}
        bots={BOTS}
      />,
    );
    const intents = screen.getAllByText(/^(first|second)$/);
    expect(intents[0].textContent).toBe('first');
    expect(intents[1].textContent).toBe('second');
  });
});
