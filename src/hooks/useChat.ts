import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi } from "../services/chatApi";

export const useChat = (onNewMessagesFromPolling) => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // For loading conversations list
  const [loadingMessages, setLoadingMessages] = useState(false); // For loading messages
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Polling interval for real-time updates
  const pollingInterval = useRef(null);
  const lastMessageTimestamp = useRef(0);

  // MySQL datetimes ("2026-07-25 02:51:42") aren't valid ISO. Normalise before
  // parsing so this never yields NaN.
  const toTime = (v) => {
    if (!v) return 0;
    const t = new Date(String(v).replace(" ", "T")).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Load conversations
  const loadConversations = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await chatApi.getConversations();
      if (!response.error) {
        // Use functional update to prevent unnecessary re-renders
        setConversations((prevConversations) => {
          // Only update if data actually changed (by comparing IDs)
          const newIds = new Set((response.data || []).map(c => c.id));
          const prevIds = new Set((prevConversations || []).map(c => c.id));

          // Check if arrays are different
          if (newIds.size !== prevIds.size ||
            ![...newIds].every(id => prevIds.has(id)) ||
            ![...prevIds].every(id => newIds.has(id))) {
            return response.data;
          }

          // If same IDs, update unread counts only (smooth update)
          return (prevConversations || []).map(prevConv => {
            const newConv = (response.data || []).find(c => c.id === prevConv.id);
            if (newConv && newConv.unread_count !== prevConv.unread_count) {
              return { ...prevConv, unread_count: newConv.unread_count };
            }
            return prevConv;
          });
        });
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to load conversations");
      console.error("Load conversations error:", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId, page = 1, silent = false) => {
    try {
      if (page === 1) {
        if (!silent) setLoadingMessages(true); // skip the spinner on background polls
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const response = await chatApi.getMessages(conversationId, page);
      if (!response.error) {
        const messagesData = response.data || [];
        const pagination = response.pagination || {};

        if (page === 1) {
          // First page - replace all messages
          setMessages(messagesData);
          setCurrentPage(1);
        } else {
          // Additional pages - prepend older messages
          setMessages((prev) => [...messagesData, ...prev]);
          setCurrentPage(page);
        }

        // Update pagination state
        setHasMoreMessages(pagination.hasMore || false);

        // Update last message timestamp for real-time polling
        if (messagesData.length > 0) {
          const latestMessage = messagesData[messagesData.length - 1];
          lastMessageTimestamp.current = toTime(latestMessage.created_at);
        }
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("Failed to load messages");
      console.error("Load messages error:", err);
    } finally {
      if (!silent) setLoadingMessages(false);
      setLoadingMore(false);
    }
  }, []);

  // Load more messages (for pagination)
  const loadMoreMessages = useCallback(
    async (conversationId) => {
      if (!hasMoreMessages || loadingMore) return;

      const nextPage = currentPage + 1;
      await loadMessages(conversationId, nextPage);
    },
    [hasMoreMessages, loadingMore, currentPage, loadMessages]
  );

  // Send a message
  const sendMessage = useCallback(
    async (messageData) => {
      try {
        const response = await chatApi.sendMessage(messageData);
        if (!response.error) {
          // Add message to local state immediately for better UX
          const newMessage = {
            id: response.data.id,
            from_user_id: messageData.from_user_id, // Use the actual user ID
            to_user_id: messageData.to_user_id,
            message: messageData.message,
            message_type: messageData.message_type || "text",
            created_at: new Date().toISOString(),
            from_user_name: "You",
            attachment_url: messageData.attachment_url || null,
            attachment_name: messageData.attachment_name || null,
            attachment_size: messageData.attachment_size || null,
            attachment_type: messageData.attachment_type || null,
          };

          setMessages((prev) => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(
              (msg) => msg.id === response.data.id
            );
            if (messageExists) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Don't reload conversations here - let the polling handle updates
          // This prevents the "Loading conversations..." message from appearing

          return response;
        } else {
          setError(response.message);
          return response;
        }
      } catch (err) {
        setError("Failed to send message");
        console.error("Send message error:", err);
        return { error: true, message: "Failed to send message" };
      }
    },
    [] // Remove loadConversations dependency to prevent unnecessary re-renders
  );

  // Send equipment request
  const sendEquipmentRequest = useCallback(
    async (requestData) => {
      try {
        const response = await chatApi.sendEquipmentRequest(requestData);
        if (!response.error) {
          // Add equipment request message to local state
          const requestMessage = {
            id: response.data.message_id,
            from_user_id: requestData.from_user_id, // Use the actual user ID
            to_user_id: requestData.to_user_id,
            message: requestData.message,
            message_type: "equipment_request",
            equipment_id: requestData.equipment_id,
            equipment_name: requestData.equipment_name,
            created_at: new Date().toISOString(),
            from_user_name: "You",
          };

          setMessages((prev) => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(
              (msg) => msg.id === response.data.message_id
            );
            if (messageExists) {
              return prev;
            }
            return [...prev, requestMessage];
          });

          // Don't reload conversations here - let the polling handle updates
          // This prevents the "Loading conversations..." message from appearing

          return response;
        } else {
          setError(response.message);
          return response;
        }
      } catch (err) {
        setError("Failed to send equipment request");
        console.error("Send equipment request error:", err);
        return { error: true, message: "Failed to send equipment request" };
      }
    },
    [] // Remove loadConversations dependency to prevent unnecessary re-renders
  );

  // Poll for new messages (simulating real-time)
  const startPolling = useCallback(
    (conversationId) => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }

      pollingInterval.current = setInterval(async () => {
      try {
        // Reuse the exact path that works on refresh rather than maintaining
        // separate merge logic. `silent` keeps the spinner from flashing.
        await loadMessages(conversationId, 1, true);
        loadConversations(false);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Poll every 3 seconds

    setIsConnected(true);
    },
    [] // Remove loadConversations dependency to prevent unnecessary re-renders
  );

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setIsConnected(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    lastMessageTimestamp.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // State
    conversations,
    messages,
    loading, // For conversations list
    loadingMessages, // For messages
    error,
    isConnected,
    hasMoreMessages,
    loadingMore,
    currentPage,

    // Actions
    loadConversations,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    sendEquipmentRequest,
    startPolling,
    stopPolling,
    clearError,
    clearMessages,
  };
};
