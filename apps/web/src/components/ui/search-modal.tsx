'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { results, loading } = useGlobalSearch(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const allResults: SearchResult[] = [
    ...results.notifications,
    ...results.conversations,
    ...results.serviceProviders,
    ...results.documents,
  ];

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(result.href);
    onClose();
  }, [router, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      handleSelect(allResults[selectedIndex]);
    }
  }, [allResults, selectedIndex, handleSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-bg-card border border-border-primary rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notifications, conversations, providers..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">Type to search across all resources</p>
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-text-muted">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <>
              {results.notifications.length > 0 && (
                <ResultGroup
                  label="Notifications"
                  results={results.notifications}
                  allResults={allResults}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                />
              )}
              {results.conversations.length > 0 && (
                <ResultGroup
                  label="Conversations"
                  results={results.conversations}
                  allResults={allResults}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                />
              )}
              {results.serviceProviders.length > 0 && (
                <ResultGroup
                  label="Service Providers"
                  results={results.serviceProviders}
                  allResults={allResults}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                />
              )}
              {results.documents.length > 0 && (
                <ResultGroup
                  label="Documents"
                  results={results.documents}
                  allResults={allResults}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  label,
  results,
  allResults,
  selectedIndex,
  onSelect,
}: {
  label: string;
  results: SearchResult[];
  allResults: SearchResult[];
  selectedIndex: number;
  onSelect: (r: SearchResult) => void;
}) {
  return (
    <div>
      <div className="px-4 py-2 text-2xs font-semibold text-text-muted uppercase tracking-wider bg-bg-secondary/50">
        {label}
      </div>
      {results.slice(0, 5).map((result) => {
        const globalIdx = allResults.findIndex((r) => r.id === result.id && r.type === result.type);
        const isSelected = globalIdx === selectedIndex;
        return (
          <button
            key={`${result.type}-${result.id}`}
            onClick={() => onSelect(result)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              isSelected ? 'bg-accent-blue/10' : 'hover:bg-bg-hover'
            }`}
          >
            <span className="text-sm text-text-primary truncate">{result.title}</span>
            {result.subtitle && (
              <span className="text-xs text-text-muted truncate ml-auto shrink-0">{result.subtitle}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
