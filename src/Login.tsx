// @ts-nocheck
// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { authApi } from "./services/authApi";
import { useCompanyLogo } from "./hooks/useCompanyLogo";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { companyLogo } = useCompanyLogo();

    // Check if user is already logged in
    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (token) {
            navigate("/dashboard");
        }
    }, [navigate]);

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
            const result = await authApi.login(email, password);
            console.log("Login successful:", result);
            navigate("/dashboard");
        } catch (error) {
            console.error("Login error:", error);
            setError(error.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-[#292A2B] p-4">
            {/* Main Frame - Responsive container */}
            <div className="w-full  h-screen  flex flex-col rounded-lg overflow-hidden">
                {/* Header Section */}
                <header className="relative border-b border-[#333333] flex items-start h-[101px] min-h-[101px] flex-shrink-0">
                    {/* Logo positioned at top-left */}
                    <img
                        src={companyLogo || "/figma-assets/logo.svg"}
                        alt="Company Logo"
                        alt="Equipment Rental Logo"
                        className="absolute max-w-[240px] max-h-[135px] w-auto h-auto"
                        style={{
                            top: "-17px",
                            left: "0px",
                        }}
                    />
                </header>

                {/* Main Section */}
                <main className="flex-1 flex items-center justify-center p-4 min-h-0">
                    {/* Login Form Container - Responsive dimensions */}
                    <div className="bg-[#1F1F20] border border-[#333333] flex flex-col rounded-lg w-full max-w-md mx-auto">
                        {/* Title Section */}
                        <div className="flex items-center justify-center p-6 pb-4">
                            <h2 className="text-[#E5E5E5] font-[Inter] text-center text-2xl sm:text-3xl font-normal">
                                Login
                            </h2>
                        </div>

                        {/* Form Section */}
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col px-6 pb-6 space-y-6"
                        >
                            {/* Input Fields Container */}
                            <div className="flex flex-col space-y-4">
                                {/* Email Field */}
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-[#E5E5E5] font-[Inter] text-sm font-normal mb-3"
                                    >
                                        Email:
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-[38px] bg-[#1C1C1C] border border-[#444444] text-[#E5E5E5] placeholder-[#ADAEBC] font-[Inter] focus:outline-none focus:ring-0 px-3 rounded-md text-sm"
                                        placeholder="Enter Email Address"
                                        required
                                    />
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label
                                        htmlFor="password"
                                        className="block text-[#E5E5E5] font-[Inter] text-sm font-normal mb-3"
                                    >
                                        Password:
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-[38px] bg-[#1C1C1C] border border-[#444444] text-[#E5E5E5] placeholder-[#ADAEBC] font-[Inter] focus:outline-none focus:ring-0 px-3 rounded-md text-sm"
                                        placeholder="Enter Password"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Remember Me Section */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 bg-white border-black border-opacity-50 rounded-sm focus:ring-0 shadow-sm"
                                    />
                                    <label
                                        htmlFor="remember"
                                        className="text-[#E5E5E5] accent-yellow-500 font-[Inter] ml-2 text-sm font-normal cursor-pointer"
                                    >
                                        Remember Me
                                    </label>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <span className="text-red-400 text-sm font-[Inter]">
                                        {error}
                                    </span>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full h-[38px] border text-[#1F1F20] font-[Inter] transition-colors flex items-center justify-center gap-2 rounded-md text-sm font-semibold ${loading
                                    ? "bg-[#9CA3AF] border-[#9CA3AF] cursor-not-allowed"
                                    : "bg-[#FDCE06] border-[#FDCE06] hover:bg-[#e6b800]"
                                    }`}
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
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
