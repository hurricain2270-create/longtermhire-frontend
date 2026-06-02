// @ts-nocheck
import { useState, useCallback, useRef } from 'react';
import { chatApi } from '../services/chatApi';

interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  message: string;
  message_type: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  read_at?: string | null;
  created_at: string;
  equipment_name?: string;
}

interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  last_message?: string;
  updated_at: string;
}

export function useClientChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminStatus, setAdminStatus] = useState({
    has_online_admin: false,
    online_admin_count: 0,
    total_admin_count: 0,
  });
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentConversationIdRef = useRef<number | null>(null);

  // Returns conversations so callers can use them immediately (avoids React state timing issue)
  const loadConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const data = await chatApi.getConversations();
      if (!data.error) {
        const convList: Conversation[] = data.data || data || [];
        setConversations(convList);
        if (convList.length > 0) {
          await loadMessagesInternal(convList[0].id, 1, false);
        }
        return convList;
      }
    } catch (e) {
      console.error('loadConversations error:', e);
    }
    return [];
  }, []); // eslint-disable-line

  const loadMessagesInternal = async (
    conversationId: number,
    page: number,
    append: boolean
  ) => {
    try {
      const data = await chatApi.getMessages(conversationId, page);
      if (!data.error) {
        const fetched: Message[] = data.data?.messages || data.messages || data.data || [];
        setMessages((prev) => (append ? [...fetched, ...prev] : fetched));
        setHasMoreMessages(data.data?.has_more ?? data.has_more ?? false);
        setCurrentPage(page);
        const unread = data.data?.unread_count ?? data.unread_count ?? 0;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error('loadMessages error:', e);
    }
  };

  const loadMessages = useCallback(async (conversationId: number) => {
    currentConversationIdRef.current = conversationId;
    await loadMessagesInternal(conversationId, 1, false);
  }, []);

  const loadMoreMessages = useCallback(async (conversationId: number) => {
    setLoadingMore(true);
    try {
      await loadMessagesInternal(conversationId, currentPage + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage]);

  const sendMessage = useCallback(
    async (toUserId: number, message: string, attachmentData?: any): Promise<boolean> => {
      try {
        const data = await chatApi.sendMessage(toUserId, message, attachmentData);
        if (!data.error) {
          const convId = currentConversationIdRef.current;
          if (convId) await loadMessagesInternal(convId, 1, false);
          return true;
        }
        return false;
      } catch (e) {
        console.error('sendMessage error:', e);
        return false;
      }
    },
    [] // eslint-disable-line
  );

  const startPolling = useCallback((conversationId: number) => {
    currentConversationIdRef.current = conversationId;
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        await loadMessagesInternal(conversationId, 1, false);
        const statusData = await chatApi.getAdminStatus();
        if (!statusData.error) {
          setAdminStatus(statusData.data);
          setAdminOnline(statusData.data?.has_online_admin ?? false);
        }
      } catch (_) {}
    }, 8000); // Increased to 8s to reduce server load
  }, []); // eslint-disable-line

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);
  const clearUnreadCount = useCallback(() => setUnreadCount(0), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    conversations,
    messages,
    loading,
    error,
    adminOnline,
    adminStatus,
    hasMoreMessages,
    loadingMore,
    currentPage,
    unreadCount,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    startPolling,
    stopPolling,
    clearMessages,
    clearUnreadCount,
    clearError,
  };
}
