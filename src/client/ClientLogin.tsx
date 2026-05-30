// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { clientAuthApi } from "../services/clientAuthApi";
import { useCompanyLogo } from "../hooks/useCompanyLogo";

function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { companyLogo } = useCompanyLogo();

  // Check if client is already logged in and handle success messages
  useEffect(() => {
    if (clientAuthApi.isAuthenticated()) {
      navigate("/client/dashboard");
    }

    // Check for success message from password reset
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear the message from location state
      navigate(location.pathname, { replace: true });
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const result = await clientAuthApi.login(email, password);
      console.log("Client login successful:", result);
      navigate("/client/dashboard");
    } catch (error) {
      console.error("Client login error:", error);
      setError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/client/forgot-password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#292A2B]">
      {/* Main Frame - Transparent container with exact Figma dimensions */}
      <div
        className="border-2 min-h-screen border-[#E5E7EB] flex flex-col"
        style={{
          width: "100%",
          borderRadius: "8px",
        }}
      >
        {/* Header Section */}
        <header
          className="relative border-b border-[#333333] flex items-start"
          style={{ height: "101px" }}
        >
          {/* Logo positioned at top-left */}
          <img
            src="/login-logo.png"
            alt="Equipment Rental Logo"
            className="absolute"
            style={{
              width: "240px",
              height: "135px",
              top: "-17px",
              left: "0px",
            }}
          />
        </header>

        {/* Main Section */}
        <main
          className="flex-1 flex items-center justify-center"
          style={{ height: "687px" }}
        >
          {/* Login Form Container - Exact Figma dimensions */}
          <div
            className="bg-[#1F1F20] w-[90%] sm:w-[448px] min-h-[415px] border border-[#333333] flex flex-col"
            style={{
              borderRadius: "8px",
            }}
          >
            {/* Title Section */}
            <div
              className="flex items-center justify-center w-[90%] sm:w-[398px]"
              style={{
                height: "36px",
                marginLeft: "25px",
                marginTop: "25px",
              }}
            >
              <h2
                className="text-[#E5E5E5] font-[Inter] text-center"
                style={{
                  fontSize: "30px",
                  fontWeight: "400",
                  lineHeight: "1.2em",
                }}
              >
                Login
              </h2>
            </div>

            {/* Form Section */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col min-h-[263px] w-[90%] sm:w-[398px]"
              style={{
                marginLeft: "25px",
                marginTop: "32px",
              }}
            >
              {/* Input Fields Container */}
              <div
                className="flex flex-col bg-transparent w-[90%] sm:w-[398px]"
                style={{
                  height: "147px",
                  borderRadius: "6px",
                  boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
                }}
              >
                {/* Email Field */}
                <div className="w-full">
                  {/* Email Label */}
                  <label
                    htmlFor="email"
                    className="block text-[#E5E5E5] font-[Inter]"
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      lineHeight: "1.21em",
                      marginTop: "1px",
                      marginBottom: "11px",
                    }}
                  >
                    Email:
                  </label>
                  {/* Email Input */}
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#1C1C1C] border border-[#444444] text-[#E5E5E5] placeholder-[#ADAEBC] font-[Inter] focus:outline-none focus:ring-0 px-3 w-[100%] sm:w-[398px]"
                    style={{
                      height: "38px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      lineHeight: "1.43em",
                    }}
                    placeholder="Enter Email Address"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="w-full">
                  {/* Password Label */}
                  <label
                    htmlFor="password"
                    className="block text-[#E5E5E5] font-[Inter]"
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      lineHeight: "1.21em",
                      marginTop: "17px",
                      marginBottom: "11px",
                    }}
                  >
                    Password:
                  </label>
                  {/* Password Input */}
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#1C1C1C] border border-[#444444] text-[#E5E5E5] placeholder-[#ADAEBC] font-[Inter] focus:outline-none focus:ring-0 px-3 w-[100%] sm:w-[398px]"
                    style={{
                      height: "38px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      lineHeight: "1.43em",
                    }}
                    placeholder="Enter Password"
                    required
                  />
                </div>
              </div>

              {/* Remember Me Section */}
              <div
                className="flex items-center justify-between w-[90%] sm:w-[398px]"
                style={{
                  height: "20px",
                  marginTop: "24px",
                }}
              >
                <div className="flex items-center w-[90%] sm:w-[398px]">
                  {/* Checkbox */}
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="bg-white accent-yellow-500 border-black border-opacity-50 rounded-sm focus:ring-0"
                    style={{
                      width: "16px",
                      height: "16px",
                      marginTop: "2px",
                      boxShadow: "0px 4px 4px 0px rgba(0, 0, 0, 0.25)",
                      borderWidth: "0.5px",
                    }}
                  />
                  {/* Label */}
                  <label
                    htmlFor="remember"
                    className="text-[#E5E5E5] font-[Inter] ml-2"
                    style={{
                      fontSize: "14px",
                      fontWeight: "400",
                      lineHeight: "1.21em",
                    }}
                  >
                    Remember Me
                  </label>
                </div>

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[#FDCE06] whitespace-nowrap font-[Inter] hover:underline"
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    lineHeight: "1.21em",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Success Message */}
              {success && (
                <div className="text-green-400 text-sm font-[Inter] text-center mt-2">
                  {success}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-red-400 text-sm font-[Inter] text-center mt-2">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="w-[90%] sm:w-[398px] h-[38px] mt-[52px]">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-full border text-[#1F1F20] font-[Inter] transition-colors flex items-center justify-center gap-2 ${loading
                    ? "bg-[#9CA3AF] border-[#9CA3AF] cursor-not-allowed"
                    : "bg-[#FDCE06] border-[#FDCE06] hover:bg-[#e6b800]"
                    }`}
                  style={{
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    lineHeight: "1.21em",
                  }}
                >
                  {loading ? (
                    <>
                      <ClipLoader color="#1F1F20" size={14} />
                      Signing in...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClientLogin;
