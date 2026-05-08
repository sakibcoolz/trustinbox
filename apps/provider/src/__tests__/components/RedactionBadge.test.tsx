import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  RedactionBadge,
  HighlightRedacted,
  detectRedactedTypes,
} from '@/components/ai/RedactionBadge';

describe('RedactionBadge', () => {
  it('renders the redacted label', () => {
    render(<RedactionBadge />);
    expect(screen.getByText(/PII Redacted/i)).toBeInTheDocument();
  });

  it('lists provided PII types', () => {
    render(<RedactionBadge types={['EMAIL', 'PHONE']} />);
    expect(screen.getByText(/Email, Phone/)).toBeInTheDocument();
  });

  it('exposes a tooltip with the redacted categories', () => {
    const { container } = render(<RedactionBadge types={['SSN']} />);
    const span = container.querySelector('span');
    expect(span?.getAttribute('title')).toContain('SSN');
  });
});

describe('HighlightRedacted', () => {
  it('wraps PII tokens in highlighted spans', () => {
    const { container } = render(
      <HighlightRedacted text="Customer [EMAIL] called from [PHONE]" />,
    );
    const highlighted = container.querySelectorAll('.text-accent-cyan');
    expect(highlighted.length).toBe(2);
    expect(highlighted[0].textContent).toBe('[EMAIL]');
    expect(highlighted[1].textContent).toBe('[PHONE]');
  });

  it('renders plain text when no tokens are present', () => {
    const { container } = render(<HighlightRedacted text="Hello world" />);
    expect(container.querySelector('.text-accent-cyan')).toBeNull();
    expect(container.textContent).toBe('Hello world');
  });
});

describe('detectRedactedTypes', () => {
  it('detects all known token types', () => {
    const types = detectRedactedTypes(
      'a [EMAIL] b [PHONE] c [SSN] d [CARD] e [NI_NUMBER]',
    );
    expect(types).toEqual(
      expect.arrayContaining(['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'NI_NUMBER']),
    );
    expect(types).toHaveLength(5);
  });

  it('returns an empty array when no tokens present', () => {
    expect(detectRedactedTypes('plain text')).toEqual([]);
  });

  it('deduplicates repeated tokens', () => {
    expect(detectRedactedTypes('[EMAIL] [EMAIL] [PHONE]')).toEqual(['EMAIL', 'PHONE']);
  });
});
