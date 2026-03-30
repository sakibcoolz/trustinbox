'use client';

import { useState } from 'react';
import { Search, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  virtualId: string;
  displayName: string;
  type: string;
  lastContact: string;
  consent: string;
}

interface CustomerLookupProps {
  customers?: Customer[];
  onSelect?: (virtualId: string) => void;
}

const defaultCustomers: Customer[] = [
  { virtualId: 'VID-8a3f2b', displayName: 'Virtual User #8a3f2b', type: 'Customer', lastContact: '2024-03-10', consent: 'Active' },
  { virtualId: 'VID-4c9e1d', displayName: 'Virtual User #4c9e1d', type: 'Subscriber', lastContact: '2024-03-09', consent: 'Active' },
  { virtualId: 'VID-7f2a8c', displayName: 'Virtual User #7f2a8c', type: 'Customer', lastContact: '2024-03-08', consent: 'Active' },
];

export default function CustomerLookup({ customers = defaultCustomers, onSelect }: CustomerLookupProps) {
  const [query, setQuery] = useState('');

  const filtered = customers.filter((c) =>
    query === '' || c.virtualId.toLowerCase().includes(query.toLowerCase()) || c.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4">
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Search by Virtual ID…" />
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.map((c) => (
          <div key={c.virtualId}
            onClick={() => onSelect?.(c.virtualId)}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <User size={14} className="text-text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium">{c.virtualId}</p>
                <p className="text-xs text-text-muted">{c.type} · {c.lastContact}</p>
              </div>
            </div>
            <Link href={`/customers/${c.virtualId}`} onClick={(e) => e.stopPropagation()}>
              <ExternalLink size={14} className="text-text-muted hover:text-accent-blue" />
            </Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No customers found</p>
        )}
      </div>
    </div>
  );
}
