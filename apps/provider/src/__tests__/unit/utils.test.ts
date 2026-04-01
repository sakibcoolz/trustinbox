import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('joins class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, 'b', null, false, 'c')).toBe('a b c');
  });

  it('returns empty string with no truthy args', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('works with single class', () => {
    expect(cn('solo')).toBe('solo');
  });

  it('handles empty call', () => {
    expect(cn()).toBe('');
  });
});
