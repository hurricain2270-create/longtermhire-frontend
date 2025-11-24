// @ts-nocheck
import axios from "axios";
import { toast } from "react-toastify";

// Base API configuration
const API_BASE_URL = "https://baas.mytechpassport.com"; // Adjust this to your backend URL
//  "https://api.longtermhire.com"
// Global state to track session expiration modal
let sessionExpiredModalShown = false;
let sessionExpiredTimeout = null;

// Function to show session expired modal
const showSessionExpiredModal = (portalType) => {
  if (sessionExpiredModalShown) return; // Prevent multiple modals

  sessionExpiredModalShown = true;

  // Create modal element
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]";
  modal.innerHTML = `
    <div class="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 max-w-md mx-4 text-center">
      <div class="mb-4">
        <svg class="w-12 h-12 text-[#FDCE06] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <h3 class="text-[#E5E5E5] font-bold text-lg mb-2">Session Expired</h3>
        <p class="text-[#9CA3AF] text-sm">Your ${portalType} session has expired. You will be redirected to login.</p>
      </div>
      <div class="flex justify-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FDCE06]"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Clear session data
  if (portalType === "client") {
    localStorage.removeItem("clientAuthToken");
    localStorage.removeItem("clientRole");
    localStorage.removeItem("clientUserId");
    localStorage.removeItem("clientEmail");
    localStorage.removeItem("clientProfile");
  } else {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
  }

  // Redirect after delay
  sessionExpiredTimeout = setTimeout(() => {
    const redirectUrl = portalType === "client" ? "/client/login" : "/login";
    window.location.href = redirectUrl;
  }, 2000);
};

// Function to determine portal type based on current page route
const determinePortalType = (config) => {
  // Primary method: check current page route
  const currentPath = window.location.pathname;

  // Client URLs have /client/ prefix
  if (currentPath.startsWith("/client/")) {
    return "client";
  }

  // Admin URLs are normal routes (no admin prefix)
  // This includes: /, /login, /dashboard, /equipment, etc.
  return "admin";
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests with improved context detection
api.interceptors.request.use(
  (config) => {
    const portalType = determinePortalType(config);

    if (portalType === "client") {
      const clientToken = localStorage.getItem("clientAuthToken");
      if (clientToken) {
        config.headers.Authorization = `Bearer ${clientToken}`;
      }
    } else {
      const adminToken = localStorage.getItem("authToken");
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors with modal-based session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only handle session expiration if it's not a login attempt
      const isLoginRequest = error.config?.url?.includes("/login");
      if (!isLoginRequest && !sessionExpiredModalShown) {
        const portalType = determinePortalType(error.config);
        showSessionExpiredModal(portalType);
      }
    } else if (error.response?.status === 403) {
      // Handle forbidden access with toast (less critical)
      if (!sessionExpiredModalShown) {
        toast.error("You don't have permission to access this resource.", {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to clear all authentication state
export const clearAllAuthState = () => {
  // Clear admin tokens
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");

  // Clear client tokens
  localStorage.removeItem("clientAuthToken");
  localStorage.removeItem("clientRole");
  localStorage.removeItem("clientUserId");
  localStorage.removeItem("clientEmail");
  localStorage.removeItem("clientProfile");

  // Clear any other potential auth-related items
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  console.log("All authentication state cleared");
};

// Utility function to check current authentication context
export const getAuthContext = () => {
  const adminToken = localStorage.getItem("authToken");
  const clientToken = localStorage.getItem("clientAuthToken");

  if (adminToken && clientToken) {
    console.warn(
      "Warning: Both admin and client tokens found. This may cause conflicts."
    );
    return "conflict";
  } else if (adminToken) {
    return "admin";
  } else if (clientToken) {
    return "client";
  } else {
    return "none";
  }
};

// Utility function to reset session expired state (useful for testing)
export const resetSessionExpiredState = () => {
  sessionExpiredModalShown = false;
  if (sessionExpiredTimeout) {
    clearTimeout(sessionExpiredTimeout);
    sessionExpiredTimeout = null;
  }
};

export default api;
