import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';

describe('Tabs', () => {
  const tabs = [
    { key: 'tab1', label: 'First Tab' },
    { key: 'tab2', label: 'Second Tab' },
    { key: 'tab3', label: 'Third Tab', disabled: true },
  ];

  it('renders all tab buttons', () => {
    render(
      <Tabs tabs={tabs}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
        <TabPanel tabKey="tab3">Content 3</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'First Tab' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second Tab' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Third Tab' })).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    render(
      <Tabs tabs={tabs}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
      </Tabs>,
    );
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('switches tabs on click', () => {
    render(
      <Tabs tabs={tabs}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
      </Tabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Second Tab' }));
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('calls onTabChange callback', () => {
    const onChange = vi.fn();
    render(
      <Tabs tabs={tabs} onTabChange={onChange}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
      </Tabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Second Tab' }));
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('does not switch to disabled tab', () => {
    const onChange = vi.fn();
    render(
      <Tabs tabs={tabs} onTabChange={onChange}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab3">Content 3</TabPanel>
      </Tabs>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Third Tab' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks active tab with aria-selected', () => {
    render(
      <Tabs tabs={tabs}>
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'First Tab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Second Tab' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders tab badges', () => {
    const tabsWithBadge = [
      { key: 'tab1', label: 'Inbox', badge: 5 },
    ];
    render(
      <Tabs tabs={tabsWithBadge}>
        <TabPanel tabKey="tab1">Content</TabPanel>
      </Tabs>,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('respects defaultTab prop', () => {
    render(
      <Tabs tabs={tabs} defaultTab="tab2">
        <TabPanel tabKey="tab1">Content 1</TabPanel>
        <TabPanel tabKey="tab2">Content 2</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Second Tab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});
