import { useState } from "react";
import { ClipLoader } from "react-spinners";
import { clientPasswordApi } from "../services/clientPasswordApi";
import { useNavigate } from "react-router-dom";
import { useCompanyLogo } from "../hooks/useCompanyLogo";

function ClientChangePassword({ onBack }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { companyLogo } = useCompanyLogo();

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate passwords
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      setLoading(false);
      return;
    }

    try {
      await clientPasswordApi.changePassword(currentPassword, newPassword);
      setSuccess(true);

      // Auto redirect after 2 seconds
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error) {
      console.error("Change password error:", error);
      setError(error.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    switch (field) {
      case "current":
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case "new":
        setShowNewPassword(!showNewPassword);
        break;
      case "confirm":
        setShowConfirmPassword(!showConfirmPassword);
        break;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#292A2B] flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-[#E5E5E5] font-[Inter] text-2xl font-semibold mb-2">
            Password Changed Successfully!
          </h2>
          <p className="text-[#9CA3AF] font-[Inter] text-sm">
            Redirecting back to profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#292A2B] flex items-center justify-center">
      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src={companyLogo || "/login-logo.png"}
            alt="Company Logo"
            className="mx-auto mb-4"
            style={{ width: "200px", height: "auto" }}
          />
        </div>

        {/* Change Password Form Container */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-8">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center text-[#9CA3AF] hover:text-[#E5E5E5] font-[Inter] text-sm mb-6 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="mr-2"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to Profile
          </button>

          {/* Title */}
          <h2 className="text-[#E5E5E5] font-[Inter] text-center text-2xl font-medium mb-4">
            Change Password
          </h2>

          {/* Description */}
          <p className="text-[#9CA3AF] font-[Inter] text-center text-sm mb-8">
            Update your account password for better security.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password Field */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-[#E5E5E5] font-[Inter] text-sm font-medium mb-2"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-12 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] placeholder-[#9CA3AF] font-[Inter] px-4 pr-12 focus:outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
                >
                  {showCurrentPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-[#E5E5E5] font-[Inter] text-sm font-medium mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] placeholder-[#9CA3AF] font-[Inter] px-4 pr-12 focus:outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
                >
                  {showNewPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[#E5E5E5] font-[Inter] text-sm font-medium mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] placeholder-[#9CA3AF] font-[Inter] px-4 pr-12 focus:outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1 1l22 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-[#9CA3AF] font-[Inter]">
              <p className="mb-1">Password must contain:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
                <li>One special character</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm font-[Inter] text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-md font-[Inter] font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${loading
                  ? "bg-[#9CA3AF] text-[#666] cursor-not-allowed"
                  : "bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]"
                }`}
            >
              {loading ? (
                <>
                  <ClipLoader color="#666" size={16} />
                  Changing Password...
                </>
              ) : (
                "Change Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ClientChangePassword;
