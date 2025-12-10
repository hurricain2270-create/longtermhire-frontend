import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi } from "../services/chatApi";

export const useClientChat = () => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminStatus, setAdminStatus] = useState({
    has_online_admin: false,
    online_admin_count: 0,
    total_admin_count: 0,
  });
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Intervals for online status management
  const heartbeatInterval = useRef(null);
  const adminStatusInterval = useRef(null);
  const pollingInterval = useRef(null);
  const lastMessageTimestamp = useRef(0);

  // Set user online status
  const setOnline = useCallback(async () => {
    try {
      await chatApi.setOnline();
    } catch (err) {
      console.error("Failed to set online status:", err);
    }
  }, []);

  // Set user offline status
  const setOffline = useCallback(async () => {
    try {
      await chatApi.setOffline();
    } catch (err) {
      console.error("Failed to set offline status:", err);
    }
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      await chatApi.sendHeartbeat();
    } catch (err) {
      console.error("Failed to send heartbeat:", err);
    }
  }, []);

  // Check admin status
  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await chatApi.getAdminStatus();
      if (!response.error) {
        setAdminStatus(response.data);
        setAdminOnline(response.data.has_online_admin);
      }
    } catch (err) {
      console.error("Failed to check admin status:", err);
    }
  }, []);

  // Load conversations for the current client
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatApi.getConversations();

      if (!response.error) {
        setConversations(response.data || []);

        // If there's a conversation, load its messages
        if (response.data && response.data.length > 0) {
          const firstConversation = response.data[0];
          await loadMessages(firstConversation.id);
        }
      } else {
        setError(response.message || "Failed to load conversations");
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId, page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const response = await chatApi.getMessages(conversationId, page);
      if (!response.error) {
        const messagesData = response.data || [];
        const pagination = response.pagination || {};

        // Extract unread count from API response if available
        if (response.unread_count !== undefined) {
          setUnreadCount(response.unread_count);
        }

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
          lastMessageTimestamp.current = new Date(
            latestMessage.created_at
          ).getTime();
        }
      } else {
        setError(response.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
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

  // Send a message (with optional attachment)
  const sendMessage = useCallback(
    async (toUserId, message, attachmentData = null) => {
      try {
        const messageData = {
          to_user_id: toUserId,
          message: message || (attachmentData ? `Sent a file: ${attachmentData.attachment_name}` : ""),
          message_type: attachmentData ? attachmentData.attachment_type : "text",
          ...(attachmentData || {}),
        };

        const response = await chatApi.sendMessage(messageData);

        if (!response.error) {
          // Add message to local state immediately for better UX
          const currentUserId = parseInt(
            localStorage.getItem("clientUserId") ||
              localStorage.getItem("user_id") ||
              "0"
          );
          const newMessage = {
            id: response.data.id,
            from_user_id: currentUserId, // Use current user ID instead of response data
            to_user_id: toUserId,
            message: messageData.message,
            message_type: messageData.message_type,
            created_at: new Date().toISOString(),
            from_user_name: "You",
            ...(attachmentData || {}),
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

          return true;
        } else {
          setError(response.message || "Failed to send message");
          return false;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setError("Failed to send message");
        return false;
      }
    },
    [conversations, loadMessages]
  );

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    heartbeatInterval.current = setInterval(() => {
      sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }, [sendHeartbeat]);

  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Start admin status checking
  const startAdminStatusCheck = useCallback(() => {
    if (adminStatusInterval.current) {
      clearInterval(adminStatusInterval.current);
    }

    adminStatusInterval.current = setInterval(() => {
      checkAdminStatus();
    }, 60000); // Check admin status every minute
  }, [checkAdminStatus]);

  // Stop admin status checking
  const stopAdminStatusCheck = useCallback(() => {
    if (adminStatusInterval.current) {
      clearInterval(adminStatusInterval.current);
      adminStatusInterval.current = null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError("");
  }, []);

  // Start polling for new messages
  const startPolling = useCallback((conversationId) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await chatApi.getMessages(conversationId, 1, 10);
        if (!response.error && response.data.length > 0) {
          // Update unread count from polling response
          if (response.unread_count !== undefined) {
            setUnreadCount(response.unread_count);
          }

          const newMessages = response.data.filter(
            (msg) =>
              new Date(msg.created_at).getTime() > lastMessageTimestamp.current
          );

          if (newMessages.length > 0) {
            setMessages((prev) => {
              // Create a Set of existing message IDs to check for duplicates
              const existingMessageIds = new Set(prev.map((msg) => msg.id));

              // Filter out messages that already exist
              const uniqueNewMessages = newMessages.filter(
                (msg) => !existingMessageIds.has(msg.id)
              );

              if (uniqueNewMessages.length > 0) {
                return [...prev, ...uniqueNewMessages.reverse()];
              }
              return prev;
            });

            // Update timestamp
            const latestMessage = newMessages[newMessages.length - 1];
            lastMessageTimestamp.current = new Date(
              latestMessage.created_at
            ).getTime();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Poll every 3 seconds
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    lastMessageTimestamp.current = 0;
  }, []);

  // Clear unread count (when messages are read)
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Initialize online status and intervals on mount
  useEffect(() => {
    // Set online status on mount
    setOnline();

    // Start heartbeat
    startHeartbeat();

    // Start admin status checking
    startAdminStatusCheck();

    // Check admin status immediately
    checkAdminStatus();

    // Handle beforeunload (tab close, browser close)
    const handleBeforeUnload = () => {
      setOffline();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      // Don't set offline on component unmount - only on actual browser/tab close
      stopHeartbeat();
      stopAdminStatusCheck();
      stopPolling();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    setOnline,
    setOffline,
    startHeartbeat,
    stopHeartbeat,
    startAdminStatusCheck,
    stopAdminStatusCheck,
    checkAdminStatus,
  ]);

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
    setOnline,
    setOffline,
    sendHeartbeat,
    checkAdminStatus,
  };
};
