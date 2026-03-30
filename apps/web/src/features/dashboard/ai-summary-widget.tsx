'use client';

import { useState, useMemo } from 'react';

interface ConversationSummary {
  id: string;
  provider: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  lastActivity: string;
}

interface NotificationDigest {
  category: string;
  count: number;
  highlight: string;
}

interface SmartCategory {
  label: string;
  count: number;
  color: string;
}

const mockSummaries: ConversationSummary[] = [
  { id: '1', provider: 'Acme Insurance', summary: 'Discussed auto policy renewal — renewal offer pending your review.', sentiment: 'positive', lastActivity: '2h ago' },
  { id: '2', provider: 'MedHealth Clinic', summary: 'Upcoming appointment confirmed for April 3rd at 10 AM.', sentiment: 'neutral', lastActivity: '5h ago' },
  { id: '3', provider: 'TechSupport Pro', summary: 'Support ticket #4521 resolved — issue with device setup fixed.', sentiment: 'positive', lastActivity: '1d ago' },
];

const mockDigest: NotificationDigest[] = [
  { category: 'Personal', count: 4, highlight: '2 messages from friends' },
  { category: 'Service Provider', count: 8, highlight: '1 document shared, 2 callback requests' },
  { category: 'Advertisement', count: 1, highlight: 'Acme Insurance — renewal promotion' },
];

const mockCategories: SmartCategory[] = [
  { label: 'Action Required', count: 3, color: 'chip-red' },
  { label: 'Informational', count: 7, color: 'chip-blue' },
  { label: 'Promotions', count: 1, color: 'chip-orange' },
  { label: 'Completed', count: 5, color: 'chip-green' },
];

type Tab = 'summaries' | 'digest' | 'categories';

export function AISummaryWidget() {
  const [tab, setTab] = useState<Tab>('summaries');
  const [digestPeriod, setDigestPeriod] = useState<'daily' | 'weekly'>('daily');

  const sentimentIcon = (s: string) => {
    if (s === 'positive') return <span className="text-status-success">↑</span>;
    if (s === 'negative') return <span className="text-accent-red">↓</span>;
    return <span className="text-text-muted">→</span>;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-text-primary">AI Insights</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-bg-tertiary rounded-lg p-0.5">
        {(['summaries', 'digest', 'categories'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-md text-2xs font-medium transition-colors capitalize ${tab === t ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}>
            {t === 'summaries' ? 'Conversations' : t === 'digest' ? 'Digest' : 'Smart Tags'}
          </button>
        ))}
      </div>

      {/* Conversation Summaries */}
      {tab === 'summaries' && (
        <div className="space-y-2">
          {mockSummaries.map((s) => (
            <div key={s.id} className="p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-primary">{s.provider}</span>
                <div className="flex items-center gap-2">
                  {sentimentIcon(s.sentiment)}
                  <span className="text-2xs text-text-muted">{s.lastActivity}</span>
                </div>
              </div>
              <p className="text-2xs text-text-secondary">{s.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Notification Digest */}
      {tab === 'digest' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setDigestPeriod('daily')}
              className={`px-3 py-1 rounded-full text-2xs font-medium ${digestPeriod === 'daily' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted'}`}>
              Daily
            </button>
            <button onClick={() => setDigestPeriod('weekly')}
              className={`px-3 py-1 rounded-full text-2xs font-medium ${digestPeriod === 'weekly' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted'}`}>
              Weekly
            </button>
          </div>
          <div className="space-y-2">
            {mockDigest.map((d) => (
              <div key={d.category} className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-text-primary">{d.category}</span>
                    <span className="badge-count">{d.count}</span>
                  </div>
                  <p className="text-2xs text-text-muted">{d.highlight}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-2xs text-text-muted text-center pt-1">
            {digestPeriod === 'daily' ? 'Summary for today' : 'Summary for this week'} · {mockDigest.reduce((s, d) => s + d.count, 0)} total notifications
          </p>
        </div>
      )}

      {/* Smart Categorization Badges */}
      {tab === 'categories' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {mockCategories.map((c) => (
              <div key={c.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary">
                <span className={`chip text-2xs ${c.color}`}>{c.label}</span>
                <span className="text-sm font-bold text-text-primary">{c.count}</span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-accent-purple/5 border border-accent-purple/20">
            <p className="text-2xs text-accent-purple font-medium mb-1">AI Recommendation</p>
            <p className="text-2xs text-text-secondary">
              You have 3 items requiring action: 1 callback request to approve, 1 document to review, and 1 conversation awaiting reply.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
