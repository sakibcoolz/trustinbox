'use client';

import { useState } from 'react';
import { ConversationList, type Conversation } from '@/components/chat/conversation-list';
import { ChatArea } from '@/components/chat/chat-area';

export default function ConversationsPage() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  return (
    <>
      <ConversationList
        activeId={activeConversation?.id || null}
        onSelect={setActiveConversation}
      />
      <ChatArea conversation={activeConversation} />
    </>
  );
}
