import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Star } from 'lucide-react';
import DashboardSummary from '@/components/DashboardSummary';

describe('DashboardSummary', () => {
  it('renders all 6 default KPI cards', () => {
    render(<DashboardSummary />);
    expect(screen.getByText('Active Customers')).toBeInTheDocument();
    expect(screen.getByText('Notifications (24h)')).toBeInTheDocument();
    expect(screen.getByText('Callbacks Pending')).toBeInTheDocument();
    expect(screen.getByText('Bot Conversations')).toBeInTheDocument();
    expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument();
  });

  it('displays KPI values', () => {
    render(<DashboardSummary />);
    expect(screen.getByText('12,480')).toBeInTheDocument();
    expect(screen.getByText('96.2%')).toBeInTheDocument();
  });

  it('displays change indicators', () => {
    render(<DashboardSummary />);
    expect(screen.getByText('+8.2%')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('renders custom KPIs when provided', () => {
    const customKPIs = [
      {
        label: 'Custom Metric',
        value: '1,000',
        change: '+10%',
        trending: 'up' as const,
        icon: Star,
      },
    ];
    render(<DashboardSummary kpis={customKPIs} />);
    expect(screen.getByText('Custom Metric')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<DashboardSummary />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('md:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-6');
  });
});
