'use client';

import { useState } from 'react';
import { X, Search, Shield, Loader2, Send } from 'lucide-react';
import { useShareDocument } from '@/lib/graphql/documents';
import { useToast } from '@/components/Toast';

interface ShareDocumentModalProps {
  documentId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

const contextOptions: Array<{ value: string; label: string }> = [
  { value: 'CHAT', label: 'Chat' },
  { value: 'DIRECT', label: 'Direct' },
  { value: 'NOTIFICATION', label: 'Notification' },
];

const expiryOptions: Array<{ value: string; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '', label: 'No expiry' },
];

export default function ShareDocumentModal({ documentId, fileName, isOpen, onClose }: ShareDocumentModalProps) {
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [context, setContext] = useState('CHAT');
  const [message, setMessage] = useState('');
  const [expiry, setExpiry] = useState('7d');
  const { share, loading } = useShareDocument();
  const { success, error: toastError } = useToast();

  if (!isOpen) return null;

  function addRecipient() {
    const vid = recipientSearch.trim();
    if (vid && !recipients.includes(vid)) {
      setRecipients([...recipients, vid]);
      setRecipientSearch('');
    }
  }

  function removeRecipient(vid: string) {
    setRecipients(recipients.filter((r) => r !== vid));
  }

  async function handleShare() {
    try {
      for (const recipientVirtualId of recipients) {
        await share({
          variables: {
            input: {
              documentId,
              recipientVirtualId,
              shareContext: context,
              message: message || undefined,
              expiry: expiry || undefined,
            },
          },
        });
      }
      success(`Document shared with ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);
      onClose();
    } catch {
      toastError('Failed to share document');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share Document</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        <p className="text-xs text-text-muted truncate">Sharing: {fileName}</p>

        {/* Recipients */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Recipients *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                className="w-full pl-8 pr-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm focus:outline-none focus:border-border-active"
                placeholder="Enter VID…"
              />
            </div>
            <button onClick={addRecipient} className="px-3 py-2 bg-accent-blue/10 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/20 transition-colors">
              Add
            </button>
          </div>
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recipients.map((vid) => (
                <span key={vid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-surface border border-border-primary rounded text-xs font-mono">
                  {vid}
                  <button onClick={() => removeRecipient(vid)}>
                    <X size={10} className="text-text-muted hover:text-text-primary" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Context */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Share Via</label>
          <div className="flex gap-2">
            {contextOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContext(opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  context === opt.value
                    ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                    : 'border-border-secondary text-text-muted hover:border-border-active'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Link Expiry</label>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm focus:outline-none focus:border-border-active"
          >
            {expiryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm resize-none focus:outline-none focus:border-border-active"
            placeholder="Optional message…"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleShare}
          disabled={loading || recipients.length === 0}
          className="w-full py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Send size={14} /> Share with {recipients.length || '…'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
