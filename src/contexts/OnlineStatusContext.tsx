import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { chatApi } from "../services/chatApi";

interface OnlineStatusContextType {
  adminOnline: boolean;
  adminStatus: {
    has_online_admin: boolean;
    online_admin_count: number;
    total_admin_count: number;
  };
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(
  undefined
);

export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error(
      "useOnlineStatus must be used within an OnlineStatusProvider"
    );
  }
  return context;
};

interface OnlineStatusProviderProps {
  children: React.ReactNode;
}

export const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({
  children,
}) => {
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminStatus, setAdminStatus] = useState({
    has_online_admin: false,
    online_admin_count: 0,
    total_admin_count: 0,
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Set online once on mount
    chatApi.setOnline().catch(console.error);

    // Check admin status once
    chatApi
      .getAdminStatus()
      .then((response) => {
        if (!response.error) {
          setAdminStatus(response.data);
          setAdminOnline(response.data.has_online_admin);
        }
      })
      .catch(console.error);

    // Handle tab close, browser close, logout
    const handleBeforeUnload = (event) => {
      // Use synchronous XMLHttpRequest for beforeunload
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        "https://baas.mytechpassport.com/v1/api/longtermhire/chat/offline",
        false
      ); // synchronous
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${localStorage.getItem("authToken")}`
      );
      xhr.send();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup event listener only
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const value = useMemo<OnlineStatusContextType>(
    () => ({
      adminOnline,
      adminStatus,
    }),
    [adminOnline, adminStatus]
  );

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
};
