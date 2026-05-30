// @ts-nocheck
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

/**
 * PrivateRoute component for protecting routes that require authentication
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @returns {React.ReactNode} - Protected route component
 */
function PrivateRoute({ children, allowedRoles = [] }) {
  // Check if user is authenticated
  const token = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    // Show message when redirecting due to missing authentication
    if (!token) {
      toast.error("Please login to access the admin portal.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      toast.error("You don't have permission to access this area.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [token, userRole, allowedRoles]);

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check user role
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // User doesn't have required role, redirect to login or unauthorized page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and has required role, render children
  return children;
}

export default PrivateRoute;
