import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge, getStatusVariant } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-status-error');
  });

  it('shows dot indicator when dot prop is true', () => {
    const { container } = render(<Badge variant="success" dot>OK</Badge>);
    // Dot is an inner span with w-1.5 class
    const dot = container.querySelector('.rounded-full.shrink-0');
    expect(dot).toBeInTheDocument();
  });

  it('does not show dot by default', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    const dot = container.querySelector('.shrink-0');
    expect(dot).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Badge variant="info" className="my-extra">Info</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('my-extra');
  });
});

describe('StatusBadge', () => {
  it('renders DELIVERED as success variant', () => {
    const { container } = render(<StatusBadge status="DELIVERED" />);
    expect(screen.getByText('DELIVERED')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-status-success');
  });

  it('renders PENDING as warning variant', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-status-warning');
  });

  it('renders FAILED as error variant', () => {
    const { container } = render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-status-error');
  });

  it('replaces underscores with spaces in label', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('falls back to neutral for unknown status', () => {
    const { container } = render(<StatusBadge status="CUSTOM_STATUS" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-text-secondary');
  });
});

describe('getStatusVariant', () => {
  it.each([
    ['DELIVERED', 'success'],
    ['ACTIVE', 'success'],
    ['PENDING', 'warning'],
    ['FAILED', 'error'],
    ['DRAFT', 'neutral'],
    ['IN_PROGRESS', 'info'],
    ['QUEUED', 'cyan'],
    ['UNKNOWN', 'neutral'],
  ])('maps %s → %s', (status, expected) => {
    expect(getStatusVariant(status)).toBe(expected);
  });
});
