'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Star, Pin, Share2, Smile, Check, CheckCheck, Clock, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useChat, Message, Conversation, Reaction } from '@/lib/chat-context';
import { VoiceMessagePlayer } from './voice-recorder';
import ForwardDialog from './forward-dialog';
import { MessageComposer } from './message-composer';
import { FileAttachmentCard } from './file-attachment-card';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

interface ChatAreaProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export function ChatArea({ conversation, onBack }: ChatAreaProps) {
  const { user } = useAuth();
  const {
    messages, typingUsers, isLoadingMessages, isConnected, isReconnecting,
    sendMessage, editMessage, deleteMessage,
    addReaction, removeReaction, sendTyping, markAsRead,
    uploadFile, loadMoreMessages,
    starMessage, pinMessage,
  } = useChat();

  const [replyTo, setReplyTo]                     = useState<Message | null>(null);
  const [editingMessage, setEditingMessage]       = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId]   = useState<string | null>(null);
  const [showReactionsFor, setShowReactionsFor]   = useState<string | null>(null);
  const [contextMenu, setContextMenu]             = useState<{ id: string; x: number; y: number } | null>(null);
  const [forwardMessageId, setForwardMessageId]   = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl]             = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Reset compose state when conversation changes
  useEffect(() => {
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

  const handleSend = useCallback((text: string, attachmentIds: string[], messageType: string) => {
    if (editingMessage) {
      if (text.trim()) editMessage(editingMessage.id, text.trim());
      setEditingMessage(null);
      return;
    }
    if (!text.trim() && attachmentIds.length === 0) return;
    sendMessage(
      text.trim(),
      replyTo?.id,
      attachmentIds.length > 0 ? attachmentIds : undefined,
      messageType,
    );
    setReplyTo(null);
  }, [editingMessage, replyTo, sendMessage, editMessage]);

  const handleCancel = useCallback(() => {
    setReplyTo(null);
    setEditingMessage(null);
  }, []);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setEditingMessage(null);
  }, []);

  const handleEdit = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setReplyTo(null);
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

  const displayName  = conversation.name || conversation.otherUser?.fullName || 'Unknown';
  const isOnline     = conversation.otherUser?.online ?? false;
  const isDirect     = conversation.type === 'DIRECT';
  const initials     = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const lastSeen     = conversation.otherUser?.lastSeenAt;
  const pinnedMsgs   = messages.filter(m => m.pinned && !m.deletedAt);

  const statusText = isOnline
    ? 'Online'
    : lastSeen
      ? `Last seen ${formatRelativeTime(lastSeen)}`
      : 'Offline';

  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
      {/* ── Header ── */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="sm:hidden btn-icon -ml-1 mr-1 shrink-0" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          )}
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
              {statusText}
              {isReconnecting && ' · Reconnecting...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-icon" title="Voice call">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
          </button>
          <button className="btn-icon" title="Search">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </button>
          <button className="btn-icon" title="More">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
          </button>
        </div>
      </div>

      {/* ── Pinned banner ── */}
      {pinnedMsgs.length > 0 && (
        <div className="px-4 py-2 bg-accent-blue/5 border-b border-accent-blue/20 flex items-center gap-2">
          <Pin size={13} className="text-accent-blue shrink-0" />
          <p className="text-xs text-text-secondary truncate flex-1">
            <span className="font-medium text-accent-blue">Pinned: </span>
            {pinnedMsgs[pinnedMsgs.length - 1].content}
          </p>
          <button
            className="text-2xs text-accent-blue hover:underline shrink-0"
            onClick={() => {
              const el = document.getElementById(`msg-${pinnedMsgs[pinnedMsgs.length - 1].id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            View
          </button>
        </div>
      )}

      {/* ── Messages ── */}
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
          const isOwn         = msg.senderId === user?.id;
          const showAvatar    = !isOwn && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
          const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
          const isDeleted     = !!msg.deletedAt;
          const isEdited      = !!msg.editedAt;
          const isVoice    = msg.messageType === 'VOICE';
          const voiceAtt  = isVoice ? msg.attachments?.[0] : null;
          const mediaAtts = !isVoice ? (msg.attachments ?? []) : [];

          return (
            <div
              id={`msg-${msg.id}`}
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'} animate-fade-in group relative`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => { setHoveredMessageId(null); setShowReactionsFor(null); }}
              onContextMenu={e => !isDeleted ? handleContextMenu(e, msg) : undefined}
            >
              {!isOwn && showAvatar && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold mr-2 mt-auto mb-1 shrink-0 ${
                  isDirect ? 'bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 text-accent-purple' : 'bg-accent-green/20 text-accent-green'
                }`}>
                  {displayName[0]}
                </div>
              )}
              {!isOwn && !showAvatar && <div className="w-7 mr-2 shrink-0" />}

              <div className="flex flex-col max-w-[72%] sm:max-w-[65%]">
                {/* Forwarded label */}
                {msg.forwardedFrom && !isDeleted && (
                  <div className={`flex items-center gap-1 text-2xs text-text-muted mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <Share2 size={10} />
                    <span>Forwarded from <span className="font-medium">{msg.forwardedFrom.senderName}</span></span>
                  </div>
                )}

                {/* Starred indicator */}
                {msg.starred && !isDeleted && (
                  <div className={`flex items-center gap-1 text-2xs text-amber-400 mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <Star size={10} className="fill-amber-400" />
                    <span>Starred</span>
                  </div>
                )}

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
                      <>
                        <p className="italic text-text-muted text-xs">This message was deleted</p>
                        {/* Meta row – deleted messages still show time */}
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <span className="text-[10px] opacity-50">{formatMessageTime(msg.createdAt)}</span>
                        </div>
                      </>
                    ) : isVoice && voiceAtt?.url ? (
                      <>
                        <VoiceMessagePlayer url={voiceAtt.url} durationSecs={voiceAtt.fileSize} />
                        {/* Meta row inside voice bubble */}
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          {isEdited && <span className="text-[10px] opacity-65 italic">edited</span>}
                          <span className={`text-[10px] ${isOwn ? 'opacity-65' : 'text-text-muted'}`}>{formatMessageTime(msg.createdAt)}</span>
                          {isOwn && <DeliveryTick status={msg.status} />}
                        </div>
                      </>
                    ) : (
                      <>
                        {msg.content && (
                          <div className="text-sm whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</div>
                        )}
                        {mediaAtts.length > 0 && (
                          <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                            {mediaAtts.map(att => (
                              <FileAttachmentCard
                                key={att.id}
                                attachment={att}
                                onImageClick={setLightboxUrl}
                              />
                            ))}
                          </div>
                        )}
                        {!msg.content && mediaAtts.length === 0 && (
                          <p className="italic text-text-muted text-xs">Empty message</p>
                        )}
                        {/* Meta row – time + delivery ticks, inside every bubble */}
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          {isEdited && <span className="text-[10px] opacity-65 italic">edited</span>}
                          <span className={`text-[10px] ${isOwn ? 'opacity-65' : 'text-text-muted'}`}>{formatMessageTime(msg.createdAt)}</span>
                          {isOwn && <DeliveryTick status={msg.status} />}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hover toolbar */}
                  {hoveredMessageId === msg.id && !isDeleted && (
                    <div className={`absolute top-0 ${isOwn ? '-left-32' : '-right-32'} flex items-center gap-0.5 bg-bg-secondary border border-border-primary rounded-lg shadow-elevated px-1 py-0.5 z-10`}>
                      <button onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors" title="React">
                        <Smile size={14} />
                      </button>
                      <button onClick={() => handleReply(msg)} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors" title="Reply">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                      </button>
                      <button onClick={() => setForwardMessageId(msg.id)} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors" title="Forward">
                        <Share2 size={14} />
                      </button>
                      <button onClick={() => starMessage(msg.id)} className={`p-1 rounded transition-colors hover:bg-bg-hover ${msg.starred ? 'text-amber-400' : 'text-text-muted hover:text-text-primary'}`} title={msg.starred ? 'Unstar' : 'Star'}>
                        <Star size={14} className={msg.starred ? 'fill-amber-400' : ''} />
                      </button>
                      {isOwn && (
                        <button onClick={() => handleEdit(msg)} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quick reactions */}
                  {showReactionsFor === msg.id && (
                    <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 flex gap-0.5 bg-bg-secondary border border-border-primary rounded-full shadow-elevated px-2 py-1 z-20`}>
                      {QUICK_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="w-7 h-7 flex items-center justify-center hover:bg-bg-hover rounded-full text-sm transition-transform hover:scale-125">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && !isDeleted && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((r: Reaction) => (
                      <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${r.users.includes(user?.id || '') ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue' : 'bg-bg-tertiary border-border-secondary text-text-secondary hover:bg-bg-hover'}`}>
                        <span>{r.emoji}</span>
                        <span className="text-2xs">{r.count}</span>
                      </button>
                    ))}
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
              {typingUsers.map(t => t.senderName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed bg-bg-secondary border border-border-primary rounded-lg shadow-elevated py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {(() => {
            const msg = messages.find(m => m.id === contextMenu.id);
            if (!msg) return null;
            return (
              <>
                <CtxItem icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>} label="Reply" onClick={() => { handleReply(msg); setContextMenu(null); }} />
                <CtxItem icon={<Share2 size={14} />} label="Forward" onClick={() => { setForwardMessageId(msg.id); setContextMenu(null); }} />
                <CtxItem icon={<Star size={14} className={msg.starred ? 'fill-amber-400 text-amber-400' : ''} />} label={msg.starred ? 'Unstar' : 'Star'} onClick={() => { starMessage(msg.id); setContextMenu(null); }} />
                <CtxItem icon={<Pin size={14} className={msg.pinned ? 'text-accent-blue' : ''} />} label={msg.pinned ? 'Unpin' : 'Pin'} onClick={() => { pinMessage(msg.id); setContextMenu(null); }} />
                {msg.senderId === user?.id && (
                  <>
                    <CtxItem icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>} label="Edit" onClick={() => { handleEdit(msg); setContextMenu(null); }} />
                    <div className="border-t border-border-primary my-1" />
                    <CtxItem icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>} label="Delete" onClick={() => handleDelete(msg)} danger />
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Reply / Edit bar ── */}
      {(replyTo || editingMessage) && (
        <div className="px-4 pt-2 border-t border-border-primary bg-bg-secondary/50">
          <div className="flex items-center justify-between bg-bg-tertiary rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1 h-8 rounded-full ${editingMessage ? 'bg-accent-orange' : 'bg-accent-blue'}`} />
              <div className="min-w-0">
                <p className={`text-xs font-medium ${editingMessage ? 'text-accent-orange' : 'text-accent-blue'}`}>
                  {editingMessage ? 'Editing message' : `Replying to ${replyTo?.senderName}`}
                </p>
                <p className="text-xs text-text-muted truncate">{editingMessage?.content || replyTo?.content}</p>
              </div>
            </div>
            <button onClick={handleCancel} className="btn-icon w-6 h-6 shrink-0">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="px-4 pb-4 pt-2 border-t border-border-primary bg-bg-secondary/50 shrink-0">
        <MessageComposer
          key={conversation.id}
          onSend={handleSend}
          onTyping={sendTyping}
          uploadFile={uploadFile}
          isEditing={!!editingMessage}
          initialText={editingMessage?.content}
          onCancel={handleCancel}
        />
        <p className="text-center text-2xs text-text-muted mt-2">
          <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25-2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          Messages are protected by TrustInbox privacy policy
        </p>
      </div>

      {/* ── Image Lightbox ── */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full screen"
            className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Forward Dialog ── */}
      {forwardMessageId && (
        <ForwardDialog messageId={forwardMessageId} onClose={() => setForwardMessageId(null)} />
      )}
    </div>
  );
}

// ── Delivery tick ────────────────────────────────────────────────────────────
// Renders WhatsApp-style message status ticks inside own-message bubbles.
// pending   = clock  (message queued, not yet ACKed by server)
// sent      = ✓      (single grey – server received)
// delivered = ✓✓     (double grey – reached recipient device)
// read      = ✓✓     (double sky-blue – recipient opened the chat)
function DeliveryTick({ status }: { status?: string }) {
  switch (status) {
    case 'pending':
      return (
        <span title="Sending…" className="flex items-center opacity-55">
          <Clock size={11} strokeWidth={2} />
        </span>
      );
    case 'read':
      return (
        <span title="Read" className="flex items-center text-sky-200">
          <CheckCheck size={13} strokeWidth={2.5} />
        </span>
      );
    case 'delivered':
      return (
        <span title="Delivered" className="flex items-center opacity-80">
          <CheckCheck size={13} strokeWidth={2} />
        </span>
      );
    default: // 'sent'
      return (
        <span title="Sent" className="flex items-center opacity-60">
          <Check size={13} strokeWidth={2} />
        </span>
      );
  }
}

// ── Context menu row ─────────────────────────────────────────────────────────
function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:bg-bg-hover'}`}>
      {icon}{label}
    </button>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(content: string): React.ReactNode {
  // Split by fenced code blocks first
  const segments = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith('```') && seg.endsWith('```')) {
          const code = seg.slice(3, -3).replace(/^\n/, '');
          return (
            <pre key={i} className="bg-black/30 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 overflow-x-auto my-1.5 leading-relaxed">
              {code}
            </pre>
          );
        }
        return <React.Fragment key={i}>{renderInline(seg, String(i))}</React.Fragment>;
      })}
    </>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const re = /(\*\*[^*\n]+\*\*|_[^_\n]+_|~~[^~\n]+~~|`[^`\n]+`|@\w+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  const pushText = (t: string) => {
    if (!t) return;
    t.split('\n').forEach((line, li, arr) => {
      parts.push(line);
      if (li < arr.length - 1) parts.push(<br key={`${keyPrefix}-br-${last}-${li}`} />);
    });
  };

  while ((m = re.exec(text)) !== null) {
    pushText(text.slice(last, m.index));
    const v = m[0];
    if (v.startsWith('**'))
      parts.push(<strong key={`${keyPrefix}-${m.index}`} className="font-semibold">{v.slice(2, -2)}</strong>);
    else if (v.startsWith('_'))
      parts.push(<em key={`${keyPrefix}-${m.index}`}>{v.slice(1, -1)}</em>);
    else if (v.startsWith('~~'))
      parts.push(<s key={`${keyPrefix}-${m.index}`} className="line-through">{v.slice(2, -2)}</s>);
    else if (v.startsWith('`'))
      parts.push(<code key={`${keyPrefix}-${m.index}`} className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">{v.slice(1, -1)}</code>);
    else if (v.startsWith('@'))
      parts.push(<span key={`${keyPrefix}-${m.index}`} className="text-accent-blue font-medium cursor-pointer hover:underline">{v}</span>);
    last = m.index + v.length;
  }
  pushText(text.slice(last));
  return parts;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
