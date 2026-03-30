'use client';

import { useState } from 'react';
import { Send, Bot, User, Paperclip } from 'lucide-react';

interface Message {
  id: string;
  sender: 'customer' | 'bot' | 'agent';
  text: string;
  time: string;
}

interface ConversationPanelProps {
  messages?: Message[];
  onSend?: (text: string) => void;
  botSuggestion?: string;
}

const defaultMessages: Message[] = [
  { id: '1', sender: 'customer', text: 'Hi, I need help with my account.', time: '14:20' },
  { id: '2', sender: 'bot', text: 'Hello! I\'d be happy to help. What do you need assistance with?', time: '14:20' },
];

export default function ConversationPanel({ messages: initialMessages = defaultMessages, onSend, botSuggestion }: ConversationPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const newMsg: Message = { id: String(messages.length + 1), sender: 'agent', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMsg]);
    onSend?.(input);
    setInput('');
  }

  const senderStyles = {
    customer: 'bg-bg-card border border-border-primary',
    bot: 'bg-accent-purple/10 border border-accent-purple/20',
    agent: 'bg-accent-blue/10 border border-accent-blue/20',
  };

  const senderIcons = {
    customer: <User size={12} className="text-text-muted" />,
    bot: <Bot size={12} className="text-accent-purple" />,
    agent: <User size={12} className="text-accent-blue" />,
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary rounded-xl border border-border-primary overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[75%]">
              <div className="flex items-center gap-1 mb-0.5">
                {senderIcons[msg.sender]}
                <span className="text-xs text-text-muted capitalize">{msg.sender} · {msg.time}</span>
              </div>
              <div className={`px-3 py-2 rounded-xl text-sm ${senderStyles[msg.sender]}`}>{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      {botSuggestion && (
        <div className="px-4 py-2 border-t border-border-primary bg-bg-tertiary flex items-center gap-2 text-xs text-text-muted">
          <Bot size={14} className="text-accent-purple shrink-0" />
          <span className="text-accent-purple font-medium">Suggestion:</span>
          <span className="truncate">{botSuggestion}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="p-3 border-t border-border-primary flex items-center gap-2">
        <button type="button" className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted">
          <Paperclip size={16} />
        </button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Type a message…" />
        <button type="submit" disabled={!input.trim()}
          className="p-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
