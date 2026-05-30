// @ts-nocheck
//  import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { clientPasswordApi } from "../services/clientPasswordApi";
import { useCompanyLogo } from "../hooks/useCompanyLogo";
import { useEffect, useRef, useState } from "react";

function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { companyLogo } = useCompanyLogo();
  const inputRefs = useRef([]);

  const email = location.state?.email || "";

  useEffect(() => {
    // Start cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      const result = await clientPasswordApi.verifyOTP(email, otpCode);
      console.log("OTP verification result:", result);

      // Navigate to reset password on success with reset token
      navigate("/client/reset-password", {
        state: {
          email,
          resetToken: result.data.reset_token,
        },
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(error.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError("");

    try {
      const result = await clientPasswordApi.resendOTP(email);
      console.log("Resend OTP result:", result);
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError(error.message || "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToForgotPassword = () => {
    navigate("/client/forgot-password");
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

        {/* OTP Verification Form Container */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-8">
          {/* Back Button */}
          <button
            onClick={handleBackToForgotPassword}
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
            Back
          </button>

          {/* Title */}
          <h2 className="text-[#E5E5E5] font-[Inter] text-center text-2xl font-medium mb-4">
            Enter OTP
          </h2>

          {/* Description */}
          <p className="text-[#9CA3AF] font-[Inter] text-center text-sm mb-8">
            A 6-digit code has been sent to your email.
            {email && (
              <span className="block mt-1 text-[#FDCE06]">{email}</span>
            )}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Fields */}
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-[Inter] text-center text-lg font-semibold focus:outline-none focus:border-[#FDCE06] transition-colors"
                />
              ))}
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
                  Verifying...
                </>
              ) : (
                "Proceed"
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-[#9CA3AF] font-[Inter] text-sm">
              Didn't receive the code?{" "}
              {resendCooldown > 0 ? (
                <span className="text-[#666]">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-[#FDCE06] hover:underline disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend"}
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
