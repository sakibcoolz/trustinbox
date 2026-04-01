'use client';

import { useRef, useMemo, useCallback, type DependencyList } from 'react';

/**
 * Like useMemo, but uses a custom comparison function to decide
 * if the memoized value should be recalculated. Useful when deps
 * are objects/arrays that may be referentially different but equal.
 */
export function useMemoCompare<T>(
  factory: () => T,
  deps: DependencyList,
  isEqual: (prev: DependencyList, next: DependencyList) => boolean,
): T {
  const prevDepsRef = useRef<DependencyList>(deps);
  const valueRef = useRef<T>(undefined as T);
  const initialized = useRef(false);

  if (!initialized.current || !isEqual(prevDepsRef.current, deps)) {
    valueRef.current = factory();
    prevDepsRef.current = deps;
    initialized.current = true;
  }

  return valueRef.current;
}

/**
 * Stable callback that always calls the latest version of the function
 * but never changes identity. Useful for passing callbacks to memoized children.
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(((...args: never[]) => ref.current(...args)) as T, []);
}

/**
 * Memoizes the previous value and returns both current and previous.
 * Useful for animations or comparison logic.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);

  const previous = ref.current;
  ref.current = value;

  return previous;
}

/**
 * Shallow-compares two dependency arrays (used by useMemoCompare).
 */
export function shallowEqualDeps(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}
