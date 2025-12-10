import api from "./api";

export const clientAuthApi = {
  // Client Login
  login: async (email, password) => {
    try {
      const response = await api.post("/v1/api/longtermhire/client/login", {
        email,
        password,
      });

      if (response.data && !response.data.error) {
        // Clear any existing admin tokens before setting client tokens
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");

        // Store client token and info
        localStorage.setItem("clientAuthToken", response.data.access_token);
        localStorage.setItem("clientRole", response.data.role || "member");
        localStorage.setItem("clientUserId", response.data.user_id);
        localStorage.setItem("clientEmail", response.data.email);

        if (response.data.client_profile) {
          localStorage.setItem(
            "clientProfile",
            JSON.stringify(response.data.client_profile)
          );
        }

        if (response.data.company_roles) {
          localStorage.setItem(
            "clientCompanyRoles",
            JSON.stringify(response.data.company_roles)
          );
        }

        console.log(
          "Client login successful: Admin tokens cleared, client tokens set"
        );
        return response.data;
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Client Logout with complete session cleanup
  logout: async () => {
    try {
      const token = localStorage.getItem("clientAuthToken");
      if (token) {
        // Call logout endpoint
        await api.post(
          "/v1/api/longtermhire/client/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Clear client tokens
      localStorage.removeItem("clientAuthToken");
      localStorage.removeItem("clientRole");
      localStorage.removeItem("clientUserId");
      localStorage.removeItem("clientEmail");
      localStorage.removeItem("clientProfile");
      localStorage.removeItem("clientCompanyRoles");

      // Also clear any admin tokens to prevent cross-contamination
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");

      // Clear any other potential auth-related items
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      console.log("Client logout: All authentication tokens cleared");
      window.location.href = "/client/login";
    }
  },

  // Get Client Profile
  getProfile: async () => {
    try {
      const token = localStorage.getItem("clientAuthToken");
      const response = await api.get("/v1/api/longtermhire/client/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && !response.data.error) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to get profile");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Check if client is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("clientAuthToken");
  },

  // Get stored client info
  getClientInfo: () => {
    return {
      token: localStorage.getItem("clientAuthToken"),
      role: localStorage.getItem("clientRole"),
      userId: localStorage.getItem("clientUserId"),
      email: localStorage.getItem("clientEmail"),
      profile: JSON.parse(localStorage.getItem("clientProfile") || "null"),
    };
  },

  // Get company settings (ad_text, logo, etc.)
  getCompanySettings: async () => {
    try {
      const token = localStorage.getItem("clientAuthToken");
      const response = await api.get("/v1/api/longtermhire/client/company-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && !response.data.error) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to get company settings");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
