import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";
import { BTN } from "../styles/buttons";

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
    contactPosition: "",
    abn: "",
    paymentTerms: "30 days from end of month",
    street: "",
    suburb: "",
    state: "",
    postcode: "",
  });

  // Update form data when client prop changes
  useEffect(() => {
    if (client) {
      setFormData({
        clientName: client.client_name || "",
        companyName: client.company_name || "",
        email: client.email || "",
        phone: client.phone || "",
        contactPosition: client.contact_position || "",
        abn: client.abn || "",
        paymentTerms: client.payment_terms || "30 days from end of month",
        street: client.street || "",
        suburb: client.suburb || "",
        state: client.state || "",
        postcode: client.postcode || "",
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
    const postalAddress = [
      formData.street,
      formData.suburb,
      formData.state,
      formData.postcode,
    ]
      .filter(Boolean)
      .join(" ");

    const clientData = {
      client_name: formData.clientName,
      company_name: formData.companyName,
      email: formData.email,
      phone: formData.phone,
      contact_position: formData.contactPosition,
      abn: formData.abn,
      payment_terms: formData.paymentTerms,
      address: postalAddress,
      street: formData.street,
      suburb: formData.suburb,
      state: formData.state,
      postcode: formData.postcode,
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
        contactPosition: client.contact_position || "",
        abn: client.abn || "",
        paymentTerms: client.payment_terms || "30 days from end of month",
        street: client.street || "",
        suburb: client.suburb || "",
        state: client.state || "",
        postcode: client.postcode || "",
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
                Name
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

          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Position
              </label>
              <input
                type="text"
                name="contactPosition"
                value={formData.contactPosition}
                onChange={handleInputChange}
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                ABN
              </label>
              <input
                type="text"
                name="abn"
                value={formData.abn}
                onChange={handleInputChange}
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Payment terms
            </label>
            <input
              type="text"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleInputChange}
              className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
            />
          </div>

          {/* Postal Address */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Street
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              required
              className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
            />
          </div>

          <div className="grid grid-cols-3 gap-x-6">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Suburb
              </label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              >
                <option value="">Select</option>
                <option value="QLD">QLD</option>
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="SA">SA</option>
                <option value="WA">WA</option>
                <option value="TAS">TAS</option>
                <option value="NT">NT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Postcode
              </label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleInputChange}
                maxLength={4}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className={BTN.secondary + " h-11"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`h-11 px-8 rounded-lg text-[#1F1F20] font-bold text-sm transition-all flex items-center justify-center gap-2 ${loading
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
