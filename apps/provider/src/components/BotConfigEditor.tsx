'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

interface BotConfigEditorProps {
  config?: BotConfigData;
  onSave?: (config: BotConfigData) => void;
}

interface BotConfigData {
  model: string;
  personality: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

const defaultConfig: BotConfigData = {
  model: 'GPT-4o',
  personality: 'Professional, helpful, concise',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful customer support assistant.',
};

export default function BotConfigEditor({ config: initialConfig = defaultConfig, onSave }: BotConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof BotConfigData>(field: K, value: BotConfigData[K]) {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    onSave?.(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Model</label>
          <select value={config.model} onChange={(e) => update('model', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option>GPT-4o</option>
            <option>GPT-4-turbo</option>
            <option>GPT-3.5-turbo</option>
            <option>Claude 3 Sonnet</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Personality</label>
          <input type="text" value={config.personality} onChange={(e) => update('personality', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Temperature ({config.temperature})</label>
          <input type="range" min="0" max="1" step="0.1" value={config.temperature}
            onChange={(e) => update('temperature', parseFloat(e.target.value))} className="w-full accent-accent-purple" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Max Tokens</label>
          <input type="number" value={config.maxTokens} onChange={(e) => update('maxTokens', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">System Prompt</label>
        <textarea value={config.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={6}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-border-active resize-none" />
      </div>

      <button onClick={handleSave}
        className="flex items-center gap-1.5 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
        <Save size={14} /> {saved ? 'Saved!' : 'Save Configuration'}
      </button>
    </div>
  );
}
