import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";

const EditClientModal = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
  });

  // Update form data when client prop changes
  useEffect(() => {
    if (client) {
      setFormData({
        clientName: client.client_name || "",
        companyName: client.company_name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
      });
    }
  }, [client]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Phone number validation - only allow digits
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data for API
    const clientData = {
      client_name: formData.clientName,
      company_name: formData.companyName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
    };

    try {
      await onSubmit(clientData);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form to original client data
    if (client) {
      setFormData({
        clientName: client.client_name || "",
        companyName: client.company_name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Client"
      width="680px"
    >
      <form onSubmit={handleSubmit} className="p-1">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Client Name Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Client Name
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>

            {/* Company Name Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Phone
              </label>
              <input
                type="text"
                inputMode="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>
          </div>

          {/* Address Field (Full Width) */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="h-11 px-6 bg-[#333333] rounded-md text-white hover:bg-[#404040] transition-all font-[Inter] font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`h-11 px-8 rounded-md text-[#1F1F20] font-bold text-sm transition-all flex items-center justify-center gap-2 ${loading
                ? "bg-[#9CA3AF] cursor-not-allowed"
                : "bg-[#FDCE06] hover:bg-[#E5B800] shadow-lg shadow-[#FDCE06]/10"
                }`}
            >
              {loading ? (
                <>
                  <ClipLoader color="#1F1F20" size={16} />
                  Updating...
                </>
              ) : (
                "Update Client"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditClientModal;
