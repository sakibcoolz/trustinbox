'use client';

import { useState, use } from 'react';
import { ArrowLeft, Bot, Settings, Database, BarChart3, Play, Pause, Code, Globe } from 'lucide-react';
import Link from 'next/link';

const mockBot = {
  id: 'bot-1',
  name: 'Support Assistant',
  status: 'Active',
  model: 'GPT-4o',
  personality: 'Professional, helpful, concise',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful customer support assistant for our platform. Be professional, accurate, and concise. If you cannot answer a question, offer to escalate to a human agent.',
  channels: ['Chat', 'In-App'],
  escalationRules: ['Billing disputes', 'Account deletion', 'Legal inquiries'],
  createdAt: '2024-02-15',
  lastActive: '2 min ago',
  conversations: 1240,
  avgRating: 4.6,
  escalationRate: '8.2%',
};

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<'config' | 'prompt' | 'channels'>('config');
  const b = mockBot;

  const tabs = [
    { key: 'config', label: 'Configuration', icon: Settings },
    { key: 'prompt', label: 'System Prompt', icon: Code },
    { key: 'channels', label: 'Channels & Rules', icon: Globe },
  ] as const;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bots" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
              <Bot size={20} className="text-accent-purple" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{b.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">{b.status}</span>
              </div>
              <p className="text-text-secondary text-sm mt-0.5">Created {b.createdAt} · Last active {b.lastActive}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/bots/${id}/knowledge`}
            className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Database size={14} /> Knowledge
          </Link>
          <Link href={`/bots/${id}/analytics`}
            className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            <BarChart3 size={14} /> Analytics
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Conversations', value: b.conversations.toLocaleString() },
          { label: 'Avg Rating', value: `${b.avgRating}/5` },
          { label: 'Escalation Rate', value: b.escalationRate },
          { label: 'Model', value: b.model },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Model Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Model</label>
              <select defaultValue={b.model}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>GPT-4o</option>
                <option>GPT-4-turbo</option>
                <option>GPT-3.5-turbo</option>
                <option>Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Personality</label>
              <input type="text" defaultValue={b.personality}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Temperature ({b.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" defaultValue={b.temperature}
                className="w-full accent-accent-blue" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Max Tokens</label>
              <input type="number" defaultValue={b.maxTokens}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
            </div>
          </div>
          <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            Save Configuration
          </button>
        </div>
      )}

      {tab === 'prompt' && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">System Prompt</h3>
          <textarea defaultValue={b.systemPrompt} rows={8}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-border-active resize-none" />
          <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            Update Prompt
          </button>
        </div>
      )}

      {tab === 'channels' && (
        <div className="space-y-6">
          <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold">Active Channels</h3>
            <div className="flex gap-2">
              {['Chat', 'In-App', 'WhatsApp', 'SMS'].map((ch) => (
                <label key={ch} className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked={b.channels.includes(ch)} className="accent-accent-blue" />
                  <span className="text-sm text-text-primary">{ch}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold">Escalation Rules</h3>
            <p className="text-xs text-text-muted">Topics that will automatically escalate to a human agent</p>
            <div className="space-y-2">
              {b.escalationRules.map((rule) => (
                <div key={rule} className="flex items-center justify-between px-3 py-2 bg-bg-tertiary rounded-lg">
                  <span className="text-sm text-text-primary">{rule}</span>
                  <button className="text-xs text-status-error hover:underline">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
