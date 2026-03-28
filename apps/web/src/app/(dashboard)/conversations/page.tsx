'use client';

import { ConversationList } from '@/components/chat/conversation-list';
import { ChatArea } from '@/components/chat/chat-area';
import { ChatProvider, useChat } from '@/lib/chat-context';

function ConversationsContent() {
  const { activeConversation, setActiveConversation } = useChat();

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

export default function ConversationsPage() {
  return (
    <ChatProvider>
      <ConversationsContent />
    </ChatProvider>
  );
}
