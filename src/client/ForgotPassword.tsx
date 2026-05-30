// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { clientPasswordApi } from "../services/clientPasswordApi";
import { useCompanyLogo } from "../hooks/useCompanyLogo";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { companyLogo } = useCompanyLogo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      const result = await clientPasswordApi.forgotPassword(email);
      console.log("Forgot password result:", result);
      setSuccess("Password reset instructions have been sent to your email.");

      // Navigate to OTP verification after 2 seconds
      setTimeout(() => {
        navigate("/client/verify-otp", { state: { email } });
      }, 2000);
    } catch (error) {
      console.error("Forgot password error:", error);
      setError(
        error.message || "Failed to send reset instructions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/client/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#292A2B]">
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

        {/* Forgot Password Form Container */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-8">
          {/* Back Button */}
          <button
            onClick={handleBackToLogin}
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
            Back to Login
          </button>

          {/* Title */}
          <h2 className="text-[#E5E5E5] font-[Inter] text-center text-2xl font-medium mb-4">
            Forgot Password
          </h2>

          {/* Description */}
          <p className="text-[#9CA3AF] font-[Inter] text-center text-sm mb-8">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-[#E5E5E5] font-[Inter] text-sm font-medium mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] placeholder-[#9CA3AF] font-[Inter] px-4 focus:outline-none focus:border-[#FDCE06] transition-colors"
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm font-[Inter] text-center">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="text-green-400 text-sm font-[Inter] text-center">
                {success}
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
                  Sending...
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-[#9CA3AF] font-[Inter] text-sm">
              Remember your password?{" "}
              <button
                onClick={handleBackToLogin}
                className="text-[#FDCE06] hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
