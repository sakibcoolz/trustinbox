'use client';

import { ArrowRight } from 'lucide-react';
import type { ServiceProviderMembership } from '@/lib/graphql/types';

interface ServiceProviderPickerProps {
  spList: ServiceProviderMembership[];
  onSelect: (sp: ServiceProviderMembership) => void;
}

export function ServiceProviderPicker({ spList, onSelect }: ServiceProviderPickerProps) {
  return (
    <div className="space-y-2">
      {spList.map((sp) => (
        <button
          key={sp.id}
          onClick={() => onSelect(sp)}
          className="w-full flex items-center gap-3 px-4 py-3 border border-border-secondary rounded-lg hover:bg-bg-hover hover:border-accent-blue/30 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-semibold shrink-0">
            {sp.logoUrl ? (
              <img src={sp.logoUrl} alt={sp.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              sp.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{sp.name}</p>
            <p className="text-xs text-text-muted">
              {sp.industry} · <span className="capitalize">{sp.role.replace('_', ' ').toLowerCase()}</span>
            </p>
          </div>
          <ArrowRight
            size={16}
            className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      ))}
    </div>
  );
}
