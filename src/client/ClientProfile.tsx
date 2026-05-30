// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { clientProfileApi } from "../services/clientProfileApi";
import { clientAuthApi } from "../services/clientAuthApi";
import { chatApi } from "../services/chatApi";
import ClientChangePassword from "./ClientChangePassword";

function ClientProfile() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    role: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();

  // Load client profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        // Check if client is authenticated
        if (!clientAuthApi.isAuthenticated()) {
          navigate("/client/login");
          return;
        }

        const response = await clientProfileApi.getProfile();

        if (response && !response.error) {
          const data = response.data;
          const user = data.user;
          const clientProfile = data.client_profile;

          setFormData({
            fullName: clientProfile?.client_name || user?.username || "",
            email: user?.email || "",
            companyName: clientProfile?.company_name || "",
            role: user?.role_id || "member",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    setError("");
    setSuccess("");
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await clientProfileApi.updateProfile({
        client_name: formData.fullName,
        name: formData.fullName,
      });

      setSuccess("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };

  const handleLogout = async () => {
    try {
      // Set offline status before logout
      await chatApi.setOffline();

      // Then logout
      await clientAuthApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      await clientAuthApi.logout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#292A2B] flex items-center justify-center">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <div className="text-[#E5E5E5] font-[Inter] mt-4">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (showChangePassword) {
    return <ClientChangePassword onBack={() => setShowChangePassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#292A2B] font-[Inter]">
      {/* Header */}
      <header className="bg-[#1F1F20] border-b border-[#333333] px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/client/dashboard")}
              className="flex items-center text-[#9CA3AF] hover:text-[#E5E5E5] font-[Inter] text-sm transition-colors"
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
              Back to Dashboard
            </button>
            <h1 className="text-[#E5E5E5] font-[Inter] text-xl font-semibold">
              Profile Settings
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#E5E5E5] text-sm hover:text-[#FDCE06] transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 sm:px-8 py-8">
        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="border border-[#333333] rounded-lg bg-[#1F1F20] p-6 md:p-8">
            <h3 className="text-[#E5E5E5] text-xl font-semibold mb-6">
              Personal Information
            </h3>

            <div className="space-y-6">
              {/* Full Name Field */}
              <div className="w-full">
                <label className="block text-[#9CA3AF] mb-2 text-sm font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full sm:max-w-md border border-[#333333] rounded-md bg-[#292A2B] text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="w-full">
                <label className="block text-[#9CA3AF] mb-2 text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full sm:max-w-md border border-[#333333] rounded-md bg-[#1A1A1A] text-[#9CA3AF] px-4 py-3 outline-none cursor-not-allowed"
                />
              </div>

              {/* Company Name Field (Read-only) */}
              <div className="w-full">
                <label className="block text-[#9CA3AF] mb-2 text-sm font-medium">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  readOnly
                  className="w-full sm:max-w-md border border-[#333333] rounded-md bg-[#1A1A1A] text-[#9CA3AF] px-4 py-3 outline-none cursor-not-allowed"
                />
              </div>

              {/* Role Field (Read-only) */}
              <div className="w-full">
                <label className="block text-[#9CA3AF] mb-2 text-sm font-medium">
                  Role
                </label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  readOnly
                  className="w-full sm:max-w-md border border-[#333333] rounded-md bg-[#1A1A1A] text-[#9CA3AF] px-4 py-3 outline-none cursor-not-allowed capitalize"
                />
              </div>

              {/* Success/Error Messages */}
              {success && (
                <div className="text-green-400 text-sm font-[Inter] bg-green-900/20 border border-green-400/20 rounded-md p-3">
                  {success}
                </div>
              )}
              {error && (
                <div className="text-red-400 text-sm font-[Inter] bg-red-900/20 border border-red-400/20 rounded-md p-3">
                  {error}
                </div>
              )}

              {/* Save Changes Button */}
              <div className="pt-4">
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className={`rounded-md font-bold px-6 py-3 border-none cursor-pointer transition-colors flex items-center gap-2 ${saving
                    ? "bg-[#9CA3AF] text-[#666] cursor-not-allowed"
                    : "bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]"
                    }`}
                >
                  {saving ? (
                    <>
                      <ClipLoader color="#666" size={16} />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Account Security Section */}
          <div className="border border-[#333333] rounded-lg bg-[#1F1F20] p-6 md:p-8">
            <h3 className="text-[#E5E5E5] text-xl font-semibold mb-6">
              Account Security
            </h3>

            <div className="space-y-4">
              {/* Change Password Button */}
              <button
                onClick={handleChangePassword}
                className="w-full sm:max-w-md border border-[#FDCE06] rounded-md bg-[#292A2B] text-[#FDCE06] py-3 px-6 cursor-pointer hover:bg-[#333333] transition-colors font-semibold"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClientProfile;
