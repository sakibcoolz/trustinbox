'use client';

import { ConversationList } from '@/components/chat/conversation-list';
import { ChatArea } from '@/components/chat/chat-area';
import { useChat } from '@/lib/chat-context';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

function ConversationsContent() {
  const { activeConversation, setActiveConversation, conversations, isLoadingConversations, refreshConversations } = useChat();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const didAutoSelect = useRef(false);
  const didRefresh = useRef(false);

  // Refresh conversations on mount to pick up any newly created ones
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Auto-select conversation from query param
  useEffect(() => {
    if (!targetId || didAutoSelect.current || isLoadingConversations) return;

    const target = conversations.find(c => c.id === targetId);
    if (target) {
      setActiveConversation(target);
      didAutoSelect.current = true;
    } else if (!didRefresh.current && conversations.length >= 0) {
      // Conversation not found yet — trigger a refresh (only once)
      didRefresh.current = true;
      refreshConversations();
    }
  }, [targetId, conversations, isLoadingConversations, setActiveConversation, refreshConversations]);

  return (
    <>
      {/* List panel: hidden on mobile when a conversation is active */}
      <div className={`${activeConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col sm:shrink-0`}>
        <ConversationList
          activeId={activeConversation?.id || null}
          onSelect={setActiveConversation}
        />
      </div>
      {/* Chat area: hidden on mobile when no conversation selected */}
      <div className={`${!activeConversation ? 'hidden sm:flex' : 'flex'} flex-1 min-w-0`}>
        <ChatArea
          conversation={activeConversation}
          onBack={() => setActiveConversation(null)}
        />
      </div>
    </>
  );
}

export default function ConversationsPage() {
  return <ConversationsContent />;
}
