'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Conversation } from './conversation-list';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'org';
  content: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'document' | 'system';
}

const mockMessagesMap: Record<string, Message[]> = {
  '1': [
    { id: 'm1', senderId: 'org1', senderName: 'Acme Bank', senderType: 'org', content: 'Hello! Thank you for applying for a personal loan with Acme Bank.', time: '10:00 AM', status: 'read', type: 'text' },
    { id: 'm2', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Hi, I submitted my application last week. Any updates?', time: '10:02 AM', status: 'read', type: 'text' },
    { id: 'm3', senderId: 'org1', senderName: 'Acme Bank', senderType: 'org', content: 'Yes! I\'m happy to inform you that your loan application has been approved for ₹5,00,000 at 10.5% annual interest rate.', time: '10:05 AM', status: 'read', type: 'text' },
    { id: 'm4', senderId: 'system', senderName: 'System', senderType: 'org', content: '📄 Loan Agreement Document shared', time: '10:06 AM', status: 'read', type: 'document' },
    { id: 'm5', senderId: 'user', senderName: 'You', senderType: 'user', content: 'That\'s great news! What\'s the next step?', time: '10:08 AM', status: 'read', type: 'text' },
    { id: 'm6', senderId: 'org1', senderName: 'Acme Bank', senderType: 'org', content: 'Please review the terms and conditions document I just shared. Once you\'re comfortable with the terms, you can sign it digitally through our portal.', time: '10:10 AM', status: 'read', type: 'text' },
    { id: 'm7', senderId: 'org1', senderName: 'Acme Bank', senderType: 'org', content: 'Your loan application has been approved. Please review the terms and conditions attached. The disbursement will happen within 48 hours of signing.', time: '10:15 AM', status: 'read', type: 'text' },
  ],
  '2': [
    { id: 'h1', senderId: 'org2', senderName: 'City Hospital', senderType: 'org', content: 'Good morning! Your lab results from March 25 are now available.', time: '9:00 AM', status: 'read', type: 'text' },
    { id: 'h2', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Thank you. Is everything normal?', time: '9:15 AM', status: 'read', type: 'text' },
    { id: 'h3', senderId: 'org2', senderName: 'City Hospital', senderType: 'org', content: 'Your results are within normal range. However, we recommend a follow-up visit for your vitamin D levels which are slightly low.', time: '9:20 AM', status: 'read', type: 'text' },
    { id: 'h4', senderId: 'org2', senderName: 'City Hospital', senderType: 'org', content: 'Your lab results are ready. Please visit your nearest branch to collect the physical copy, or you can view them through the secure document link above.', time: '9:25 AM', status: 'read', type: 'text' },
  ],
  '3': [
    { id: 'r1', senderId: 'org3', senderName: 'Quick Realty', senderType: 'org', content: 'We found 3 new properties matching your saved search criteria in the downtown area.', time: 'Yesterday', status: 'read', type: 'text' },
    { id: 'r2', senderId: 'org3', senderName: 'Quick Realty', senderType: 'org', content: 'New property listing matches your criteria in downtown area. 2BHK, 1200 sqft, ₹85L. Would you like to schedule a visit?', time: '11:00 AM', status: 'read', type: 'text' },
  ],
  '4': [
    { id: 's1', senderId: 'system', senderName: 'TrustInbox', senderType: 'org', content: 'Welcome to TrustInbox! 🎉 Your privacy is our priority. Here are some things you can do:', time: '2 days ago', status: 'read', type: 'system' },
    { id: 's2', senderId: 'system', senderName: 'TrustInbox', senderType: 'org', content: '✅ Control who can contact you\n✅ Approve callback requests\n✅ Block unwanted messages\n✅ View organizations identities', time: '2 days ago', status: 'read', type: 'text' },
    { id: 's3', senderId: 'system', senderName: 'TrustInbox', senderType: 'org', content: 'Welcome to TrustInbox! Your privacy is our priority. Configure your preferences in Settings.', time: '2 days ago', status: 'read', type: 'text' },
  ],
  'f1': [
    { id: 'fb1', senderId: 'friend-bob', senderName: 'Bob Wilson', senderType: 'org', content: 'Hey! Did you see the game last night? 🏀', time: '8:30 PM', status: 'read', type: 'text' },
    { id: 'fb2', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Yes! That last quarter was insane', time: '8:32 PM', status: 'read', type: 'text' },
    { id: 'fb3', senderId: 'friend-bob', senderName: 'Bob Wilson', senderType: 'org', content: 'Right?? The buzzer beater was legendary', time: '8:33 PM', status: 'read', type: 'text' },
    { id: 'fb4', senderId: 'user', senderName: 'You', senderType: 'user', content: 'We should catch the next one together, maybe grab some food before?', time: '8:35 PM', status: 'read', type: 'text' },
    { id: 'fb5', senderId: 'friend-bob', senderName: 'Bob Wilson', senderType: 'org', content: 'Absolutely! Friday works for me. There\'s that new pizza place near the arena', time: '8:36 PM', status: 'read', type: 'text' },
    { id: 'fb6', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Perfect, let\'s do it! 🍕', time: '8:38 PM', status: 'read', type: 'text' },
    { id: 'fb7', senderId: 'friend-bob', senderName: 'Bob Wilson', senderType: 'org', content: 'Also, are you coming to the hiking trip this weekend?', time: '9:15 PM', status: 'read', type: 'text' },
  ],
  'f2': [
    { id: 'fc1', senderId: 'friend-carol', senderName: 'Carol Martinez', senderType: 'org', content: 'Hey! I just finished that book you recommended', time: '2:00 PM', status: 'read', type: 'text' },
    { id: 'fc2', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Oh nice! What did you think?', time: '2:05 PM', status: 'read', type: 'text' },
    { id: 'fc3', senderId: 'friend-carol', senderName: 'Carol Martinez', senderType: 'org', content: 'The plot twist at the end was wild. I did NOT see that coming 😱', time: '2:06 PM', status: 'read', type: 'text' },
    { id: 'fc4', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Told you! The author is amazing at misdirection', time: '2:08 PM', status: 'read', type: 'text' },
    { id: 'fc5', senderId: 'friend-carol', senderName: 'Carol Martinez', senderType: 'org', content: 'Do they have any other books? I need more 📚', time: '2:10 PM', status: 'read', type: 'text' },
  ],
  'f3': [
    { id: 'fd1', senderId: 'user', senderName: 'You', senderType: 'user', content: 'Hey Dave, how\'s the new job going?', time: 'Yesterday', status: 'read', type: 'text' },
    { id: 'fd2', senderId: 'friend-dave', senderName: 'Dave Chen', senderType: 'org', content: 'Pretty good! The team is really welcoming. Still getting used to the codebase though 😅', time: 'Yesterday', status: 'read', type: 'text' },
    { id: 'fd3', senderId: 'user', senderName: 'You', senderType: 'user', content: 'That always takes a while. Give it a couple weeks', time: 'Yesterday', status: 'read', type: 'text' },
    { id: 'fd4', senderId: 'friend-dave', senderName: 'Dave Chen', senderType: 'org', content: 'Yeah for sure. We should catch up over coffee sometime this week', time: 'Yesterday', status: 'delivered', type: 'text' },
  ],
};

interface ChatAreaProps {
  conversation: Conversation | null;
}

export function ChatArea({ conversation }: ChatAreaProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversation) {
      setMessages(mockMessagesMap[conversation.id] || []);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !conversation) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'user',
      senderName: user?.fullName || 'You',
      senderType: 'user',
      content: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
            <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">TrustInbox Messages</h3>
            <p className="text-sm text-text-muted mt-1">Select a conversation to start chatting.<br />Your messages are end-to-end encrypted.</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-text-muted text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Privacy-first communication</span>
          </div>
        </div>
      </div>
    );
  }

  const initials = conversation.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
      {/* Chat header */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${conversation.isFriend ? 'bg-gradient-to-br from-accent-blue to-accent-purple' : 'bg-accent-green'}`}>
              {initials}
            </div>
            {conversation.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-bg-secondary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-text-primary">{conversation.name}</h3>
              {conversation.isFriend && (
                <svg className="w-3.5 h-3.5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              )}
              {!conversation.isFriend && conversation.verified && (
                <svg className="w-3.5 h-3.5 text-accent-blue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307z" />
                  <path d="M15.61 10.186a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" fill="white" />
                </svg>
              )}
            </div>
            <p className="text-2xs text-text-muted">
              {conversation.online ? 'Online' : 'Last seen recently'}
              {conversation.isFriend && conversation.username && ` · c/${conversation.username}`}
              {!conversation.isFriend && conversation.orgSlug && ` · ${conversation.orgSlug}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="btn-icon" title="Voice call">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>
          <button className="btn-icon" title="Search">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <button className="btn-icon" title="More options">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, idx) => {
          const isOwn = msg.senderType === 'user';
          const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.senderType === 'user');
          const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.senderType !== msg.senderType;

          if (msg.type === 'document') {
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-xl border ${isOwn ? 'bg-accent-blue/10 border-accent-blue/20' : 'bg-bg-tertiary border-border-secondary'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">{msg.content}</p>
                      <p className="text-2xs text-text-muted mt-0.5">PDF · Click to view</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'} animate-fade-in`}>
              {!isOwn && showAvatar && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold mr-2 mt-auto mb-1 shrink-0 ${conversation.isFriend ? 'bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 text-accent-purple' : 'bg-accent-green/20 text-accent-green'}`}>
                  {conversation.name[0]}
                </div>
              )}
              {!isOwn && !showAvatar && <div className="w-7 mr-2 shrink-0" />}
              <div className="flex flex-col">
                <div className={isOwn ? 'bubble-own' : 'bubble-other'}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                {isLastInGroup && (
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-2xs text-text-muted">{msg.time}</span>
                    {isOwn && (
                      <svg className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-accent-blue' : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {msg.status === 'read' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5M4.5 12.75l6 6M10.5 18.75l9-13.5" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        )}
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="px-4 pb-4 pt-2 border-t border-border-primary bg-bg-secondary/50 shrink-0">
        <div className="flex items-end gap-2 bg-bg-input border border-border-primary rounded-2xl px-3 py-2 focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/30 transition-all">
          <button className="btn-icon shrink-0 w-8 h-8" title="Attach file">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none max-h-32 py-1"
            style={{ minHeight: '24px' }}
          />
          <button className="btn-icon shrink-0 w-8 h-8" title="Emoji">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </button>
          {message.trim() ? (
            <button onClick={handleSend} className="w-8 h-8 rounded-full bg-accent-blue text-white flex items-center justify-center hover:bg-blue-500 transition-colors shrink-0" title="Send">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          ) : (
            <button className="btn-icon shrink-0 w-8 h-8" title="Voice message">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-center text-2xs text-text-muted mt-2">
          <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Messages are protected by TrustInbox privacy policy
        </p>
      </div>
    </div>
  );
}
