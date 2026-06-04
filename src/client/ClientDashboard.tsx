// @ts-nocheck
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clientAuthApi } from "../services/clientAuthApi";
import { clientEquipmentApi } from "../services/clientEquipmentApi";
import { chatApi } from "../services/chatApi";
import { dashboardApi } from "../services/dashboardApi";
import { equipmentApi } from "../services/equipmentApi";
import { useClientChat } from "../hooks/useClientChat";
import { useCompanyLogo } from "../hooks/useCompanyLogo";
import { ClipLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Load readable handwritten-style font
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Patrick+Hand&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);
import EquipmentCard from "./components/EquipmentCard";
import QuickViewModal from "./components/QuickViewModal";
import CategoryFilter from "./components/CategoryFilter";
import { calculateMonthlyPrices } from "../utils/pricingCalculator";

// Add custom CSS for scrollbar hiding and range input styling
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #0075FF;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #0075FF;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

// Inject the styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = scrollbarHideStyles;
document.head.appendChild(styleSheet);

// Format currency with English locale and thousands separators
const formatCurrency = (value) => {
  const number = typeof value === "number" ? value : parseFloat(value || 0);
  const safeNumber = Number.isFinite(number) ? number : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeNumber);
};

function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(
    "CAT 320 Hydraulic Excavator"
  );
  const [selectedDuration, setSelectedDuration] = useState("3 months");
  const [requestLoading, setRequestLoading] = useState({});
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [error, setError] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [selectedImages, setSelectedImages] = useState({}); // Track selected image for each equipment
  const [imageObjectFit, setImageObjectFit] = useState({}); // Track object-fit class for each image
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewEquipment, setQuickViewEquipment] = useState(null);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0); // Track scroll position
  const [unreadMessageCount, setUnreadMessageCount] = useState(0); // Track unread messages
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track when load more is clicked
  const [justSentMessage, setJustSentMessage] = useState(false); // Track when user just sent a message
  const [shouldPreventAutoScroll, setShouldPreventAutoScroll] = useState(false); // Prevent auto-scroll after load more
  const [hasUnreadFromPolling, setHasUnreadFromPolling] = useState(false); // Track if polling brought unread messages
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false); // Track if messages have been initially loaded
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); // Track selected categories for filtering
  const [allCategories, setAllCategories] = useState<string[]>([]); // Track all available categories
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // const [hasMoreMessages, setHasMoreMessages] = useState(true);
  // const [loadingMore, setLoadingMore] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // Refs for file input and drag zone
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Track loaded images for instant switching
  const [loadedImages, setLoadedImages] = useState(new Set());

  // Mark image as loaded when it loads
  const handleImageLoad = useCallback((imageUrl) => {
    setLoadedImages((prev) => new Set(prev).add(imageUrl));
  }, []);

  // Memoized image switching functions for better performance
  const nextImage = useCallback(() => {
    if (quickViewEquipment?.allImages?.length > 1) {
      const nextIndex =
        (quickViewImageIndex + 1) % quickViewEquipment.allImages.length;
      setQuickViewImageIndex(nextIndex);
    }
  }, [quickViewEquipment?.allImages?.length, quickViewImageIndex]);

  const previousImage = useCallback(() => {
    if (quickViewEquipment?.allImages?.length > 1) {
      const prevIndex =
        (quickViewImageIndex - 1 + quickViewEquipment.allImages.length) %
        quickViewEquipment.allImages.length;
      setQuickViewImageIndex(prevIndex);
    }
  }, [quickViewEquipment?.allImages?.length, quickViewImageIndex]);

  // Preload quick view images when modal opens
  const preloadQuickViewImages = useCallback(
    (images) => {
      if (images && Array.isArray(images)) {
        images.forEach((img) => {
          if (img.image_url) {
            const imgElement = new Image();
            imgElement.onload = () => {
              // Mark this image as loaded immediately
              handleImageLoad(img.image_url);
            };
            imgElement.src = img.image_url;
          }
        });
      }
    },
    [handleImageLoad]
  );

  // Refs for scroll management
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // Use real chat functionality with online status
  const {
    conversations,
    messages,
    loading: chatLoading,
    error: chatError,
    adminOnline,
    adminStatus,
    hasMoreMessages,
    loadingMore,
    currentPage,
    unreadCount: hookUnreadCount,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    startPolling,
    stopPolling,
    clearMessages,
    clearUnreadCount,
    clearError: clearChatError,
  } = useClientChat();
  const { companyLogo } = useCompanyLogo();

  // Track screen size to determine which chat state to use
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Get current user ID - simple approach
  const getCurrentUserId = () => {
    const clientUserId = localStorage.getItem("clientUserId");
    const userId = localStorage.getItem("user_id");

    return parseInt(clientUserId || userId || "0");
  };

  // Get user's role from company_roles in localStorage
  const getUserRole = () => {
    try {
      const companyRoles = JSON.parse(
        localStorage.getItem("clientCompanyRoles") || "[]"
      );
      if (companyRoles && companyRoles.length > 0) {
        return companyRoles[0].role; // Get first company role
      }
    } catch (e) {
      console.error("Error parsing company roles:", e);
    }
    return "member"; // Default
  };

  // Group messages by date for date headers
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((message) => {
      const date = formatChatDate(message.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  const [companySettings, setCompanySettings] = useState({
    header_ad_text: "",
    sticky_ad_text: "",
    company_logo: "",
  });

  // Load selected categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem("selectedCategories");
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        setSelectedCategories(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Error parsing saved categories:", e);
      }
    }
  }, []);

  // Save selected categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "selectedCategories",
      JSON.stringify(selectedCategories)
    );
  }, [selectedCategories]);

  // Load client data and equipment on component mount
  useEffect(() => {
    const loadClientData = async () => {
      try {
        // Check if client is authenticated
        if (!clientAuthApi.isAuthenticated()) {
          navigate("/client/login");
          return;
        }

        setLoading(true);

        // Load client profile
        const clientInfo = clientAuthApi.getClientInfo();
        setUser({
          name: clientInfo.profile?.name || clientInfo.email || "Client User",
          email: clientInfo.email,
        });

        // Load company settings
        try {
          const settingsResponse = await clientAuthApi.getCompanySettings();
          console.log("Company settings response:", settingsResponse);
          if (settingsResponse) {
            console.log("Company settings:", settingsResponse);
            // Handle both flat and nested response structures
            const s = settingsResponse.data || settingsResponse;
            setCompanySettings({
              header_ad_text: s.header_ad_text || "",
              sticky_ad_text: s.sticky_ad_text || "",
              company_logo: s.company_logo || "",
            });
            console.log("Company settings loaded:", {
              header_ad_text: settingsResponse.header_ad_text,
              sticky_ad_text: settingsResponse.sticky_ad_text,
              company_logo: settingsResponse.company_logo,
            });
          }
        } catch (settingsError) {
          console.error("Error loading company settings:", settingsError);
          // Don't block loading if settings fail, but log for debugging
          toast.error("Failed to load company settings. Using defaults.");
        }

        // Load equipment from API (with category filter if selected)
        const categoriesToFilter =
          selectedCategories.length > 0 ? selectedCategories : undefined;
        const equipmentResponse =
          await clientEquipmentApi.getEquipment(categoriesToFilter);
        console.log("Equipment API response:", equipmentResponse);

        if (
          equipmentResponse &&
          equipmentResponse.data &&
          equipmentResponse.data.equipment
        ) {
          setEquipment(equipmentResponse.data.equipment);

          // Extract all unique categories from equipment
          const categories = [
            ...new Set(
              equipmentResponse.data.equipment
                .map((item: any) => item.category_name)
                .filter((cat: string) => cat) // Remove empty categories
            ),
          ];
          setAllCategories(categories);

          if (equipmentResponse.data.equipment.length > 0) {
            const firstEquipment = equipmentResponse.data.equipment[0];
            setSelectedEquipment(firstEquipment.equipment_name);

            // Set initial duration to minimum duration of first equipment
            const minDuration = firstEquipment.minimum_duration;
            if (minDuration) {
              const match = minDuration.match(/(\d+)/);
              const minMonths = match ? parseInt(match[1]) : 1;
              setSelectedDuration(
                `${minMonths} month${minMonths > 1 ? "s" : ""}`
              );
            }
          }
        } else if (equipmentResponse && equipmentResponse.equipment) {
          // Fallback for old API structure
          setEquipment(equipmentResponse.equipment);

          // Extract all unique categories from equipment
          const categories = [
            ...new Set(
              equipmentResponse.equipment
                .map((item: any) => item.category_name)
                .filter((cat: string) => cat) // Remove empty categories
            ),
          ];
          setAllCategories(categories);

          if (equipmentResponse.equipment.length > 0) {
            const firstEquipment = equipmentResponse.equipment[0];
            setSelectedEquipment(firstEquipment.equipment_name);

            // Set initial duration to minimum duration of first equipment
            const minDuration = firstEquipment.minimum_duration;
            if (minDuration) {
              const match = minDuration.match(/(\d+)/);
              const minMonths = match ? parseInt(match[1]) : 1;
              setSelectedDuration(
                `${minMonths} month${minMonths > 1 ? "s" : ""}`
              );
            }
          }
        } else {
          console.log("No equipment assigned to this client");
          setEquipment([]);
          setAllCategories([]);
        }
      } catch (error) {
        console.error("Error loading client data:", error);
        setError("Failed to load data. Please try again.");
        // Set empty equipment array on error
        setEquipment([]);
      } finally {
        setLoading(false);
      }
    };

    loadClientData();
  }, [navigate, selectedCategories]); // Reload when categories change

  // Handle category filter changes
  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
    setLoading(true); // Show loading while fetching filtered equipment
  };

  // Preload images for better performance
  const preloadImages = useCallback((images) => {
    if (images && Array.isArray(images)) {
      images.forEach((img) => {
        if (img.image_url) {
          const imgElement = new Image();
          imgElement.onload = () => {
            const { naturalWidth, naturalHeight } = imgElement;
            const aspectRatio = naturalWidth / naturalHeight;
            const is4by3 = Math.abs(aspectRatio - 4 / 3) < 0.1; // Allow small tolerance
            const objectFitClass = is4by3 ? "object-fill" : "object-cover";

            // Store the object-fit class for this image
            setImageObjectFit((prev) => ({
              ...prev,
              [img.image_url]: objectFitClass,
            }));
          };
          imgElement.src = img.image_url;
        }
      });
    }
  }, []);

  // Check if image has 4:3 aspect ratio and return appropriate object-fit class
  const getImageObjectFit = useCallback((imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { naturalWidth, naturalHeight } = img;
        const aspectRatio = naturalWidth / naturalHeight;
        const is4by3 = Math.abs(aspectRatio - 4 / 3) < 0.1; // Allow small tolerance
        resolve(is4by3 ? "object-fill" : "object-cover");
      };
      img.onerror = () => {
        resolve("object-cover"); // Default fallback
      };
      img.src = imageUrl;
    });
  }, []);

  // Preload all equipment images for better performance
  useEffect(() => {
    if (equipment && equipment.length > 0) {
      equipment.forEach((item) => {
        if (item.content?.images && Array.isArray(item.content.images)) {
          preloadImages(item.content.images);
        }
      });
    }
  }, [equipment, preloadImages]);

  // Preload quick view images when modal opens for instant switching
  useEffect(() => {
    if (isQuickViewOpen && quickViewEquipment?.allImages) {
      preloadQuickViewImages(quickViewEquipment.allImages);
    }
  }, [isQuickViewOpen, quickViewEquipment?.allImages, preloadQuickViewImages]);

  // Add keyboard navigation for quick view modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isQuickViewOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          previousImage();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextImage();
          break;
        case "Escape":
          setIsQuickViewOpen(false);
          break;
      }
    };

    if (isQuickViewOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isQuickViewOpen, nextImage, previousImage]);

  // Initialize selected images with main images (is_main: 1) for each equipment
  useEffect(() => {
    if (equipment && equipment.length > 0) {
      const initialSelectedImages = {};
      equipment.forEach((item) => {
        if (item.content?.images && Array.isArray(item.content.images)) {
          const mainImageIndex = item.content.images.findIndex(
            (img) => img.is_main === 1
          );
          if (mainImageIndex !== -1) {
            initialSelectedImages[item.equipment_id || item.id] =
              mainImageIndex;
          }
        }
      });
      setSelectedImages(initialSelectedImages);
    }
  }, [equipment]);

  // Track scroll position for dynamic positioning
  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.pageYOffset || document.documentElement.scrollTop);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load chat conversations and start polling
  useEffect(() => {
    const initializeChat = async () => {
      // loadConversations now returns the list directly to avoid React state timing issues
      const convList = await loadConversations();
      if (convList && convList.length > 0) {
        startPolling(convList[0].id);
      }
    };

    initializeChat();
  }, [loadConversations, conversations.length, startPolling]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      const container = messagesContainerRef.current;
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
  };

  // Enhanced scroll to bottom for chat sections
  const scrollChatToBottom = (force = false) => {
    console.log("🔄 scrollChatToBottom called with force:", force);
    console.log("📊 Current states:", {
      loadingMore,
      isLoadingMore,
      shouldPreventAutoScroll,
      justSentMessage,
      isChatVisible,
      isChatOpen,
      messagesCount: messages.length,
    });
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        console.log("✅ Scrolled to bottom");
      }
    }, 100);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Effect to handle auto-scroll when messages change
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;

    console.log("📨 Messages effect triggered:", {
      currentMessageCount,
      previousMessageCount,
      messageCountIncreased: currentMessageCount > previousMessageCount,
      loadingMore,
      isLoadingMore,
      shouldPreventAutoScroll,
      justSentMessage,
    });

    if (currentMessageCount > previousMessageCount) {
      console.log(
        "📈 Message count increased - checking auto-scroll conditions"
      );
      // Only auto-scroll if we're not currently loading more messages
      // This prevents auto-scroll when "Load More" is clicked
      if (!loadingMore && !isLoadingMore && !shouldPreventAutoScroll) {
        console.log("✅ Auto-scroll conditions met - checking message type");

        // Auto-scroll if user just sent a message
        if (justSentMessage) {
          console.log("👤 User just sent message - auto-scrolling");
          scrollChatToBottom(true);
          setJustSentMessage(false); // Reset the flag
        }
        // Auto-scroll if polling brought unread messages and chat is visible
        else if (hasUnreadFromPolling && (isChatVisible || isChatOpen)) {
          console.log("📩 Unread messages from polling - auto-scrolling");
          scrollChatToBottom(true);
          setHasUnreadFromPolling(false); // Reset the flag
        }
        // Check for new admin messages when chat is not visible
        else if (messages.length > 0) {
          console.log("📩 Checking for admin message notifications");
          const latestMessage = messages[messages.length - 1];
          const currentUserId = getCurrentUserId();

          // If message is from admin (not from current user) and chat is hidden
          if (
            latestMessage.from_user_id !== currentUserId &&
            !isChatVisible &&
            !isChatOpen
          ) {
            console.log("🔔 Admin message received - auto-opening chat");
            // Auto-open the chat when new message arrives from admin
            setIsChatVisible(true);

            // Show notification toast
            toast.info("New message received! Chat opened automatically.", {
              position: "top-right",
              autoClose: 3000,
            });
          }
        }
      } else {
        console.log("❌ Auto-scroll blocked by conditions:", {
          loadingMore,
          isLoadingMore,
          shouldPreventAutoScroll,
        });
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [
    messages,
    isChatVisible,
    loadingMore,
    isLoadingMore,
    justSentMessage,
    shouldPreventAutoScroll,
    hasUnreadFromPolling,
    isChatOpen,
  ]);

  // Use unread count from API
  useEffect(() => {
    if (hookUnreadCount !== undefined && hookUnreadCount >= 0) {
      const previousUnreadCount = unreadMessageCount;
      setUnreadMessageCount(hookUnreadCount);

      // Check if unread count increased (new messages from polling)
      if (hookUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
        console.log("📨 Unread count increased from polling - setting flag");
        setHasUnreadFromPolling(true);
      }

      // Auto-open chat if there are unread messages and chat is hidden
      if (hookUnreadCount > 0 && !isChatVisible && !isChatOpen) {
        setIsChatVisible(true);
        toast.info(
          `${hookUnreadCount} unread message${hookUnreadCount > 1 ? "s" : ""} from admin!`,
          {
            position: "top-right",
            autoClose: 4000,
          }
        );
      }
    }
  }, [hookUnreadCount, isChatVisible, isChatOpen, unreadMessageCount]);

  // Mark messages as read when chat becomes visible on the current device
  useEffect(() => {
    // Only mark as read if chat is visible on the current device
    const isChatVisibleOnCurrentDevice = isMobile ? isChatOpen : isChatVisible;

    if (isChatVisibleOnCurrentDevice && messages.length > 0) {
      // Call API to mark messages as read when chat is opened
      const markMessagesRead = async () => {
        try {
          const messageIds = messages
            .filter(
              (msg) =>
                !msg.read_at &&
                parseInt(msg.from_user_id) !== getCurrentUserId()
            )
            .map((msg) => msg.id);

          if (messageIds.length > 0) {
            await dashboardApi.markMessagesAsRead(messageIds);
          }
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }
      };

      markMessagesRead();
    }
  }, [isChatVisible, isChatOpen, isMobile]); // Remove messages from dependencies to prevent auto-reading

  // Auto-scroll on very first load only (runs once when messages are first loaded)
  useEffect(() => {
    console.log("🔍 First load effect triggered:", {
      messagesLength: messages.length,
      hasInitiallyLoaded,
      isChatOpen,
      isChatVisible,
      shouldRun:
        messages.length > 0 &&
        !hasInitiallyLoaded &&
        (isChatOpen || isChatVisible),
    });

    if (
      messages.length > 0 &&
      !hasInitiallyLoaded &&
      (isChatOpen || isChatVisible)
    ) {
      console.log("🚀 First time loading messages - auto-scrolling to bottom");
      setHasInitiallyLoaded(true);

      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        console.log("🚀 Executing first load scroll");
        scrollChatToBottom(true);
      }, 200);
    }
  }, [messages.length, hasInitiallyLoaded, isChatOpen, isChatVisible]);

  // Effect to scroll to bottom when chat opens (only when chat state changes)
  useEffect(() => {
    console.log("🚪 Chat open effect triggered:", {
      isChatOpen,
      isChatVisible,
      messagesLength: messages.length,
      hasInitiallyLoaded,
    });

    // Only auto-scroll when chat is actually opening (not just re-rendering)
    // Check loading states inside the effect to avoid re-triggering
    // Don't run if this is the first load (let the first load effect handle it)
    if (
      (isChatOpen || isChatVisible) &&
      messages.length > 0 &&
      !loadingMore &&
      !isLoadingMore &&
      !shouldPreventAutoScroll &&
      hasInitiallyLoaded // Only run if messages have been initially loaded
    ) {
      console.log("🚪 Chat opened - auto-scrolling to bottom");
      scrollChatToBottom(true);
    } else {
      console.log("🚪 Chat open scroll blocked by conditions:", {
        hasMessages: messages.length > 0,
        loadingMore,
        isLoadingMore,
        shouldPreventAutoScroll,
        hasInitiallyLoaded,
      });
    }
  }, [
    isChatOpen,
    isChatVisible,
    hasInitiallyLoaded,
    // Remove loading states from dependencies to prevent re-triggering
  ]);

  // Process equipment data from API and organize by categories with discount support
  const getEquipmentData = () => {
    if (!equipment || equipment.length === 0) {
      return {};
    }

    // Group equipment by category
    const grouped = equipment.reduce((acc, item) => {
      const category = item.category_name?.toLowerCase() || "other";
      if (!acc[category]) {
        acc[category] = [];
      }

      // Equipment cards show price per month
      const priceDisplay =
        item.base_price !== undefined && item.base_price !== null
          ? `${formatCurrency(item.base_price)}/month`
          : "Contact for pricing";

      // Create discount info object
      const hasDiscount = item.discount_type && item.discount_value;
      const discountInfo = hasDiscount
        ? {
          has_discount: true,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          original_price: item.base_price,
          discounted_price: null, // Will be calculated dynamically
          pricing_package: item.pricing_package,
        }
        : {
          has_discount: false,
          discount_type: null,
          discount_value: null,
          original_price: item.base_price,
          discounted_price: null,
          pricing_package: null,
        };

      // Handle multiple images - get all images and determine main display image
      let allImages = [];
      let mainImage = "/figma-assets/equipment-placeholder.jpg";

      if (
        item.content?.images &&
        Array.isArray(item.content.images) &&
        item.content.images.length > 0
      ) {
        // Use new multiple images structure
        allImages = item.content.images;
        // Get the currently selected image or default to main image
        const selectedImageIndex =
          selectedImages[item.equipment_id || item.id] || 0;
        mainImage =
          allImages[selectedImageIndex]?.image_url ||
          allImages.find((img) => img.is_main == 1)?.image_url ||
          allImages[0]?.image_url ||
          "/figma-assets/equipment-placeholder.jpg";
      } else if (item.content?.image) {
        // Fallback to single image
        mainImage = item.content.image;
        allImages = [
          { image_url: item.content.image, caption: item.equipment_name },
        ];
      }

      acc[category].push({
        id: item.id,
        equipment_id: item.equipment_id,
        name: item.equipment_name,
        status: item.availability === 1 ? "Available" : "Unavailable",
        description:
          item.content?.description || `${item.equipment_name} equipment`,
        banner_description: item.content?.banner_description || null,
        price: priceDisplay,
        base_price: item.base_price,
        custom_base_price: item.custom_base_price,
        discounted_price: item.discounted_price,
        image: mainImage,
        allImages: allImages,
        category: item.category_name,
        company_id: item.company_id,
        // Pass raw discount fields for EquipmentCard logic
        discount: item.discount,
        discount_value: item.discount_value,
        discount_type: item.discount_type,
        compounding_discount: item.compounding_discount,
        compounding_discount_value: item.compounding_discount_value,
        compounding_discount_type: item.compounding_discount_type,
        maintenance_periods: item.maintenance_periods,
        unavailability_due_month: item.unavailability_due_month,
        discount_info: discountInfo, // Renamed from 'discount' to avoid conflict, though EquipmentCard checks types
      });

      return acc;
    }, {});

    return grouped;
  };

  const equipmentData = getEquipmentData();

  console.log(equipmentData);

  const handleLogout = async () => {
    try {
      await clientAuthApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      clientAuthApi.logout();
    }
  };

  // Handle quick view modal
  const handleQuickView = (equipment) => {
    setQuickViewEquipment(equipment);
    setIsQuickViewOpen(true);
    setQuickViewImageIndex(0); // Reset to first image
  };

  // Handle equipment request
  const handleRequestEquipment = async (equipment) => {
    try {
      // Set loading state for this specific equipment
      setRequestLoading((prev) => ({ ...prev, [equipment.id]: true }));

      // Send equipment request via chat
      const response = await chatApi.sendEquipmentRequest({
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        message: `I would like to request for the ${equipment.name} .`,
      });

      if (!response.error) {
        toast.success(
          "Equipment request sent successfully! Check your messages for updates."
        );

        // The equipment request automatically creates a chat message via the API
        // Reload conversations to show the new message
        await loadConversations();
      } else {
        toast.error(
          response.message || "Failed to send request. Please try again."
        );
      }
    } catch (error) {
      console.error("Request equipment error:", error);
      toast.error("Failed to send request. Please try again.");
    } finally {
      // Clear loading state
      setRequestLoading((prev) => ({ ...prev, [equipment.id]: false }));
    }
  };

  // Get minimum duration for selected equipment
  const getMinimumDuration = () => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );
    if (!selectedEquipmentData?.minimum_duration) {
      return 1; // Default to 1 month
    }

    // Extract number from "4 Months" format
    const match = selectedEquipmentData.minimum_duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  };

  // Get available durations from minimum to 12 months
  const getAvailableDurations = () => {
    const minDuration = getMinimumDuration();
    const durations = [];

    for (let i = minDuration; i <= 12; i++) {
      durations.push(`${i} month${i > 1 ? "s" : ""}`);
    }

    return durations;
  };

  // Removed custom slider functions - now using native range input

  // Get selected duration in months
  const getSelectedDurationMonths = () => {
    const match = selectedDuration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  };

  // Calculate duration-adjusted base price
  const getDurationAdjustedBasePrice = () => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );

    if (!selectedEquipmentData?.base_price) return 0;

    const basePrice = selectedEquipmentData.base_price;
    const minDuration = getMinimumDuration();
    const selectedDurationMonths = getSelectedDurationMonths();

    // Base price is for minimum duration, scale proportionally
    const multiplier = selectedDurationMonths / minDuration;
    return basePrice * multiplier;
  };

  // Memoized equipment discount calculation
  const equipmentDiscount = useMemo(() => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );

    if (!selectedEquipmentData) return 0;

    const basePrice = selectedEquipmentData.custom_base_price || selectedEquipmentData.base_price || 0;
    const discountValue = selectedEquipmentData.discount_value || selectedEquipmentData.discount || 0;
    const discountType = selectedEquipmentData.discount_type;
    const compoundingValue = selectedEquipmentData.compounding_discount_value || selectedEquipmentData.compounding_discount || 0;
    const compoundingType = selectedEquipmentData.compounding_discount_type;
    const selectedDurationMonths = getSelectedDurationMonths();

    const result = calculateMonthlyPrices(
      basePrice,
      discountValue,
      discountType,
      compoundingValue,
      compoundingType,
      selectedDurationMonths
    );

    const finalResult = result[result.length - 1];
    const undiscountedTotal = basePrice * selectedDurationMonths;
    return parseFloat((undiscountedTotal - finalResult.cumulativeTotal).toFixed(2));
  }, [equipment, selectedEquipment, selectedDuration]);


  // Memoized final price calculation
  const finalPrice = useMemo(() => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );

    if (!selectedEquipmentData) return 0;

    const basePrice = selectedEquipmentData.custom_base_price || selectedEquipmentData.base_price || 0;
    const discountValue = selectedEquipmentData.discount_value || selectedEquipmentData.discount || 0;
    const discountType = selectedEquipmentData.discount_type;
    const compoundingValue = selectedEquipmentData.compounding_discount_value || selectedEquipmentData.compounding_discount || 0;
    const compoundingType = selectedEquipmentData.compounding_discount_type;
    const selectedDurationMonths = getSelectedDurationMonths();

    const result = calculateMonthlyPrices(
      basePrice,
      discountValue,
      discountType,
      compoundingValue,
      compoundingType,
      selectedDurationMonths
    );

    const finalResult = result[result.length - 1];
    return parseFloat(finalResult.cumulativeTotal.toFixed(2));
  }, [equipment, selectedEquipment, selectedDuration]);


  // Memoized discount percentage calculation
  const discountPercentage = useMemo(() => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );

    if (!selectedEquipmentData) return 0;

    const basePrice = selectedEquipmentData.custom_base_price || selectedEquipmentData.base_price || 0;
    const selectedDurationMonths = getSelectedDurationMonths();
    const undiscountedTotal = basePrice * selectedDurationMonths;

    if (undiscountedTotal === 0) return 0;

    return parseFloat(((undiscountedTotal - finalPrice) / undiscountedTotal * 100).toFixed(2));
  }, [equipment, selectedEquipment, selectedDuration, finalPrice]);


  // Handle image selection for equipment
  const handleImageSelect = (equipmentId, imageIndex) => {
    setSelectedImages((prev) => ({
      ...prev,
      [equipmentId]: imageIndex,
    }));
  };

  // Get the current main image for an equipment item
  const getMainImageSrc = useCallback(
    (equipment) => {
      if (equipment?.allImages && equipment.allImages.length > 0) {
        const selectedIndex = selectedImages[equipment.id];

        // If there's a selected image, use it
        if (selectedIndex !== undefined && selectedIndex >= 0) {
          return (
            equipment.allImages[selectedIndex]?.image_url ||
            equipment.image ||
            "/images/graphview.png"
          );
        }

        // Otherwise, find and use the main image (is_main: 1)
        const mainImage = equipment.allImages.find((img) => img.is_main === 1);
        if (mainImage) {
          return mainImage.image_url;
        }

        // Fallback to first image, then equipment.image, then placeholder
        return (
          equipment.allImages[0]?.image_url ||
          equipment.image ||
          "/images/graphview.png"
        );
      }
      return equipment?.image || "/images/graphview.png";
    },
    [selectedImages]
  );

  // Get monthly breakdown for compounding discount
  const getMonthlyBreakdown = () => {
    const selectedEquipmentData = equipment.find(
      (item) => item.equipment_name === selectedEquipment
    );

    if (!selectedEquipmentData) return [];

    const basePrice = selectedEquipmentData.custom_base_price || selectedEquipmentData.base_price || 0;
    const discountValue = selectedEquipmentData.discount_value || selectedEquipmentData.discount || 0;
    const discountType = selectedEquipmentData.discount_type;
    const compoundingValue = selectedEquipmentData.compounding_discount_value || selectedEquipmentData.compounding_discount || 0;
    const compoundingType = selectedEquipmentData.compounding_discount_type;
    const selectedDurationMonths = getSelectedDurationMonths();

    const result = calculateMonthlyPrices(
      basePrice,
      discountValue,
      discountType,
      compoundingValue,
      compoundingType,
      selectedDurationMonths
    );

    return result.map((item, index) => ({
      month: item.month,
      price: parseFloat(item.price.toFixed(2)),
      discount: parseFloat((basePrice - item.price).toFixed(2))
    }));
  };

  // Process selected file
  const processFile = (file: File) => {
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
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

  // Handle file selection
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
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
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

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || sendingMessage) {
      return; // Prevent sending if already sending or no message/file/conversation
    }

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
          toast.error("Failed to upload file. Please try again.");
          setUploadingFile(false);
          setSendingMessage(false);
          return;
        } finally {
          setUploadingFile(false);
        }
      }

      // Get the admin user ID from the conversation
      const conversation = conversations?.[0];
      const currentUserId = getCurrentUserId();
      const adminUserId =
        parseInt(conversation?.user1_id) === currentUserId
          ? conversation?.user2_id
          : 2;

      const success = await sendMessage(
        adminUserId,
        messageText.trim() ||
        (selectedFile ? `Sent a file: ${selectedFile.name}` : ""),
        attachmentData
      );

      if (success) {
        console.log(
          "📤 Message sent successfully - setting justSentMessage flag"
        );
        setMessageText("");
        setSelectedFile(null);
        setFilePreview(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setJustSentMessage(true); // Set flag to trigger auto-scroll
      } else {
        console.log("❌ Failed to send message");
        toast.error("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Available":
        return "bg-[rgba(34,197,94,0.2)] text-[#22C55E]";
      case "Limited":
        return "bg-[rgba(245,158,11,0.2)] text-[#F59E0B]";
      case "Booked":
      case "Unavailable":
        return "bg-[rgba(239,68,68,0.2)] text-[#EF4444]";
      default:
        return "bg-[rgba(156,163,175,0.2)] text-[#9CA3AF]";
    }
  };

  const getButtonClass = (status) => {
    if (status === "Booked" || status === "Unavailable") {
      return "bg-[#6B7280] text-[#D1D5DB] cursor-not-allowed";
    }
    return "bg-[#FDCE06] text-[#000000] hover:bg-[#E5B800]";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#292A2B] flex items-center justify-center">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <div className="text-[#E5E5E5] font-[Inter] mt-4">
            Loading your equipment...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#292A2B] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 font-[Inter] mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#FDCE06] text-[#000000] px-4 py-2 rounded-md font-bold hover:bg-[#E5B800] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#292A2B] font-[Inter]">
      {/* Header */}
      <header className="bg-[#1F1F20] border-b border-[#333333] px-4 sm:px-8 lg:px-5 py-2">
        <div className="flex items-center justify-between  mx-auto">
          <div className="flex items-center">
            <img
              src={companyLogo || "/login-logo.png"}
              alt="Company Logo"
              className="h-[100px] sm:h-[100px] mr-4 sm:mr-6"
            />
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
              <span className="text-[#9CA3AF] text-xs sm:text-sm hidden sm:block">
                Welcome, {user?.name}
              </span>
              <button
                onClick={() => navigate("/client/profile")}
                className="text-[#E5E5E5] text-xs sm:text-sm hover:text-[#FDCE06] transition-colors"
              >
                Profile
              </button>
              <span className="text-[#9CA3AF] text-xs sm:text-sm">|</span>
              <button
                onClick={handleLogout}
                className="text-[#E5E5E5] text-xs sm:text-sm hover:text-[#FDCE06] transition-colors"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-8 lg:px-20 pb-[100px] py-6 lg:py-8 lg:max-w-[866px] xl:max-w-full">
          <div className="max-w-full lg:max-w-[810px]">
            {/* Header Ad Ticker */}
            <Ticker text={companySettings.header_ad_text ? (companySettings.header_ad_text || "").replace(/<[^>]*>/g, "") : "🔥 Special of the Month — 10% off all excavator hire this June. Contact us today to lock in your rate!"} />

            {/* Category Filter */}
            {allCategories.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-[#9CA3AF] text-sm font-medium">
                    Filter by Category:
                  </span>
                  <CategoryFilter
                    categories={allCategories}
                    selectedCategories={selectedCategories}
                    onCategoryChange={handleCategoryChange}
                  />
                </div>
              </div>
            )}

            {/* Dynamic Equipment Sections */}
            {Object.keys(equipmentData).length === 0 ? (
              <section className="mb-12 lg:mb-16">
                <div className="text-center py-12">
                  <div className="text-[#9CA3AF] text-lg mb-4">
                    No equipment assigned to your account
                  </div>
                  <div className="text-[#9CA3AF] text-sm">
                    Please contact your administrator to assign equipment to
                    your account.
                  </div>
                </div>
              </section>
            ) : (
              Object.entries(equipmentData).map(([category, items]) => (
                <section key={category} className="mb-12 lg:mb-16">
                  <h2 className="text-[#D1D5DB] text-xl sm:text-2xl font-semibold mb-8 lg:mb-12 capitalize">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 justify-items-center sm:justify-items-[unset] sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {items.map((equipment) => (
                      <EquipmentCard
                        key={equipment.id}
                        equipment={equipment}
                        onQuickView={() => handleQuickView(equipment)}
                        onRequest={handleRequestEquipment}
                        requestLoading={requestLoading[equipment.id] || false}
                        selectedImageIndex={selectedImages[equipment.id] || 0}
                        onImageSelect={handleImageSelect}
                        formatCurrency={formatCurrency}
                        handleImageLoad={handleImageLoad}
                        imageObjectFit={imageObjectFit}
                        userRole={getUserRole()}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-[389px] pb-[100px] p-4 sm:p-6 lg:p-8 lg:pt-[38px] order-first lg:order-last">
          <div className="space-y-6 lg:space-y-8 lg:flex lg:flex-col lg:justify-between h-full">
            {/* Sticky Note */}
            <div
              className={`w-full lg:w-[378px] lg:fixed ${scrollTop > 150
                ? "lg:top-[20px] right-4"
                : "lg:top-[150px] right-4"
                } transition-all duration-300 ease-in-out`}
            >
              <div className="bg-[#FDE047] border-2 border-[#EAB308] rounded-lg p-6 relative shadow-lg">
                {/* Red comment label */}
                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs px-3 py-1 rounded shadow-md font-semibold">
                  comment
                </div>
                {/* Sticky note content with handwritten font */}
                {(() => {
                  const raw = companySettings.sticky_ad_text || "";
                  const text = raw.replace(/^<!--fontsize:\d+-->/, "");
                  const len = text.replace(/<[^>]*>/g, "").length;
                  const fontSize = len < 30 ? 42 : len < 60 ? 34 : len < 120 ? 26 : len < 200 ? 20 : 16;
                  return (
                    <div
                      className="text-[#000000] leading-relaxed w-full h-full"
                      style={{
                        fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Bradley Hand', cursive",
                        fontWeight: 400,
                        letterSpacing: "0.5px",
                        fontSize: `${fontSize}px`,
                        lineHeight: `${Math.round(fontSize * 1.5)}px`,
                        transform: "rotate(-0.5deg)",
                      }}
                      dangerouslySetInnerHTML={{ __html: text }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Chat Section (disabled in sidebar for desktop; replaced with floating popup) */}
            <div className="hidden">
              {isChatVisible ? (
                <>
                  <div className="hidden lg:block bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden relative">
                    {/* Show Chat Button when chat is hidden */}

                    <div className="bg-[#1F1F20] border-b border-[#333333] px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[#FFFFFF] text-base font-semibold">
                          Message Rental Company
                        </h3>
                        {/* Admin status removed from client view */}
                      </div>
                      <button
                        onClick={() => setIsChatVisible(false)}
                        className="text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors p-1"
                        title="Hide chat"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M15 5L5 15M5 5L15 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4 space-y-4 h-[400px] overflow-y-auto">
                      {/* Load More Button */}
                      {hasMoreMessages && (
                        <div className="flex justify-center mb-4">
                          <button
                            onClick={async () => {
                              console.log(
                                "🔄 Load More button clicked (mobile)"
                              );
                              if (conversations.length > 0) {
                                console.log(
                                  "🔄 Setting loading states to prevent auto-scroll"
                                );
                                setIsLoadingMore(true);
                                setShouldPreventAutoScroll(true);
                                try {
                                  await loadMoreMessages(conversations?.[0].id);
                                  console.log("🔄 Load More completed");
                                } finally {
                                  // Reset after a longer delay to prevent auto-scroll from polling
                                  setTimeout(() => {
                                    console.log(
                                      "🔄 Resetting loading states after 2 seconds"
                                    );
                                    setIsLoadingMore(false);
                                    setShouldPreventAutoScroll(false);
                                  }, 2000);
                                }
                              }
                            }}
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

                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[#9CA3AF]">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      ) : (
                        Object.entries(messageGroups).map(
                          ([date, dateMessages]) => (
                            <div key={date}>
                              {/* Date Header */}
                              <div className="flex justify-center my-4">
                                <div className="bg-[#333333] text-[#9CA3AF] text-xs px-3 py-1 rounded-full">
                                  {new Date(date).toLocaleDateString([], {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </div>
                              </div>

                              {/* Messages for this date */}
                              {dateMessages.map((message) => {
                                const messageUserId = parseInt(
                                  message.from_user_id || "0"
                                );
                                const currentUserId = getCurrentUserId();
                                const isCurrentUser =
                                  messageUserId === currentUserId &&
                                  messageUserId > 0;
                                const isEquipmentRequest =
                                  message.message_type === "equipment_request";

                                return (
                                  <div
                                    key={message.id}
                                    className={`flex ${isCurrentUser
                                      ? "justify-end"
                                      : "justify-start"
                                      }`}
                                  >
                                    <div
                                      className={`max-w-[280px] mb-5 rounded-lg p-3 ${isEquipmentRequest
                                        ? "bg-[#FDCE06] text-[#000000] border-2 border-[#E5B800]"
                                        : isCurrentUser
                                          ? "bg-[#FDCE06] text-[#000000]"
                                          : "bg-[#292A2B] text-[#E5E5E5]"
                                        }`}
                                    >
                                      {isEquipmentRequest && (
                                        <div className="mb-2">
                                          <span className="text-xs font-bold bg-[#000000] text-[#FDCE06] px-2 py-1 rounded">
                                            Equipment Request
                                          </span>
                                        </div>
                                      )}
                                      <p className="text-sm">
                                        {message.message}
                                      </p>
                                      {message.equipment_name && (
                                        <div className="mt-2 text-xs opacity-80">
                                          Equipment: {message.equipment_name}
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs opacity-70">
                                          {new Date(
                                            message.created_at
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                        {/* Read Receipt */}
                                        {isCurrentUser && (
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
                          )
                        )
                      )}
                      {/* Scroll anchor for desktop chat */}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="border-t border-[#333333] p-4">
                      <div className="flex items-center bg-[#2A2A2B] border border-[#444444] rounded-lg px-4 py-2">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type your message... "
                          className="flex-1 bg-transparent text-[#ADAEBC] text-sm sm:text-base placeholder-[#ADAEBC] placeholder:text-xs outline-none resize-none min-h-[32px] max-h-[100px] overflow-y-auto"
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: "#444444 transparent",
                          }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !messageText.trim()}
                          className="ml-2 bg-[#FDCE06] rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M2 14L14 8L2 2L2 6L10 8L2 10L2 14Z"
                                fill="#000000"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="fixed bottom-4 right-4 lg:block hidden z-50">
                  <button
                    onClick={() => setIsChatVisible(!isChatVisible)}
                    className="bg-[#FDCE06] hover:bg-[#E5B800] rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-lg transition-colors"
                  >
                    <svg
                      width="20"
                      height="19"
                      viewBox="0 0 20 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20.0002 8.875C20.0002 13.3633 15.5236 17 10.0002 17C8.55096 17 7.17596 16.75 5.93377 16.3008C5.46893 16.6406 4.71112 17.1055 3.81268 17.4961C2.87518 17.9023 1.74628 18.25 0.625182 18.25C0.371276 18.25 0.144713 18.0977 0.0470568 17.8633C-0.0505994 17.6289 0.00408808 17.3633 0.179869 17.1836L0.191588 17.1719C0.203307 17.1602 0.218932 17.1445 0.242369 17.1172C0.285338 17.0703 0.351744 16.9961 0.433776 16.8945C0.593932 16.6992 0.808776 16.4102 1.02753 16.0508C1.41815 15.4023 1.78924 14.5508 1.86346 13.5938C0.691588 12.2656 0.00018184 10.6367 0.00018184 8.875C0.00018184 4.38672 4.47674 0.75 10.0002 0.75C15.5236 0.75 20.0002 4.38672 20.0002 8.875Z"
                        fill="black"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Chat Button - Only visible on mobile/tablet */}
      {!isChatOpen && (
        <div className="fixed bottom-4 right-4 lg:hidden z-50">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-[#FDCE06] hover:bg-[#E5B800] rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-lg transition-colors relative"
          >
            <svg
              width="20"
              height="19"
              viewBox="0 0 20 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.0002 8.875C20.0002 13.3633 15.5236 17 10.0002 17C8.55096 17 7.17596 16.75 5.93377 16.3008C5.46893 16.6406 4.71112 17.1055 3.81268 17.4961C2.87518 17.9023 1.74628 18.25 0.625182 18.25C0.371276 18.25 0.144713 18.0977 0.0470568 17.8633C-0.0505994 17.6289 0.00408808 17.3633 0.179869 17.1836L0.191588 17.1719C0.203307 17.1602 0.218932 17.1445 0.242369 17.1172C0.285338 17.0703 0.351744 16.9961 0.433776 16.8945C0.593932 16.6992 0.808776 16.4102 1.02753 16.0508C1.41815 15.4023 1.78924 14.5508 1.86346 13.5938C0.691588 12.2656 0.00018184 10.6367 0.00018184 8.875C0.00018184 4.38672 4.47674 0.75 10.0002 0.75C15.5236 0.75 20.0002 4.38672 20.0002 8.875Z"
                fill="black"
              />
            </svg>

            {/* Notification Badge */}
            {unreadMessageCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold animate-pulse">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Floating Chat Button - Desktop */}
      {!isChatOpen && (
        <div className="hidden lg:block fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-[#FDCE06] hover:bg-[#E5B800] rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors relative"
            title="Open chat"
          >
            <svg
              width="20"
              height="19"
              viewBox="0 0 20 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.0002 8.875C20.0002 13.3633 15.5236 17 10.0002 17C8.55096 17 7.17596 16.75 5.93377 16.3008C5.46893 16.6406 4.71112 17.1055 3.81268 17.4961C2.87518 17.9023 1.74628 18.25 0.625182 18.25C0.371276 18.25 0.144713 18.0977 0.0470568 17.8633C-0.0505994 17.6289 0.00408808 17.3633 0.179869 17.1836L0.191588 17.1719C0.203307 17.1602 0.218932 17.1445 0.242369 17.1172C0.285338 17.0703 0.351744 16.9961 0.433776 16.8945C0.593932 16.6992 0.808776 16.4102 1.02753 16.0508C1.41815 15.4023 1.78924 14.5508 1.86346 13.5938C0.691588 12.2656 0.00018184 10.6367 0.00018184 8.875C0.00018184 4.38672 4.47674 0.75 10.0002 0.75C15.5236 0.75 20.0002 4.38672 20.0002 8.875Z"
                fill="black"
              />
            </svg>

            {/* Notification Badge */}
            {unreadMessageCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Mobile Chat Popup */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
          <div className="fixed bottom-0 left-0 right-0 bg-[#1F1F20] border-t border-[#333333] rounded-t-lg max-h-[80vh] flex flex-col">
            <div className="bg-[#1F1F20] border-b border-[#333333] px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-[#FFFFFF] text-base font-semibold">
                  Message Rental Company
                </h3>
                {/* Admin status removed from client view */}
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div
              ref={messagesContainerRef}
              className="p-4 space-y-4 flex-1 overflow-y-auto scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#9CA3AF]">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    {/* Date Header */}
                    <div className="flex justify-center my-4">
                      <div className="bg-[#333333] text-[#9CA3AF] text-xs px-3 py-1 rounded-full">
                        {new Date(date).toLocaleDateString([], {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message) => {
                      const messageUserId = parseInt(
                        message.from_user_id || "0"
                      );
                      const currentUserId = getCurrentUserId();
                      const isCurrentUser =
                        messageUserId === currentUserId && messageUserId > 0;
                      const isEquipmentRequest =
                        message.message_type === "equipment_request";

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"
                            }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${isEquipmentRequest
                              ? "bg-[#FDCE06] text-[#000000] border-2 border-[#E5B800]"
                              : isCurrentUser
                                ? "bg-[#FDCE06] text-[#000000]"
                                : "bg-[#292A2B] text-[#E5E5E5]"
                              }`}
                          >
                            {isEquipmentRequest && (
                              <div className="mb-2">
                                <span className="text-xs font-bold bg-[#000000] text-[#FDCE06] px-2 py-1 rounded">
                                  Equipment Request
                                </span>
                              </div>
                            )}
                            {/* Message Text - hide default file message if attachment exists */}
                            {message.message &&
                              !(
                                message.attachment_url &&
                                message.message.startsWith("Sent a file:")
                              ) && <p className="text-sm">{message.message}</p>}
                            {/* File Attachment Display */}
                            {message.attachment_url && (
                              <div className="mt-2">
                                {message.attachment_type === "image" ? (
                                  <img
                                    src={message.attachment_url}
                                    alt={message.attachment_name || "Image"}
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{
                                      maxHeight: "200px",
                                      maxWidth: "250px",
                                    }}
                                    onClick={() =>
                                      window.open(
                                        message.attachment_url,
                                        "_blank"
                                      )
                                    }
                                  />
                                ) : (
                                  <a
                                    href={message.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-[#333333] rounded-lg hover:bg-[#404040] transition-colors max-w-[250px]"
                                  >
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="flex-shrink-0"
                                    >
                                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                      <polyline points="13 2 13 9 20 9" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {message.attachment_name ||
                                          "Download File"}
                                      </p>
                                      {message.attachment_size && (
                                        <p className="text-xs opacity-70">
                                          {(
                                            message.attachment_size / 1024
                                          ).toFixed(2)}{" "}
                                          KB
                                        </p>
                                      )}
                                    </div>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
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
                            {message.equipment_name && (
                              <div className="mt-2 text-xs opacity-80">
                                Equipment: {message.equipment_name}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs opacity-70">
                                {parseDate(message.created_at).toLocaleString(
                                  [],
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                              {message.read_at && (
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
              {/* Scroll anchor for mobile chat */}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[#333333] p-4">
              <div className="flex items-start bg-[#2A2A2B] border border-[#444444] rounded-lg px-4 py-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message... "
                  className="flex-1 bg-transparent text-[#ADAEBC] text-sm placeholder-[#ADAEBC] outline-none placeholder:text-xs resize-none min-h-[32px] max-h-[100px] overflow-y-auto"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#444444 transparent",
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="ml-2 bg-[#FDCE06] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 14L14 8L2 2L2 6L10 8L2 10L2 14Z"
                        fill="#000000"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Chat Popup */}
      {isChatOpen && (
        <div className="hidden lg:block fixed bottom-4 right-4 z-50">
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-[380px] h-[520px] flex flex-col shadow-2xl">
            <div className="bg-[#1F1F20] border-b border-[#333333] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-[#FFFFFF] text-base font-semibold">
                  Message Rental Company
                </h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors"
                title="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div
              className="p-4 space-y-4 flex-1 overflow-y-auto"
              ref={messagesContainerRef}
            >
              {hasMoreMessages && conversations.length > 0 && (
                <div className="flex justify-center mb-2">
                  <button
                    onClick={async () => {
                      console.log("🔄 Load More button clicked (desktop)");
                      if (conversations.length > 0) {
                        console.log(
                          "🔄 Setting loading states to prevent auto-scroll"
                        );
                        setIsLoadingMore(true);
                        setShouldPreventAutoScroll(true);
                        try {
                          await loadMoreMessages(conversations[0].id);
                          console.log("🔄 Load More completed");
                        } finally {
                          // Reset after a longer delay to prevent auto-scroll from polling
                          setTimeout(() => {
                            console.log(
                              "🔄 Resetting loading states after 2 seconds"
                            );
                            setIsLoadingMore(false);
                            setShouldPreventAutoScroll(false);
                          }, 2000);
                        }
                      }
                    }}
                    disabled={loadingMore}
                    className="bg-[#333333] text-[#E5E5E5] px-3 py-1 rounded-md hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#9CA3AF]">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    {/* Date Header */}
                    <div className="flex justify-center my-2">
                      <div className="bg-[#333333] text-[#9CA3AF] text-[10px] px-2 py-1 rounded-full">
                        {new Date(date).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message) => {
                      const messageUserId = parseInt(
                        message.from_user_id || "0"
                      );
                      const currentUserId = getCurrentUserId();
                      const isCurrentUser =
                        messageUserId === currentUserId && messageUserId > 0;
                      const isEquipmentRequest =
                        message.message_type === "equipment_request";

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg mt-4 p-3 ${isEquipmentRequest
                              ? "bg-[#FDCE06] text-[#000000] border-2 border-[#E5B800]"
                              : isCurrentUser
                                ? "bg-[#FDCE06] text-[#000000]"
                                : "bg-[#292A2B] text-[#E5E5E5]"
                              }`}
                          >
                            {isEquipmentRequest && (
                              <div className="mb-1">
                                <span className="text-[10px] font-bold bg-[#000000] text-[#FDCE06] px-2 py-0.5 rounded">
                                  Equipment Request
                                </span>
                              </div>
                            )}
                            {/* Message Text - hide default file message if attachment exists */}
                            {message.message &&
                              !(
                                message.attachment_url &&
                                message.message.startsWith("Sent a file:")
                              ) && <p className="text-sm">{message.message}</p>}
                            {/* File Attachment Display */}
                            {message.attachment_url && (
                              <div className="mt-2">
                                {message.attachment_type === "image" ? (
                                  <img
                                    src={message.attachment_url}
                                    alt={message.attachment_name || "Image"}
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{
                                      maxHeight: "200px",
                                      maxWidth: "250px",
                                    }}
                                    onClick={() =>
                                      window.open(
                                        message.attachment_url,
                                        "_blank"
                                      )
                                    }
                                  />
                                ) : (
                                  <a
                                    href={message.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-[#333333] rounded-lg hover:bg-[#404040] transition-colors max-w-[250px]"
                                  >
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="flex-shrink-0"
                                    >
                                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                      <polyline points="13 2 13 9 20 9" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {message.attachment_name ||
                                          "Download File"}
                                      </p>
                                      {message.attachment_size && (
                                        <p className="text-xs opacity-70">
                                          {(
                                            message.attachment_size / 1024
                                          ).toFixed(2)}{" "}
                                          KB
                                        </p>
                                      )}
                                    </div>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
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
                            {message.equipment_name && (
                              <div className="mt-1 text-[10px] opacity-80">
                                Equipment: {message.equipment_name}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] opacity-70">
                                {new Date(
                                  message.created_at
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {message.read_at && (
                                <div className="flex items-center gap-1">
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-blue-500"
                                  >
                                    <polyline points="20,6 9,17 4,12" />
                                  </svg>
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
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[#333333] p-3">
              {/* File Preview */}
              {selectedFile && (
                <div className="mb-3 p-3 bg-[#292A2B] rounded-lg border border-[#333333]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#333333] rounded flex items-center justify-center">
                          <svg
                            width="20"
                            height="20"
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
                        <p className="text-[#E5E5E5] text-sm font-medium truncate max-w-[200px]">
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
                      className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
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
                </div>
              )}

              <div
                ref={dropZoneRef}
                className={`flex items-center bg-[#2A2A2B] border border-[#444444] rounded-lg px-3 py-2 relative ${isDragging ? "border-[#FDCE06] border-2 border-dashed" : ""
                  }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-[#2A2A2B] bg-opacity-95 border-2 border-dashed border-[#FDCE06] rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="mx-auto mb-2 text-[#FDCE06]"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <p className="text-[#FDCE06] font-medium text-lg">
                        Drop file here to upload
                      </p>
                      <p className="text-[#9CA3AF] text-sm mt-1">
                        Max file size: 50MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
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
                  className="mr-2 text-[#9CA3AF] hover:text-[#FDCE06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  {uploadingFile ? (
                    <ClipLoader size={16} color="#FDCE06" />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  )}
                </button>

                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message... "
                  className="flex-1 bg-transparent text-[#ADAEBC] text-sm placeholder-[#ADAEBC] outline-none placeholder:text-xs resize-none min-h-[32px] max-h-[100px] overflow-y-auto"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#444444 transparent",
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    sendingMessage ||
                    uploadingFile ||
                    (!messageText.trim() && !selectedFile)
                  }
                  className="ml-2 bg-[#FDCE06] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage || uploadingFile ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 14L14 8L2 2L2 6L10 8L2 10L2 14Z"
                        fill="#000000"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Toast notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        equipment={quickViewEquipment}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

export default ClientDashboard;
