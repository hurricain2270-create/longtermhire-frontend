// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { useOnlineStatus } from "../contexts/OnlineStatusContext";
import { chatApi } from "../services/chatApi";
import { equipmentApi } from "../services/equipmentApi";
import { ClipLoader } from "react-spinners";

const Chat = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [messageInput, setMessageInput] = useState("");
    const [clients, setClients] = useState([]);
    const [showNewConversationModal, setShowNewConversationModal] =
        useState(false);
    const [page, setPage] = useState(1);
    // const [hasMoreMessages, setHasMoreMessages] = useState(true);
    // const [loadingMore, setLoadingMore] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState("");
    const [showSidebar, setShowSidebar] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [clientStatus, setClientStatus] = useState({});
    const [clientStatusLoading, setClientStatusLoading] = useState(false);
    const [userSwitchedConversation, setUserSwitchedConversation] =
        useState(false);
    const [hasUnreadFromPolling, setHasUnreadFromPolling] = useState(false);
    const [justSwitchedConversation, setJustSwitchedConversation] =
        useState(false);
    const [shouldScrollOnNextLoad, setShouldScrollOnNextLoad] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Refs for scroll management and file input
    const messagesEndRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const lastConversationIdRef = useRef(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Use the chat hook for real-time functionality
    const {
        conversations,
        messages,
        loading, // For conversations list
        loadingMessages, // For messages
        hasMoreMessages,
        loadingMore,
        currentPage,
        loadConversations,
        loadMessages,
        loadMoreMessages,
        sendMessage,
        startPolling,
        stopPolling,
        clearMessages,
    } = useChat((newMessages) => {
        // Check if any of the new messages are from clients (not from current admin)
        const currentUserId = parseInt(localStorage.getItem("userId"));
        const hasClientMessages = newMessages.some(
            (msg) => parseInt(msg.from_user_id) !== currentUserId
        );

        if (hasClientMessages) {
            console.log("📨 New client messages from polling - setting unread flag");
            setHasUnreadFromPolling(true);
        }
    });

    // Use global online status
    const { adminOnline, adminStatus } = useOnlineStatus();

    // Get current admin user ID
    const currentUserId = parseInt(localStorage.getItem("userId"));

    // Filter conversations based on search query
    const filteredConversations = conversations.filter((conversation) =>
        conversation.other_user_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    // Filter messages to only show messages for the selected conversation
    const filteredMessages = messages.filter((message) => {
        if (!selectedConversation) return false;

        // Check if message belongs to this conversation
        // Convert IDs to numbers for comparison to handle string/number mismatches
        const conversationUserIds = [
            parseInt(selectedConversation.user1_id),
            parseInt(selectedConversation.user2_id),
        ];

        const messageFromUserId = parseInt(message.from_user_id);
        const messageToUserId = parseInt(message.to_user_id);

        return (
            conversationUserIds.includes(messageFromUserId) &&
            conversationUserIds.includes(messageToUserId)
        );
    });

    // Group messages by date for date headers
    const groupMessagesByDate = (msgs) => {
        const groups = {};
        msgs.forEach((m) => {
            if (!m.created_at) return;
            const dateObj = new Date(m.created_at);
            if (isNaN(dateObj.getTime())) return;

            // Use ISO date part (YYYY-MM-DD) as key for reliable sorting and parsing
            const d = dateObj.toISOString().split("T")[0];
            if (!groups[d]) groups[d] = [];
            groups[d].push(m);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(filteredMessages);

    // Get client ID from conversation
    const getClientIdFromConversation = (conversation) => {
        const currentUserId = parseInt(localStorage.getItem("userId"));
        const user1Id = parseInt(conversation.user1_id);
        const user2Id = parseInt(conversation.user2_id);

        // Return the ID that's not the current admin user
        return user1Id === currentUserId ? user2Id : user1Id;
    };

    // Get client online status
    const getClientOnlineStatus = (conversation) => {
        const clientId = getClientIdFromConversation(conversation);
        return clientStatus[clientId] || { is_online: false, last_seen: null };
    };

    // Enhanced auto-scroll to bottom when new messages arrive
    const scrollToBottom = (force = false) => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                const container = messagesEndRef.current.parentElement;
                if (container) {
                    const isNearBottom =
                        container.scrollHeight -
                        container.scrollTop -
                        container.clientHeight <
                        100;

                    if (force || isNearBottom) {
                        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                }
            }
        }, 100);
    };

    // Auto-scroll when messages change
    useEffect(() => {
        if (filteredMessages.length > lastMessageCountRef.current) {
            // Only auto-scroll if we're not currently loading more messages
            // AND either user switched conversation OR there are unread messages from polling
            if (!loadingMore && (userSwitchedConversation || hasUnreadFromPolling)) {
                console.log("📩 Auto-scrolling for new messages:", {
                    userSwitchedConversation,
                    hasUnreadFromPolling,
                });
                scrollToBottom(true); // Force scroll for new messages
                setHasUnreadFromPolling(false); // Reset the flag
            }
            lastMessageCountRef.current = filteredMessages.length;
        }
    }, [
        filteredMessages,
        loadingMore,
        userSwitchedConversation,
        hasUnreadFromPolling,
    ]);

    // Auto-scroll when conversation changes (only when user manually switches)
    useEffect(() => {
        if (selectedConversation && !loadingMore && userSwitchedConversation) {
            console.log("🔄 User switched conversation - auto-scrolling to bottom");
            setTimeout(() => scrollToBottom(true), 100); // Small delay to ensure DOM is updated
            setUserSwitchedConversation(false); // Reset the flag
        }
    }, [selectedConversation, userSwitchedConversation]); // Only run when user switches

    // Auto-scroll when switching to a new conversation
    useEffect(() => {
        if (
            selectedConversation &&
            selectedConversation.id !== lastConversationIdRef.current
        ) {
            console.log(
                "📋 Switched to new conversation - will scroll when messages load"
            );
            lastConversationIdRef.current = selectedConversation.id;
            setShouldScrollOnNextLoad(true); // Set flag to scroll on next message load
        }
    }, [selectedConversation?.id]);

    // Auto-scroll when messages are loaded and we should scroll (conversation switch or first load)
    useEffect(() => {
        if (
            selectedConversation &&
            filteredMessages.length > 0 &&
            !loadingMore &&
            shouldScrollOnNextLoad
        ) {
            console.log("📋 Messages loaded - auto-scrolling to bottom");
            setTimeout(() => scrollToBottom(true), 100);
            setShouldScrollOnNextLoad(false); // Reset the flag
        }
    }, [
        filteredMessages.length,
        selectedConversation?.id,
        loadingMore,
        shouldScrollOnNextLoad,
    ]);

    // Load conversations and clients on component mount (only once)
    useEffect(() => {
        loadConversations();
        loadClients();
        loadClientStatus();
    }, [loadConversations]);

    // Set up periodic refresh of conversations to update unread counts
    // Use a separate effect to avoid reloading clients unnecessarily
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            // Only refresh conversations, not clients (to avoid unnecessary re-renders)
            loadConversations(false); // Don't show loading spinner on background refresh
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(refreshInterval);
    }, [loadConversations]);

    // Separate effect for client status refresh (less frequent)
    useEffect(() => {
        const statusInterval = setInterval(() => {
            loadClientStatus();
        }, 10000); // Refresh client status every 10 seconds (less frequent)

        return () => clearInterval(statusInterval);
    }, []);

    // Load clients for new conversation
    const loadClients = async () => {
        try {
            const response = await chatApi.getClients();
            if (!response.error) {
                setClients(response.data || []);
            }
        } catch (error) {
            console.error("Failed to load clients:", error);
        }
    };

    // Load client online status
    const loadClientStatus = async () => {
        try {
            setClientStatusLoading(true);
            const response = await chatApi.getClientStatus();
            if (!response.error) {
                // Create a map of client ID to status for easy lookup
                const statusMap = {};
                response.data.clients.forEach((client) => {
                    statusMap[client.id] = {
                        is_online: client.is_online,
                        last_seen: client.last_seen,
                    };
                });
                setClientStatus(statusMap);
            }
        } catch (error) {
            console.error("Failed to load client status:", error);
        } finally {
            setClientStatusLoading(false);
        }
    };

    // Handle conversation selection
    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setUserSwitchedConversation(true); // Mark that user manually switched
        clearMessages();
        loadMessages(conversation.id);
        startPolling(conversation.id);
        // Close sidebar on mobile when conversation is selected
        setShowSidebar(false);
    };

    // Handle file selection (from input or drag & drop)
    const processFile = (file: File) => {
        if (!file) return;

        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert("File size must be less than 50MB");
            return;
        }

        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    // Handle file selection from input
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    // Handle drag and drop
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the drop zone
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]); // Only process first file
        }
    };

    // Handle sending messages with optional file attachment
    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !selectedFile) || !selectedConversation || sendingMessage) return;

        try {
            setSendingMessage(true);
            let attachmentData = null;
            let messageType = "text";

            // Upload file if selected
            if (selectedFile) {
                setUploadingFile(true);
                try {
                    const uploadResponse = await equipmentApi.uploadFile(selectedFile);
                    if (uploadResponse && uploadResponse.url) {
                        // Determine message type based on file MIME type
                        if (selectedFile.type.startsWith("image/")) {
                            messageType = "image";
                        } else if (selectedFile.type === "application/pdf") {
                            messageType = "pdf";
                        } else {
                            messageType = "file";
                        }

                        attachmentData = {
                            attachment_url: uploadResponse.url,
                            attachment_type: messageType,
                            attachment_name: selectedFile.name,
                            attachment_size: selectedFile.size,
                        };
                    } else {
                        throw new Error("Upload failed - no URL returned");
                    }
                } catch (uploadError) {
                    console.error("File upload error:", uploadError);
                    alert("Failed to upload file. Please try again.");
                    return;
                } finally {
                    setUploadingFile(false);
                }
            }

            const messageData = {
                to_user_id: selectedConversation.other_user_id,
                message: messageInput.trim() || (selectedFile ? `Sent a file: ${selectedFile.name}` : ""),
                message_type: messageType,
                from_user_id: currentUserId,
                ...attachmentData,
            };

            const result = await sendMessage(messageData);
            if (!result.error) {
                setMessageInput("");
                setSelectedFile(null);
                setFilePreview(null);
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                console.error("Failed to send message:", result.message);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSendingMessage(false);
        }
    };

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    // Refresh client status periodically
    useEffect(() => {
        const interval = setInterval(() => {
            loadClientStatus();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Start conversation with selected client
    const handleStartConversation = async (client = null) => {
        try {
            let clientToUse = client;

            // If no client passed, use selectedClientId and find the client
            if (!client && selectedClientId) {
                console.log("Selected client ID from dropdown:", selectedClientId);
                console.log("Available clients:", clients);
                clientToUse = clients.find(
                    (c) => c.user_id === parseInt(selectedClientId)
                );
                console.log("Found client:", clientToUse);
            }

            if (!clientToUse) {
                console.error("No client selected");
                console.log("Available clients:", clients);
                console.log("Selected client ID:", selectedClientId);
                return;
            }

            console.log("Selected client:", clientToUse);

            // Double-check that this client doesn't already have a conversation
            if (clientToUse.has_conversation === 1) {
                console.error("Client already has a conversation:", clientToUse);
                // Instead of returning, we should find the existing conversation and select it
                const existingConversation = conversations.find(
                    (conv) =>
                        parseInt(conv.user1_id) === clientToUse.user_id ||
                        parseInt(conv.user2_id) === clientToUse.user_id
                );

                if (existingConversation) {
                    console.log("Found existing conversation:", existingConversation);
                    handleSelectConversation(existingConversation);
                    setShowNewConversationModal(false);
                    setSelectedClientId("");
                    return;
                } else {
                    console.error(
                        "Client has has_conversation=1 but no conversation found in list"
                    );
                    return;
                }
            }

            console.log("Starting conversation with client:", clientToUse);
            console.log("Client ID being sent:", clientToUse.user_id);
            console.log("Client ID type:", typeof clientToUse.user_id);

            // Ensure client_id is a valid number
            if (!clientToUse.user_id || isNaN(clientToUse.user_id)) {
                console.error("Invalid client ID:", clientToUse.user_id);
                return;
            }

            const response = await chatApi.startConversation(
                clientToUse.user_id,
                "" // Empty message - no pre-generated message
            );

            if (!response.error) {
                console.log("Conversation started successfully:", response);

                // Check if the response contains the new conversation data
                if (response.data && response.data.conversation) {
                    console.log(
                        "Auto-selecting new conversation from response:",
                        response.data.conversation
                    );
                    handleSelectConversation(response.data.conversation);
                } else {
                    // Fallback: reload conversations and find the new one
                    await loadConversations();

                    // Wait a bit for the state to update, then find and select the new conversation
                    setTimeout(async () => {
                        // Get the updated conversations list
                        const updatedConversations = await chatApi.getConversations();

                        // Find the newly created conversation
                        const newConversation = updatedConversations.data.find(
                            (conv) =>
                                parseInt(conv.user1_id) === clientToUse.user_id ||
                                parseInt(conv.user2_id) === clientToUse.user_id
                        );

                        if (newConversation) {
                            console.log("Auto-selecting new conversation:", newConversation);
                            handleSelectConversation(newConversation);
                        }
                    }, 100);
                }

                setShowNewConversationModal(false);
                setSelectedClientId("");
            } else {
                console.error("Failed to start conversation:", response);
            }
        } catch (error) {
            console.error("Failed to start conversation:", error);
        }
    };

    return (
        <div className="flex h-full bg-[#1F1F20] text-[#E5E5E5] relative">
            {/* Mobile Sidebar Overlay */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setShowSidebar(false)}
                />
            )}

            {/* Left Column - Conversations List */}
            <div
                className={`
        ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        fixed lg:relative
        top-0 left-0
        w-80 h-full
        bg-[#1F1F20] border-r border-[#333333]
        flex flex-col
        z-50 lg:z-auto
        transition-transform duration-300 ease-in-out
        lg:transition-none
      `}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-[#333333]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-xl sm:text-2xl leading-tight">
                                Chat
                            </h1>
                            {clientStatusLoading && (
                                <div className="flex items-center gap-1">
                                    <ClipLoader size={12} color="#FDCE06" />
                                    {/* Status update text removed to prevent layout shift */}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowNewConversationModal(true)}
                                className="bg-[#FDCE06] text-[#1F1F20] px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-[#E5B800] transition-colors flex items-center gap-2 text-sm sm:text-base"
                            >
                                <span className="hidden sm:inline">New Chat</span>
                                <span className="sm:hidden">New</span>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>
                            {/* Close button for mobile */}
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="lg:hidden text-[#E5E5E5] p-2 hover:bg-[#292A2B] rounded-lg transition-colors"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#292A2B] text-[#E5E5E5] placeholder-[#9CA3AF] pl-10 pr-4 py-3 rounded-lg border border-[#333333] focus:border-[#FDCE06] focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-[#9CA3AF]">Loading conversations...</div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-[#9CA3AF]">No conversations found</div>
                        </div>
                    ) : (
                        filteredConversations.map((conversation) => {
                            const clientStatus = getClientOnlineStatus(conversation);
                            return (
                                <div
                                    key={conversation.id}
                                    onClick={() => handleSelectConversation(conversation)}
                                    className={`p-4 border-b border-[#333333] cursor-pointer overflow-hidden hover:bg-[#292A2B] transition-colors ${selectedConversation?.id === conversation.id
                                        ? "bg-[#292A2B] border-l-4 border-l-[#FDCE06]"
                                        : ""
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 max-w-[90%]">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[#E5E5E5] font-medium">
                                                    {conversation.other_user_name || "Unknown User"}
                                                </h3>
                                                {/* Online Status Indicator */}
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${clientStatus.is_online
                                                            ? "bg-green-500"
                                                            : "bg-gray-500"
                                                            }`}
                                                    ></div>
                                                    <span
                                                        className={`text-xs ${clientStatus.is_online
                                                            ? "text-green-400"
                                                            : "text-gray-400"
                                                            }`}
                                                    >
                                                        {clientStatus.is_online ? "Online" : "Offline"}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[#9CA3AF] text-sm truncate mt-1">
                                                {conversation.last_message_text || "No messages yet"}
                                            </p>
                                            {/* Last Seen Info */}
                                            {!clientStatus.is_online && clientStatus.last_seen && !isNaN(new Date(clientStatus.last_seen).getTime()) && (
                                                <p className="text-[#9CA3AF] text-xs mt-1">
                                                    Last seen:{" "}
                                                    {new Date(clientStatus.last_seen).toLocaleString("en-AU")}
                                                </p>
                                            )}
                                        </div>
                                        {conversation.unread_count > 0 && (
                                            <div className="bg-[#FDCE06] text-[#1F1F20] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                                                {conversation.unread_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Column - Chat Messages and Input */}
            <div className="flex-1 flex flex-col lg:ml-0">
                {/* Mobile Header with Hamburger Menu */}
                <div className="lg:hidden bg-[#1F1F20] border-b border-[#333333] p-4 flex items-center justify-between">
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="text-[#E5E5E5] p-2 hover:bg-[#292A2B] rounded-lg transition-colors"
                    >
                        <svg
                            width="18"
                            height="15"
                            viewBox="0 0 18 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <g clip-path="url(#clip0_2_1204)">
                                <path
                                    d="M5.9378 10.375C9.0796 10.375 11.6253 8.22031 11.6253 5.5625C11.6253 2.90469 9.0796 0.75 5.9378 0.75C2.796 0.75 0.250299 2.90469 0.250299 5.5625C0.250299 6.61797 0.652252 7.59414 1.33311 8.38984C1.23741 8.64687 1.09522 8.87383 0.94483 9.06523C0.81358 9.23477 0.679596 9.36602 0.581159 9.45625C0.53194 9.5 0.490924 9.53555 0.463581 9.55742C0.449909 9.56836 0.438971 9.57656 0.433502 9.5793L0.428034 9.58477C0.277643 9.69688 0.212018 9.89375 0.272174 10.0715C0.332331 10.2492 0.499127 10.375 0.687799 10.375C1.28389 10.375 1.88546 10.2219 2.38585 10.0332C2.63741 9.9375 2.87256 9.83086 3.07764 9.72148C3.9171 10.1371 4.89327 10.375 5.9378 10.375ZM12.5003 5.5625C12.5003 8.6332 9.79053 10.9465 6.58038 11.2227C7.24483 13.257 9.44874 14.75 12.0628 14.75C13.1073 14.75 14.0835 14.5121 14.9257 14.0965C15.1308 14.2059 15.3632 14.3125 15.6148 14.4082C16.1151 14.5969 16.7167 14.75 17.3128 14.75C17.5015 14.75 17.671 14.627 17.7284 14.4465C17.7858 14.266 17.723 14.0691 17.5698 13.957L17.5644 13.9516C17.5589 13.9461 17.548 13.9406 17.5343 13.9297C17.5069 13.9078 17.4659 13.875 17.4167 13.8285C17.3183 13.7383 17.1843 13.607 17.053 13.4375C16.9026 13.2461 16.7605 13.0164 16.6648 12.7621C17.3456 11.9691 17.7476 10.993 17.7476 9.93477C17.7476 7.39727 15.4261 5.31641 12.4812 5.13594C12.4921 5.27539 12.4976 5.41758 12.4976 5.55977L12.5003 5.5625Z"
                                    fill="#FDCE06"
                                />
                            </g>
                            <defs>
                                <clipPath id="clip0_2_1204">
                                    <path d="M0.25 0.75H17.75V14.75H0.25V0.75Z" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                    <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-xl">
                        {selectedConversation
                            ? selectedConversation.other_user_name
                            : "Chat"}
                    </h1>
                    <div className="w-10"></div> {/* Spacer for centering */}
                </div>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-[#1F1F20] border-b border-[#333333] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-[#E5E5E5] font-semibold text-lg">
                                        {selectedConversation.other_user_name || "Unknown User"}
                                    </h2>
                                    <div className="flex items-center gap-4 mt-1">
                                        {/* Client Online Status */}
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-2 h-2 rounded-full ${getClientOnlineStatus(selectedConversation).is_online
                                                    ? "bg-green-500"
                                                    : "bg-gray-500"
                                                    }`}
                                            ></div>
                                            <span
                                                className={`text-xs ${getClientOnlineStatus(selectedConversation).is_online
                                                    ? "text-green-400"
                                                    : "text-gray-400"
                                                    }`}
                                            >
                                                {getClientOnlineStatus(selectedConversation).is_online
                                                    ? "Client Online"
                                                    : "Client Offline"}
                                            </span>
                                        </div>
                                        {/* Admin Online Status */}
                                    </div>
                                    {/* Client Last Seen */}
                                    {!getClientOnlineStatus(selectedConversation).is_online &&
                                        getClientOnlineStatus(selectedConversation).last_seen &&
                                        !isNaN(new Date(getClientOnlineStatus(selectedConversation).last_seen).getTime()) && (
                                            <p className="text-[#9CA3AF] text-xs mt-1">
                                                Client last seen:{" "}
                                                {new Date(
                                                    getClientOnlineStatus(selectedConversation).last_seen
                                                ).toLocaleString("en-AU")}
                                            </p>
                                        )}
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#292A2B]"
                            style={{ scrollBehavior: "smooth" }}
                        >
                            {/* Load More Button */}
                            {hasMoreMessages && (
                                <div className="flex justify-center mb-4">
                                    <button
                                        onClick={() => loadMoreMessages(selectedConversation.id)}
                                        disabled={loadingMore}
                                        className="bg-[#333333] text-[#E5E5E5] px-4 py-2 rounded-lg hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                    >
                                        {loadingMore ? (
                                            <div className="flex items-center gap-2">
                                                <ClipLoader size={12} color="#E5E5E5" />
                                                Loading...
                                            </div>
                                        ) : (
                                            "Load More Messages"
                                        )}
                                    </button>
                                </div>
                            )}
                            {(loadingMessages || loading) && filteredMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-[#9CA3AF] flex items-center gap-2">
                                        <ClipLoader size={20} color="#FDCE06" />
                                        Loading messages...
                                    </div>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-[#9CA3AF]">
                                        No messages yet. Start the conversation!
                                    </div>
                                </div>
                            ) : (
                                Object.entries(messageGroups).map(([date, dateMessages]) => (
                                    <div key={date}>
                                        {/* Date Header */}
                                        <div className="flex justify-center my-4">
                                            <div className="bg-[#333333] text-[#9CA3AF] text-xs px-3 py-1 rounded-full">
                                                {(() => {
                                                    // date is 'YYYY-MM-DD' from groupMessagesByDate
                                                    // Append time to ensure it's treated as local or consistent UTC
                                                    const dateObj = new Date(date + "T00:00:00");
                                                    return isNaN(dateObj.getTime()) ? "Unknown Date" : dateObj.toLocaleDateString("en-AU", {
                                                        weekday: "long",
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        {/* Messages for this date */}
                                        {dateMessages.map((message) => {
                                            // Check if message is from current user (admin)
                                            // Convert both to numbers for comparison to handle string/number mismatches
                                            const isFromCurrentUser =
                                                parseInt(message.from_user_id) === currentUserId;
                                            const isEquipmentRequest =
                                                message.message_type === "equipment_request";

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"
                                                        }`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] mb-5 sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isEquipmentRequest
                                                            ? "bg-[#FDCE06] text-[#1F1F20] border-2 border-[#E5B800]"
                                                            : isFromCurrentUser
                                                                ? "bg-[#FDCE06] text-[#1F1F20]"
                                                                : "bg-[#1F1F20] text-[#E5E5E5] border border-[#333333]"
                                                            }`}
                                                    >
                                                        {isEquipmentRequest && (
                                                            <div className="mb-2">
                                                                <span className="text-xs font-bold bg-[#1F1F20] text-[#FDCE06] px-2 py-1 rounded">
                                                                    Equipment Request
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Message Text - hide default file message if attachment exists */}
                                                        {message.message && !(message.attachment_url && message.message.startsWith("Sent a file:")) && (
                                                            <p className="text-sm">{message.message}</p>
                                                        )}
                                                        {message.equipment_name && (
                                                            <div className="mt-2 text-xs opacity-80">
                                                                Equipment: {message.equipment_name}
                                                            </div>
                                                        )}
                                                        {/* File Attachment Display */}
                                                        {message.attachment_url && (
                                                            <div className="mt-2">
                                                                {message.attachment_type === "image" ? (
                                                                    <img
                                                                        src={message.attachment_url}
                                                                        alt={message.attachment_name || "Image"}
                                                                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                        style={{ maxHeight: "200px", maxWidth: "280px" }}
                                                                        onClick={() => window.open(message.attachment_url, "_blank")}
                                                                    />
                                                                ) : (
                                                                    <a
                                                                        href={message.attachment_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 p-3 bg-[#292A2B] border border-[#333333] rounded-lg hover:bg-[#333333] hover:border-[#FDCE06] transition-colors"
                                                                    >
                                                                        <svg
                                                                            width="20"
                                                                            height="20"
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            stroke="#FDCE06"
                                                                            strokeWidth="2"
                                                                            className="flex-shrink-0"
                                                                        >
                                                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                                                            <polyline points="13 2 13 9 20 9" />
                                                                        </svg>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-[#E5E5E5] truncate">
                                                                                {message.attachment_name || "Download File"}
                                                                            </p>
                                                                            {message.attachment_size && (
                                                                                <p className="text-xs text-[#ADAEBC] mt-0.5">
                                                                                    {message.attachment_size > 1024 * 1024
                                                                                        ? `${(message.attachment_size / (1024 * 1024)).toFixed(2)} MB`
                                                                                        : `${(message.attachment_size / 1024).toFixed(2)} KB`}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <svg
                                                                            width="16"
                                                                            height="16"
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            stroke="#FDCE06"
                                                                            strokeWidth="2"
                                                                            className="flex-shrink-0"
                                                                        >
                                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                                            <polyline points="7 10 12 15 17 10" />
                                                                            <line x1="12" y1="15" x2="12" y2="3" />
                                                                        </svg>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p
                                                                className={`text-xs ${isFromCurrentUser
                                                                    ? "text-[#1F1F20] opacity-70"
                                                                    : "text-[#9CA3AF]"
                                                                    }`}
                                                            >
                                                                {(() => {
                                                                    const dateObj = new Date(message.created_at);
                                                                    return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleTimeString("en-AU", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    });
                                                                })()}
                                                            </p>
                                                            {/* Read Receipt */}
                                                            {isFromCurrentUser && (
                                                                <div className="flex items-center gap-1">
                                                                    {message.read_at ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                className="text-blue-500"
                                                                            >
                                                                                <polyline points="20,6 9,17 4,12" />
                                                                            </svg>
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                className="text-blue-500"
                                                                            >
                                                                                <polyline points="20,6 9,17 4,12" />
                                                                            </svg>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1">
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                className="text-gray-400"
                                                                            >
                                                                                <polyline points="20,6 9,17 4,12" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                            {/* Scroll anchor */}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div
                            ref={dropZoneRef}
                            className={`bg-[#1F1F20] border-t border-[#333333] p-3 sm:p-4 relative ${isDragging ? 'border-[#FDCE06] border-2 border-dashed' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {/* Drag and Drop Overlay */}
                            {isDragging && (
                                <div className="absolute inset-0 bg-[#1F1F20] bg-opacity-95 border-2 border-dashed border-[#FDCE06] rounded-lg flex items-center justify-center z-10">
                                    <div className="text-center">
                                        <svg
                                            width="48"
                                            height="48"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#FDCE06"
                                            strokeWidth="2"
                                            className="mx-auto mb-2"
                                        >
                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                        </svg>
                                        <p className="text-[#FDCE06] font-medium text-lg">Drop file here to upload</p>
                                        <p className="text-[#9CA3AF] text-sm mt-1">Max file size: 50MB</p>
                                    </div>
                                </div>
                            )}

                            {/* File Preview */}
                            {selectedFile && (
                                <div className="mb-3 p-3 bg-[#292A2B] rounded-lg border border-[#333333]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {filePreview ? (
                                                <img
                                                    src={filePreview}
                                                    alt="Preview"
                                                    className="w-16 h-16 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-[#333333] rounded flex items-center justify-center">
                                                    <svg
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="text-[#9CA3AF]"
                                                    >
                                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                                        <polyline points="13 2 13 9 20 9" />
                                                    </svg>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-[#E5E5E5] text-sm font-medium">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-[#9CA3AF] text-xs">
                                                    {selectedFile.size > 1024 * 1024
                                                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                                                        : `${(selectedFile.size / 1024).toFixed(2)} KB`}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setFilePreview(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = "";
                                                }
                                            }}
                                            className="text-[#9CA3AF] hover:text-[#E5E5E5] p-2 rounded-lg hover:bg-[#333333] transition-colors"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                    {uploadingFile && (
                                        <div className="mt-2">
                                            <div className="w-full bg-[#333333] rounded-full h-2">
                                                <div className="bg-[#FDCE06] h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
                                            </div>
                                            <p className="text-[#9CA3AF] text-xs mt-1">Uploading...</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    className="hidden"
                                />

                                {/* Attachment Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFile}
                                    className="text-[#9CA3AF] hover:text-[#FDCE06] p-2 rounded-lg hover:bg-[#292A2B] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Attach file"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                    </svg>
                                </button>

                                {/* Text Input */}
                                <div className="flex-1">
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Type your message here..."
                                        className="w-full bg-[#292A2B] text-[#E5E5E5] placeholder-[#9CA3AF] p-3 rounded-lg border border-[#333333] focus:border-[#FDCE06] focus:outline-none resize-none"
                                        rows="1"
                                        style={{
                                            minHeight: "44px",
                                            maxHeight: "120px",
                                            resize: "none",
                                        }}
                                        disabled={sendingMessage}
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    onClick={handleSendMessage}
                                    disabled={(!messageInput.trim() && !selectedFile) || loading || sendingMessage}
                                    className="bg-[#FDCE06] text-[#1F1F20] p-3 rounded-lg hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                >
                                    {sendingMessage ? (
                                        <ClipLoader size={16} color="#1F1F20" />
                                    ) : (
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22,2 15,22 11,13 2,9 22,2" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-[#292A2B]">
                        <div className="text-center">
                            <h3 className="text-[#E5E5E5] text-xl font-semibold mb-2">
                                Select a conversation
                            </h3>
                            <p className="text-[#9CA3AF]">
                                Choose a conversation from the sidebar to start chatting
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Client Selection Modal */}
            {showNewConversationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 w-full max-w-md">
                        <h3 className="text-[#E5E5E5] text-lg font-semibold mb-4">
                            Start New Conversation
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#E5E5E5] text-sm font-medium mb-2">
                                    Select Client
                                </label>
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="w-full bg-[#292A2B] text-[#E5E5E5] border border-[#333333] rounded-lg px-3 py-2 focus:border-[#FDCE06] focus:outline-none"
                                >
                                    <option value="">Choose a client...</option>
                                    {clients
                                        .filter((client) => client.has_conversation === 0)
                                        .map((client) => (
                                            <option key={client.user_id} value={client.user_id}>
                                                {client.name} ({client.email})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewConversationModal(false)}
                                    className="flex-1 bg-[#333333] text-[#E5E5E5] py-2 px-4 rounded-lg hover:bg-[#404040] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleStartConversation()}
                                    disabled={!selectedClientId}
                                    className="flex-1 bg-[#FDCE06] font-bold text-[#1F1F20] py-2 px-4 rounded-lg hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Start Chat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
