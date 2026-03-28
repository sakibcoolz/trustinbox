'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useChat, Message, Conversation, Reaction } from '@/lib/chat-context';

// ==================== Emoji Picker (inline mini) ====================
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

interface ChatAreaProps {
  conversation: Conversation | null;
}

export function ChatArea({ conversation }: ChatAreaProps) {
  const { user } = useAuth();
  const {
    messages, typingUsers, isLoadingMessages, isConnected,
    sendMessage, editMessage, deleteMessage,
    addReaction, removeReaction, sendTyping, markAsRead,
    uploadFile, loadMoreMessages,
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Only auto-scroll if user is near bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
    setReplyTo(null);
    setEditingMessage(null);
    setContextMenu(null);
  }, [conversation?.id]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && messages.length > 0) {
      markAsRead();
    }
  }, [conversation?.id, messages.length, markAsRead]);

  // ==================== Handlers ====================

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text && !editingMessage) return;

    if (editingMessage) {
      if (text) editMessage(editingMessage.id, text);
      setEditingMessage(null);
      setMessageText('');
      return;
    }

    sendMessage(text, replyTo?.id);
    setMessageText('');
    setReplyTo(null);
    inputRef.current?.focus();
  }, [messageText, editingMessage, replyTo, sendMessage, editMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setEditingMessage(null);
      setMessageText('');
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    sendTyping(e.target.value.length > 0);
  }, [sendTyping]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const att = await uploadFile(file);
    setIsUploading(false);
    if (att) {
      sendMessage(`📎 ${att.fileName}`, undefined, [att.id]);
    }
    e.target.value = '';
  }, [uploadFile, sendMessage]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  }, []);

  const handleEdit = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setMessageText(msg.content || '');
    setReplyTo(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback((msg: Message) => {
    deleteMessage(msg.id);
    setContextMenu(null);
  }, [deleteMessage]);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ id: msg.id, x: e.clientX, y: e.clientY });
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && messages.length >= 50) {
      loadMoreMessages();
    }
  }, [messages.length, loadMoreMessages]);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !user) return;
    const existing = msg.reactions?.find(r => r.emoji === emoji && r.users.includes(user.id));
    if (existing) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
    setShowReactionsFor(null);
  }, [messages, user, addReaction, removeReaction]);

  // ==================== Empty State ====================

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
            <p className="text-sm text-text-muted mt-1">Select a conversation to start chatting.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = conversation.name || conversation.otherUser?.fullName || 'Unknown';
  const isOnline = conversation.otherUser?.online ?? false;
  const isDirect = conversation.type === 'DIRECT';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
      {/* Chat Header */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
              isDirect ? 'bg-gradient-to-br from-accent-blue to-accent-purple' : 'bg-accent-green'
            }`}>
              {initials}
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-bg-secondary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-text-primary">{displayName}</h3>
              {isDirect && (
                <svg className="w-3.5 h-3.5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              )}
            </div>
            <p className="text-2xs text-text-muted">
              {isOnline ? 'Online' : 'Offline'}
              {!isConnected && ' · Reconnecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="btn-icon" title="Voice call">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>
          <button className="btn-icon" title="Search messages">
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
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {isLoadingMessages && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user?.id;
          const showAvatar = !isOwn && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
          const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
          const isDeleted = !!msg.deletedAt;
          const isEdited = !!msg.editedAt;

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'} animate-fade-in group relative`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => { setHoveredMessageId(null); setShowReactionsFor(null); }}
              onContextMenu={(e) => isOwn && !isDeleted ? handleContextMenu(e, msg) : undefined}
            >
              {/* Avatar */}
              {!isOwn && showAvatar && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold mr-2 mt-auto mb-1 shrink-0 ${
                  isDirect ? 'bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 text-accent-purple' : 'bg-accent-green/20 text-accent-green'
                }`}>
                  {displayName[0]}
                </div>
              )}
              {!isOwn && !showAvatar && <div className="w-7 mr-2 shrink-0" />}

              <div className="flex flex-col max-w-[70%]">
                {/* Reply preview */}
                {msg.replyPreview && !isDeleted && (
                  <div className={`text-2xs px-3 py-1.5 mb-0.5 rounded-t-lg border-l-2 ${
                    isOwn ? 'bg-accent-blue/5 border-l-accent-blue/40' : 'bg-bg-tertiary/50 border-l-accent-purple/40'
                  }`}>
                    <span className="font-medium text-accent-blue">{msg.replyPreview.senderName}</span>
                    <p className="text-text-muted truncate">{msg.replyPreview.content || 'Deleted message'}</p>
                  </div>
                )}

                {/* Message bubble */}
                <div className={`relative ${isDeleted ? 'opacity-50' : ''}`}>
                  <div className={isOwn ? 'bubble-own' : 'bubble-other'}>
                    {isDeleted ? (
                      <p className="italic text-text-muted text-xs">This message was deleted</p>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>

                  {/* Hover actions */}
                  {hoveredMessageId === msg.id && !isDeleted && (
                    <div className={`absolute top-0 ${isOwn ? '-left-20' : '-right-20'} flex items-center gap-0.5 bg-bg-secondary border border-border-primary rounded-lg shadow-elevated px-1 py-0.5 z-10`}>
                      <button
                        onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                        className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors"
                        title="React"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReply(msg)}
                        className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors"
                        title="Reply"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                      </button>
                      {isOwn && (
                        <>
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(msg)}
                            className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Quick reactions picker */}
                  {showReactionsFor === msg.id && (
                    <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 flex gap-0.5 bg-bg-secondary border border-border-primary rounded-full shadow-elevated px-2 py-1 z-20`}>
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-bg-hover rounded-full text-sm transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions display */}
                {msg.reactions && msg.reactions.length > 0 && !isDeleted && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map(r => (
                      <button
                        key={r.emoji}
                        onClick={() => toggleReaction(msg.id, r.emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                          r.users.includes(user?.id || '')
                            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                            : 'bg-bg-tertiary border-border-secondary text-text-secondary hover:bg-bg-hover'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="text-2xs">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Time + status */}
                {isLastInGroup && (
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-2xs text-text-muted">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {isEdited && !isDeleted && (
                      <span className="text-2xs text-text-muted italic">edited</span>
                    )}
                    {isOwn && !isDeleted && (
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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-text-muted">
              {typingUsers.map(t => t.senderName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-bg-secondary border border-border-primary rounded-lg shadow-elevated py-1 z-50 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const msg = messages.find(m => m.id === contextMenu.id);
            if (!msg) return null;
            return (
              <>
                <button onClick={() => { handleReply(msg); setContextMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                  Reply
                </button>
                {msg.senderId === user?.id && (
                  <>
                    <button onClick={() => { handleEdit(msg); setContextMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                      Edit
                    </button>
                    <div className="border-t border-border-primary my-1" />
                    <button onClick={() => handleDelete(msg)} className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      Delete
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Reply/Edit bar */}
      {(replyTo || editingMessage) && (
        <div className="px-4 pt-2 border-t border-border-primary bg-bg-secondary/50">
          <div className="flex items-center justify-between bg-bg-tertiary rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1 h-8 rounded-full ${editingMessage ? 'bg-accent-orange' : 'bg-accent-blue'}`} />
              <div className="min-w-0">
                <p className={`text-xs font-medium ${editingMessage ? 'text-accent-orange' : 'text-accent-blue'}`}>
                  {editingMessage ? 'Editing message' : `Replying to ${replyTo?.senderName}`}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {editingMessage?.content || replyTo?.content}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setReplyTo(null); setEditingMessage(null); setMessageText(''); }}
              className="btn-icon w-6 h-6 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border-primary bg-bg-secondary/50 shrink-0">
        <div className="flex items-end gap-2 bg-bg-input border border-border-primary rounded-2xl px-3 py-2 focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/30 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon shrink-0 w-8 h-8"
            title="Attach file"
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          />
          <textarea
            ref={inputRef}
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none max-h-32 py-1"
            style={{ minHeight: '24px' }}
          />
          {messageText.trim() ? (
            <button
              onClick={handleSend}
              className={`w-8 h-8 rounded-full ${editingMessage ? 'bg-accent-orange' : 'bg-accent-blue'} text-white flex items-center justify-center hover:opacity-90 transition-colors shrink-0`}
              title={editingMessage ? 'Save edit' : 'Send'}
            >
              {editingMessage ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
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

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
