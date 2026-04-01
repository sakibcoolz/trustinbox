'use client';

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';

interface VirtualListProps<T> {
  /** Full array of items */
  items: T[];
  /** Fixed height for each row in pixels */
  itemHeight: number;
  /** Visible viewport height in pixels */
  height: number;
  /** Number of extra items to render above/below viewport */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional className for the scrollable container */
  className?: string;
}

/**
 * Lightweight virtual scroll component for long lists.
 * Only renders visible rows + overscan buffer — avoids pulling in react-window.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 5,
  renderItem,
  className,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscan,
  );
  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, overflow: 'auto', position: 'relative' }}
      role="list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => (
          <div
            key={startIndex + i}
            role="listitem"
            style={{
              position: 'absolute',
              top: (startIndex + i) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
