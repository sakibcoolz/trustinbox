'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, Send, MessageSquare } from 'lucide-react';
import { useChat, Conversation } from '@/lib/chat-context';

interface ForwardDialogProps {
  messageId: string;
  onClose: () => void;
}

export default function ForwardDialog({ messageId, onClose }: ForwardDialogProps) {
  const { conversations, forwardMessage } = useChat();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const filtered = useMemo(
    () =>
      conversations.filter(c =>
        (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        c.id.includes(search)
      ),
    [conversations, search]
  );

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    await Promise.all(Array.from(selected).map(id => forwardMessage(messageId, id)));
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm bg-[#1e1e2e] rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">Forward Message</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-white/30 gap-2">
              <MessageSquare size={32} />
              <span className="text-sm">No conversations found</span>
            </div>
          ) : (
            filtered.map(conv => (
              <ConvRow
                key={conv.id}
                conv={conv}
                selected={selected.has(conv.id)}
                onToggle={() => toggle(conv.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-white/40">
            {selected.size > 0 ? `${selected.size} selected` : 'Select recipients'}
          </span>
          <button
            onClick={handleSend}
            disabled={selected.size === 0 || sending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              : <Send size={14} />
            }
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvRow({ conv, selected, onToggle }: { conv: Conversation; selected: boolean; onToggle: () => void }) {
  const initials = (conv.name ?? '?').slice(0, 2).toUpperCase();
  const online = conv.otherUser?.online;

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left ${
        selected ? 'bg-blue-500/10' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1e1e2e]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{conv.name ?? conv.id}</p>
        {conv.lastMessagePreview && (
          <p className="text-xs text-white/40 truncate">{conv.lastMessagePreview}</p>
        )}
      </div>

      {/* Checkbox */}
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? 'bg-blue-600 border-blue-600' : 'border-white/30'
      }`}>
        {selected && (
          <svg viewBox="0 0 12 10" className="w-3 h-2 stroke-white fill-none stroke-2">
            <polyline points="1,5 4,9 11,1" />
          </svg>
        )}
      </div>
    </button>
  );
}
