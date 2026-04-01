'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { SEGMENT_LABELS } from '@/lib/constants';

export function Breadcrumb() {
  const pathname = usePathname();

  // Don't show on dashboard root
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  // Limit visible segments — collapse middle with ... if > 4
  const crumbs = segments.map((segment, i) => ({
    label: SEGMENT_LABELS[segment] || formatSegment(segment),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  // If more than 4 segments, collapse middle
  const visible = crumbs.length > 4
    ? [crumbs[0], { label: '…', href: '', isLast: false }, ...crumbs.slice(-2)]
    : crumbs;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      <Link href="/" className="text-text-secondary hover:text-accent-blue transition-colors">
        Dashboard
      </Link>
      {visible.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={10} className="text-text-muted" />
          {crumb.isLast || !crumb.href ? (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-text-secondary hover:text-accent-blue transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function formatSegment(segment: string): string {
  // If it looks like a UUID, truncate
  if (/^[0-9a-f]{8}-/.test(segment)) return segment.slice(0, 8) + '…';
  // Capitalize words
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
