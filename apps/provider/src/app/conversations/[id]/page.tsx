'use client';

import { useState, use } from 'react';
import { ArrowLeft, Send, Bot, User, Paperclip, MoreVertical, PhoneCall } from 'lucide-react';
import Link from 'next/link';

const mockMessages = [
  { id: '1', sender: 'customer', text: 'Hi, I need help with my account settings.', time: '14:20' },
  { id: '2', sender: 'bot', text: 'Hello! I\'d be happy to help you with your account settings. Could you please tell me what specific settings you\'d like to change?', time: '14:20' },
  { id: '3', sender: 'customer', text: 'I want to update my notification preferences. I\'m getting too many promotional emails.', time: '14:21' },
  { id: '4', sender: 'bot', text: 'I understand. You can manage your notification preferences from your profile. Would you like me to guide you through the steps, or would you prefer to speak with a human agent?', time: '14:21' },
  { id: '5', sender: 'customer', text: 'Can you guide me through it?', time: '14:22' },
  { id: '6', sender: 'bot', text: 'Sure! Here are the steps:\n1. Go to Settings → Notifications\n2. Under "Communication Preferences", you\'ll see categories\n3. Toggle off "Advertisement" to stop promotional emails\n4. Click Save\n\nWould you like me to do anything else?', time: '14:22' },
];

const convInfo = {
  customerVid: 'VID-4c9e1d',
  status: 'Active',
  assignee: 'Bot: Support Assistant',
  startedAt: '2024-03-10 14:20',
  category: 'Account Support',
};

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(mockMessages);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { id: String(prev.length + 1), sender: 'agent', text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setMessage('');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center gap-3">
          <Link href="/conversations" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{convInfo.customerVid}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">{convInfo.status}</span>
            </div>
            <p className="text-xs text-text-muted">{convInfo.category} · {convInfo.assignee}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted" title="Request callback">
            <PhoneCall size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[70%] ${msg.sender === 'customer' ? '' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.sender === 'customer' && <User size={12} className="text-text-muted" />}
                {msg.sender === 'bot' && <Bot size={12} className="text-accent-purple" />}
                {msg.sender === 'agent' && <User size={12} className="text-accent-blue" />}
                <span className="text-xs text-text-muted capitalize">{msg.sender}</span>
                <span className="text-xs text-text-muted">· {msg.time}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                msg.sender === 'customer'
                  ? 'bg-bg-card border border-border-primary text-text-primary'
                  : msg.sender === 'bot'
                    ? 'bg-accent-purple/10 border border-accent-purple/20 text-text-primary'
                    : 'bg-accent-blue/10 border border-accent-blue/20 text-text-primary'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bot suggestion bar */}
      <div className="px-6 py-2 border-t border-border-primary bg-bg-tertiary">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Bot size={14} className="text-accent-purple" />
          <span className="font-medium text-accent-purple">Bot Suggestion:</span>
          <span>Customer seems satisfied. Offer to close the conversation or ask if there&apos;s anything else.</span>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-6 py-3 border-t border-border-primary bg-bg-secondary">
        <div className="flex items-center gap-3">
          <button type="button" className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted">
            <Paperclip size={16} />
          </button>
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Type a message…" />
          <button type="submit"
            className="p-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            disabled={!message.trim()}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
