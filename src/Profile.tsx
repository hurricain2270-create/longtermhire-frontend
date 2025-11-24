// @ts-nocheck
import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { adminProfileApi } from "./services/adminProfileApi";
import { equipmentApi } from "./services/equipmentApi";
import { settingsApi } from "./services/settingsApi";
import AdminChangePassword from "./components/AdminChangePassword";

const Profile = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    contactInfo: "",
    companyAddress: "",
    companyLogo: null,
  });
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Load admin profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await adminProfileApi.getProfile();

        if (response && !response.error) {
          const userData = response.data;
          console.log("Admin profile response:", userData);

          // Parse the data field if it exists and is a JSON string
          let profileData = {};
          if (userData.data) {
            try {
              profileData =
                typeof userData.data === "string"
                  ? JSON.parse(userData.data)
                  : userData.data;
            } catch (e) {
              console.warn("Failed to parse profile data:", e);
              profileData = {};
            }
          }

          setFormData({
            fullName:
              profileData.name ||
              profileData.first_name ||
              userData.username ||
              "",
            email: userData.email || "",
            companyName: profileData.company_name || "",
            contactInfo: profileData.contact_info || profileData.phone || "",
            companyAddress: profileData.company_address || "",
            companyLogo: null,
          });

          // Fetch company settings to get the logo URL
          try {
            const settingsResponse = await settingsApi.getSettings();
            console.log("Company settings response:", settingsResponse);

            if (settingsResponse && settingsResponse.data) {
              const settings = settingsResponse.data;
              // Set company logo preview from settings if exists
              if (settings.company_logo) {
                setProfilePicturePreview(settings.company_logo);
              }
            }
          } catch (settingsError) {
            console.warn("Failed to load company settings:", settingsError);
            // Fallback to profile data logo if settings fetch fails
            if (profileData.company_logo || userData.company_logo) {
              setProfilePicturePreview(
                profileData.company_logo || userData.company_logo
              );
            }
          }

          console.log("Parsed profile data:", {
            profileData,
            formData: {
              fullName:
                profileData.name ||
                profileData.first_name ||
                userData.username ||
                "",
              email: userData.email || "",
              companyName: profileData.company_name || "",
              contactInfo: profileData.contact_info || profileData.phone || "",
              companyAddress: profileData.company_address || "",
            },
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
  }, []);

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

  const handleCompanyLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        companyLogo: file,
      }));
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
      setSuccess("");
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let logoUrl = profilePicturePreview;

      // Upload logo if a new file was selected
      if (formData.companyLogo) {
        try {
          const uploadResponse = await equipmentApi.uploadFile(formData.companyLogo);
          if (uploadResponse && uploadResponse.url) {
            logoUrl = uploadResponse.url;
            setProfilePicturePreview(logoUrl);
          } else {
            throw new Error("Failed to upload logo");
          }
        } catch (uploadError) {
          console.error("Logo upload error:", uploadError);
          setError("Failed to upload logo. Please try again.");
          return;
        }
      }

      // Update admin profile
      const updateData = {
        name: formData.fullName,
        first_name: formData.fullName,
        company_name: formData.companyName,
        contact_info: formData.contactInfo,
        company_address: formData.companyAddress,
      };

      await adminProfileApi.updateProfile(updateData);

      // Update company settings
      const settingsData = {
        company_name: formData.companyName,
        company_address: formData.companyAddress,
        company_email: formData.email,
        company_phone: formData.contactInfo,
        company_logo: logoUrl,
      };

      await settingsApi.updateSettings(settingsData);

      setSuccess("Profile and company settings updated successfully!");

      // Clear the file input
      setFormData(prev => ({ ...prev, companyLogo: null }));
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

  if (loading) {
    return (
      <div className="w-full max-w-[1184px] mx-auto px-4 sm:px-8 py-8 bg-transparent min-h-screen flex items-center justify-center">
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
    return <AdminChangePassword onBack={() => setShowChangePassword(false)} />;
  }

  return (
    <div className="w-full max-w-full mx-auto px-4 sm:px-8 py-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-[#E5E5E5]"
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: "clamp(24px, 5vw, 36px)",
            lineHeight: "40px",
          }}
        >
          Profile
        </h1>
      </div>

      {/* Main Content Container */}
      <div className="w-full space-y-6">
        {/* Personal Information Section */}
        <div className="border border-[#333333] rounded-lg bg-[#1F1F20] p-6 md:p-8">
          {/* Section Title */}
          <h3
            className="text-[#E5E5E5] mb-6"
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "clamp(18px, 4vw, 24px)",
              lineHeight: "29px",
            }}
          >
            Personal Information
          </h3>

          {/* Form Container - 2 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Full Name Field */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full border border-[#333333] rounded-md bg-[#292A2B] text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full border border-[#333333] rounded-md bg-[#1A1A1A] text-[#9CA3AF] px-4 py-3 outline-none cursor-not-allowed"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Company Name Field */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full border border-[#333333] rounded-md bg-[#292A2B] text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                />
              </div>

              {/* Contact Information Field */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Contact Information
                </label>
                <input
                  type="text"
                  name="contactInfo"
                  value={formData.contactInfo}
                  onChange={handleInputChange}
                  className="w-full border border-[#333333] rounded-md bg-[#292A2B] text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                />
              </div>

              {/* Company Address Field */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Company address
                </label>
                <input
                  type="text"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  className="w-full border border-[#333333] rounded-md bg-[#292A2B] text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 400,
                    fontSize: "16px",
                    lineHeight: "24px",
                  }}
                />
              </div>

              {/* Company Logo Upload */}
              <div className="w-full">
                <label
                  className="block text-[#9CA3AF] mb-2"
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "17px",
                  }}
                >
                  Company Logo
                </label>
                <div className="border-2 border-dashed border-[#333333] rounded-md p-4 flex items-center justify-center">
                  {profilePicturePreview ? (
                    <div className="relative w-full">
                      <img
                        src={profilePicturePreview}
                        alt="Company Logo"
                        className="w-full h-32 object-contain"
                      />
                      <input
                        type="file"
                        id="companyLogo"
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="companyLogo"
                        className="absolute top-2 right-2 cursor-pointer text-[#FDCE06] hover:text-[#E5B800]"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </label>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        type="file"
                        id="companyLogo"
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="companyLogo"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          className="mb-2"
                        >
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[#9CA3AF] text-sm">Upload logo</span>
                        <span className="text-[#666] text-xs mt-1">↑</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">

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
                className={`rounded-md px-6 py-3 border-none cursor-pointer transition-colors font-bold flex items-center gap-2 ${saving
                  ? "bg-[#9CA3AF] text-[#666] cursor-not-allowed"
                  : "bg-[#FDCE06] text-[#1F1F20] hover:bg-[#E5B800]"
                  }`}
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: "16px",
                  lineHeight: "19px",
                }}
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
          <h3
            className="text-[#E5E5E5] mb-6"
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "clamp(18px, 4vw, 24px)",
              lineHeight: "29px",
            }}
          >
            Account Security
          </h3>

          {/* Buttons Container */}
          <div className="space-y-4 flex flex-col gap-2">
            {/* Change Password Button */}
            <button
              onClick={handleChangePassword}
              className="w-full sm:max-w-md border border-[#FDCE06] rounded-md bg-[#292A2B] text-[#FDCE06] py-3 px-6 cursor-pointer hover:bg-[#333333] transition-colors"
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "16px",
                lineHeight: "19px",
              }}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
