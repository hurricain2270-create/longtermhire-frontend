import api from "./api";

export const clientPasswordApi = {
  // Change your own password while logged in. The page has always called this;
  // it just was not here.
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put(
        "/v1/api/longtermhire/client/change-password",
        { current_password: currentPassword, new_password: newPassword }
      );
      if (response.data && !response.data.error) {
        return response.data;
      }
      throw new Error(response.data?.message || "Could not change your password");
    } catch (error) {
      throw error.response?.data || error.message || error;
    }
  },

  // Step 1: Send OTP to email for password reset
  forgotPassword: async (email) => {
    try {
      const response = await api.post("/v1/api/longtermhire/client/forgot-password", {
        email,
      });

      if (response.data && !response.data.error) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to send reset instructions");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Step 2: Verify OTP code
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post("/v1/api/longtermhire/client/verify-otp", {
        email,
        otp,
      });

      if (response.data && !response.data.error) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Invalid verification code");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Step 3: Reset password with new password
  resetPassword: async (email, resetToken, newPassword) => {
    try {
      const response = await api.post("/v1/api/longtermhire/client/reset-password", {
        email,
        reset_token: resetToken,
        new_password: newPassword,
      });

      if (response.data && !response.data.error) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to reset password");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Resend OTP
  resendOTP: async (email) => {
    try {
      const response = await api.post("/v1/api/longtermhire/client/resend-otp", {
        email,
      });

      if (response.data && !response.data.error) {
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to resend verification code");
      }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
