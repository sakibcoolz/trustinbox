'use client';

import { useState } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: 'Active' | 'Revoked';
}

interface APIKeyManagerProps {
  keys?: APIKey[];
  onGenerate?: (name: string) => void;
  onRevoke?: (id: string) => void;
  onCopy?: (id: string) => void;
}

const defaultKeys: APIKey[] = [
  { id: '1', name: 'Production API', prefix: 'ti_live_a8f2...', createdAt: '2024-01-15', lastUsed: '2 hours ago', status: 'Active' },
  { id: '2', name: 'Staging API', prefix: 'ti_test_c3d1...', createdAt: '2024-02-01', lastUsed: '3 days ago', status: 'Active' },
  { id: '3', name: 'Legacy Key', prefix: 'ti_live_x9k4...', createdAt: '2023-11-20', lastUsed: '1 month ago', status: 'Revoked' },
];

export default function APIKeyManager({ keys = defaultKeys, onGenerate, onRevoke, onCopy }: APIKeyManagerProps) {
  const [showGen, setShowGen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  function toggleVisible(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowGen(!showGen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Plus size={14} /> Generate Key
        </button>
      </div>

      {showGen && (
        <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-4 flex gap-2">
          <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Key name (e.g. Production API)" />
          <button onClick={() => { onGenerate?.(keyName); setShowGen(false); setKeyName(''); }}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium">Generate</button>
          <button onClick={() => setShowGen(false)} className="text-sm text-text-muted">Cancel</button>
        </div>
      )}

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-muted">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Key</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-left p-3 font-medium">Last Used</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover">
                <td className="p-3 text-text-primary flex items-center gap-2">
                  <Key size={14} className="text-text-muted" />{k.name}
                </td>
                <td className="p-3 font-mono text-text-secondary">
                  {visibleKeys.has(k.id) ? k.prefix.replace('...', '3f8a9b2c') : k.prefix}
                </td>
                <td className="p-3 text-text-secondary">{k.createdAt}</td>
                <td className="p-3 text-text-secondary">{k.lastUsed}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.status === 'Active' ? 'bg-status-success/10 text-status-success' : 'bg-border-secondary text-text-muted'}`}>
                    {k.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => toggleVisible(k.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-muted">
                      {visibleKeys.has(k.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => onCopy?.(k.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Copy size={14} /></button>
                    {k.status === 'Active' && (
                      <button onClick={() => onRevoke?.(k.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
