// @ts-nocheck
import { useState } from "react";
import Modal from "./Modal";
import { BTN } from "../styles/buttons";

const AddPricingPackageModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "0", // 0=Percentage, 1=Fixed
    discount_value: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Package name is required";
    }
    if (!formData.discount_value || formData.discount_value === "") {
      newErrors.discount_value = "Discount value is required";
    } else {
      const value = parseFloat(formData.discount_value);
      if (isNaN(value) || value <= 0) {
        newErrors.discount_value = "Please enter a valid positive number";
      } else if (formData.discount_type === "0" && value > 100) {
        newErrors.discount_value = "Percentage cannot exceed 100%";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert discount_value to number
    const packageData = {
      ...formData,
      discount_type: parseInt(formData.discount_type),
      discount_value: parseFloat(formData.discount_value),
    };

    onSubmit(packageData);

    // Clear form data only on successful submission
    setFormData({
      name: "",
      description: "",
      discount_type: "0",
      discount_value: "",
    });
    setErrors({});
  };

  const handleCancel = () => {
    // Don't clear form data when canceling - preserve user input
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Pricing Package"
      width="550px"
    >
      <div className="space-y-6">
        {/* Description */}
        <p className="text-[#9CA3AF] font-[Inter] text-[16px] leading-[24px] -mt-2">
          Create a new pricing package with discount settings for your clients.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Package Name */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Package Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Premium Package"
              className={`w-full h-[50px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 outline-none transition-colors ${
                errors.name
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#333333] focus:border-[#FDCE06]"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Package description..."
              rows="3"
              className="w-full bg-[#292A2B] border border-[#333333] rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] p-3 outline-none focus:border-[#FDCE06] resize-none transition-colors"
            />
          </div>

          {/* Discount Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
                Discount Type *
              </label>
              <div className="relative">
                <select
                  name="discount_type"
                  value={formData.discount_type}
                  onChange={handleInputChange}
                  className="w-full h-[50px] bg-[#292A2B] border border-[#333333] rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 pr-10 outline-none appearance-none cursor-pointer focus:border-[#FDCE06] transition-colors"
                >
                  <option value="0">Percentage (%)</option>
                  <option value="1">Fixed Amount ($)</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="17" height="10" viewBox="0 0 17 10" fill="none">
                    <path
                      d="M1 1L8.5 8.5L16 1"
                      stroke="#E5E5E5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
                Discount Value *
              </label>
              <div className="relative">
                <span
                  className={`absolute top-1/2 transform -translate-y-1/2 font-[Inter] text-[16px] text-[#9CA3AF] z-10 ${
                    formData.discount_type === "1" ? "left-3" : "right-3"
                  }`}
                >
                  {formData.discount_type === "0" ? "%" : "$"}
                </span>
                <input
                  type="number"
                  name="discount_value"
                  value={formData.discount_value}
                  onChange={handleInputChange}
                  placeholder={formData.discount_type === "0" ? "10" : "100"}
                  step="0.01"
                  min="0"
                  max={formData.discount_type === "0" ? "100" : undefined}
                  className={`w-full h-[50px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] outline-none transition-colors ${
                    errors.discount_value
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#333333] focus:border-[#FDCE06]"
                  } ${
                    formData.discount_type === "1" ? "pl-8 pr-3" : "pl-3 pr-8"
                  }`}
                />
              </div>
              {errors.discount_value && (
                <p className="text-red-500 text-sm mt-1 font-[Inter]">
                  {errors.discount_value}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className={BTN.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#FDCE06] hover:bg-[#E5B800] border-none rounded-[6px] text-[#1F1F20] font-[Inter] font-bold text-[16px] cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddPricingPackageModal;
