// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { chatApi } from "../services/chatApi";

interface Message {
  id: number;
  from_user_id: number;
  message: string;
  message_type: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
  read_at?: string | null;
  created_at: string;
}

interface Conversation {
  id: number;
  client_name?: string;
  company_name?: string;
  last_message?: string;
  unread_count?: number;
  updated_at: string;
}

function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adminId = Number(localStorage.getItem("userId") || 0);

  useEffect(() => {
    loadConversations();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const data = await chatApi.getAllConversations();
      if (!data.error) {
        const convList = data.data || data || [];
        setConversations(convList);
        if (convList.length > 0 && !selectedConv) {
          handleSelectConversation(convList[0]);
        }
      }
    } catch (e) {
      console.error("loadConversations:", e);
    } finally {
      setLoadingConvs(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    if (pollingRef.current) clearInterval(pollingRef.current);
    await loadMessages(conv.id);
    // Poll every 5s
    pollingRef.current = setInterval(() => loadMessages(conv.id), 5000);
  };

  const loadMessages = async (convId: number) => {
    try {
      setLoadingMsgs(true);
      const data = await chatApi.getAdminMessages(convId);
      if (!data.error) {
        setMessages(data.data?.messages || data.messages || data.data || []);
      }
    } catch (e) {
      console.error("loadMessages:", e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedConv || sending) return;
    try {
      setSending(true);
      // Find the client user ID from the conversation
      const clientUserId =
        (selectedConv as any).user1_id === adminId
          ? (selectedConv as any).user2_id
          : (selectedConv as any).user1_id;
      const data = await chatApi.sendAdminMessage(clientUserId, messageText.trim());
      if (!data.error) {
        setMessageText("");
        await loadMessages(selectedConv.id);
      }
    } catch (e) {
      console.error("sendMessage:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#292A2B]">
      {/* Sidebar — conversation list */}
      <div className="w-64 lg:w-80 bg-[#1F1F20] border-r border-[#333333] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-lg">Chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center pt-8">
              <ClipLoader color="#FDCE06" size={24} />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm p-4 font-[Inter]">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left px-4 py-3 border-b border-[#333333] transition-colors hover:bg-[#292A2B] ${
                  selectedConv?.id === conv.id ? "bg-[#292A2B] border-l-2 border-l-[#FDCE06]" : ""
                }`}
              >
                <p className="text-[#E5E5E5] font-[Inter] text-sm font-medium truncate">
                  {conv.company_name || conv.client_name || `Client #${conv.id}`}
                </p>
                {conv.last_message && (
                  <p className="text-[#9CA3AF] font-[Inter] text-xs truncate mt-0.5">
                    {conv.last_message}
                  </p>
                )}
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="inline-block mt-1 bg-[#FDCE06] text-[#000] text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#9CA3AF] font-[Inter]">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-[#1F1F20] border-b border-[#333333] px-6 py-4 flex-shrink-0">
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold">
                {(selectedConv as any).company_name ||
                  (selectedConv as any).client_name ||
                  `Client #${selectedConv.id}`}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center pt-8">
                  <ClipLoader color="#FDCE06" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#9CA3AF] font-[Inter] text-sm">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = Number(msg.from_user_id) === adminId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isAdmin
                            ? "bg-[#FDCE06] text-[#000]"
                            : "bg-[#1F1F20] border border-[#333333] text-[#E5E5E5]"
                        }`}
                      >
                        {msg.message_type === "equipment_request" && (
                          <span className="block text-[10px] font-bold mb-1 bg-black text-[#FDCE06] px-2 py-0.5 rounded inline-block">
                            Equipment Request
                          </span>
                        )}
                        <p className="text-sm font-[Inter]">{msg.message}</p>
                        <p className="text-[10px] opacity-60 mt-1 font-[Inter]">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isAdmin && msg.read_at && (
                            <span className="ml-2 text-blue-500">✓✓</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-[#1F1F20] border-t border-[#333333] p-4 flex-shrink-0">
              <div className="flex items-center gap-3 bg-[#292A2B] border border-[#444444] rounded-lg px-4 py-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-[#E5E5E5] text-sm placeholder-[#9CA3AF] font-[Inter] outline-none resize-none min-h-[32px] max-h-[100px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !messageText.trim()}
                  className="bg-[#FDCE06] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 14L14 8L2 2L2 6L10 8L2 10L2 14Z" fill="#000" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;
