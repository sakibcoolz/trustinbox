import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-bg-card');
    expect(card.className).toContain('rounded-xl');
  });

  it('applies elevated variant', () => {
    const { container } = render(<Card variant="elevated">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-bg-elevated');
    expect(card.className).toContain('shadow-lg');
  });

  it('applies interactive variant', () => {
    const { container } = render(<Card variant="interactive">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cursor-pointer');
  });

  it('applies padding', () => {
    const { container } = render(<Card padding="lg">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-6');
  });

  it('removes border when noBorder is true', () => {
    const { container } = render(<Card noBorder>Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-0');
  });

  it('passes additional className', () => {
    const { container } = render(<Card className="w-full">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('w-full');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="My Title" />);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<CardHeader title="Title" description="A description" />);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(<CardHeader title="Title" action={<button>Edit</button>} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<CardHeader title="Title" />);
    const desc = container.querySelector('p');
    expect(desc).not.toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Inner content</CardContent>);
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter><button>Save</button></CardFooter>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('has border-t class', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('border-t');
  });
});
