import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";
import { BTN } from "../styles/buttons";

const EditPricingModal = ({ isOpen, onClose, onSubmit, pricingPackage, loading = false }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
  });

  // Update form data when pricingPackage prop changes
  useEffect(() => {
    if (pricingPackage) {
      setFormData({
        name: pricingPackage.name || "",
        description: pricingPackage.description || "",
        discountType: pricingPackage.discount_type === 1 ? "fixed" : "percentage",
        discountValue: pricingPackage.discount_value || "",
      });
    }
  }, [pricingPackage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data for API
    const packageData = {
      name: formData.name,
      description: formData.description,
      discount_type: formData.discountType === "fixed" ? 1 : 0,
      discount_value: parseFloat(formData.discountValue),
    };

    try {
      await onSubmit(packageData);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form to original pricing package data
    if (pricingPackage) {
      setFormData({
        name: pricingPackage.name || "",
        description: pricingPackage.description || "",
        discountType: pricingPackage.discount_type === 1 ? "fixed" : "percentage",
        discountValue: pricingPackage.discount_value || "",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Pricing Package"
      width="672px"
      height="600px"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6" style={{ width: "606px" }}>
          {/* Package Name */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Package Name*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter package name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 py-3 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors resize-none"
              placeholder="Enter package description"
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Discount Type*
            </label>
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleInputChange}
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Discount Value*
            </label>
            <div className="relative">
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleInputChange}
                required
                min="0"
                step={formData.discountType === "percentage" ? "0.01" : "1"}
                max={formData.discountType === "percentage" ? "100" : undefined}
                className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 pr-12 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
                placeholder={formData.discountType === "percentage" ? "Enter percentage (0-100)" : "Enter amount"}
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] font-[Inter] font-normal text-[14px]">
                {formData.discountType === "percentage" ? "%" : "$"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className={BTN.secondary + " flex-1 h-[48px]"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[48px] bg-[#FDCE06] rounded-lg text-[#1A1A1A] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <ClipLoader color="#1A1A1A" size={20} />
              ) : (
                "Update Package"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditPricingModal;
