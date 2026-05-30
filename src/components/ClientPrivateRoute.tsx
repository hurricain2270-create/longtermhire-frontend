import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { clientAuthApi } from "../services/clientAuthApi";
import { toast } from "react-toastify";

/**
 * ClientPrivateRoute component for protecting client routes that require authentication
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactNode} - Protected route component
 */
function ClientPrivateRoute({ children }) {
  // Check if client is authenticated
  const isAuthenticated = clientAuthApi.isAuthenticated();
  const clientInfo = clientAuthApi.getClientInfo();

  useEffect(() => {
    // Show message when redirecting due to missing authentication
    if (!isAuthenticated) {
      toast.error("Please login to access the client portal.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else if (clientInfo.role && clientInfo.role !== "member") {
      toast.error("You don't have permission to access the client portal.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [isAuthenticated, clientInfo.role]);

  // If no token, redirect to client login
  if (!isAuthenticated) {
    return <Navigate to="/client/login" replace />;
  }

  // Check if user has member role (clients use member role)
  if (clientInfo.role && clientInfo.role !== "member") {
    // User doesn't have required role, redirect to client login
    return <Navigate to="/client/login" replace />;
  }

  // Client is authenticated and has required role, render children
  return children;
}

export default ClientPrivateRoute;
