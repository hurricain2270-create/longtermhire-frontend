import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";

const EditEquipmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  equipment,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    categoryId: "",
    category: "",
    equipmentId: "",
    equipmentName: "",
    basePrice: "",
    minimumDuration: "3 Months",
    position: "",
    availability: true,
    description: "",
  });

  // Update form data when equipment prop changes
  useEffect(() => {
    if (equipment) {
      setFormData({
        categoryId: equipment.category_id || "",
        category: equipment.category_name || "",
        equipmentId: equipment.equipment_id || "",
        equipmentName: equipment.equipment_name || "",
        basePrice: equipment.base_price || "",
        minimumDuration: equipment.minimum_duration || "3 Months",
        position: equipment.position || "",
        availability: equipment.availability,
        description: equipment.description || "",
      });
    }
  }, [equipment]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data for API
    const equipmentData = {
      categoryId: formData.categoryId,
      category: formData.category,
      equipmentId: formData.equipmentId,
      equipmentName: formData.equipmentName,
      basePrice: formData.basePrice,
      minimumDuration: formData.minimumDuration,
      position: formData.position,
      availability: formData.availability ? 1 : 0,
      description: formData.description,
    };

    try {
      await onSubmit(equipmentData);
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form to original equipment data
    if (equipment) {
      setFormData({
        categoryId: equipment.category_id || "",
        category: equipment.category_name || "",
        equipmentId: equipment.equipment_id || "",
        equipmentName: equipment.equipment_name || "",
        basePrice: equipment.base_price || "",
        minimumDuration: equipment.minimum_duration || "3 Months",
        position: equipment.position || "",
        availability:
          equipment.availability === 1 || equipment.availability === true,
        description: equipment.description || "",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Equipment"
      width="672px"
      height="700px"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6" style={{ width: "606px" }}>
          {/* Category ID */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Category ID*
            </label>
            <input
              type="text"
              name="categoryId"
              value={formData.categoryId}
              readOnly
              className="w-full h-[48px] bg-[#2A2A2A] border border-[#333333] rounded-[8px] px-4 text-[#9CA3AF] font-[Inter] font-normal text-[14px] leading-[1.21em] cursor-not-allowed"
              placeholder="Enter category ID"
            />
          </div>

          {/* Category Name */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Category Name*
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter category name"
            />
          </div>

          {/* Equipment ID */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Equipment ID*
            </label>
            <input
              type="text"
              name="equipmentId"
              value={formData.equipmentId}
              readOnly
              className="w-full h-[48px] bg-[#2A2A2A] border border-[#333333] rounded-[8px] px-4 text-[#9CA3AF] font-[Inter] font-normal text-[14px] leading-[1.21em] cursor-not-allowed"
              placeholder="Enter equipment ID"
            />
          </div>

          {/* Equipment Name */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Equipment Name*
            </label>
            <input
              type="text"
              name="equipmentName"
              value={formData.equipmentName}
              onChange={handleInputChange}
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter equipment name"
            />
          </div>

          {/* Base Price */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Base Price*
            </label>
            <input
              type="text"
              name="basePrice"
              value={formData.basePrice}
              onChange={handleInputChange}
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter base price (e.g., $2500/month)"
            />
          </div>

          {/* Minimum Duration */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Minimum Duration (Months)*
            </label>
            <input
              type="number"
              name="minimumDuration"
              value={formData.minimumDuration.replace(/[^\d]/g, "") || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === "" ||
                  (parseInt(value) >= 1 && parseInt(value) <= 60)
                ) {
                  setFormData((prev) => ({
                    ...prev,
                    minimumDuration: value
                      ? `${value} Month${parseInt(value) !== 1 ? "s" : ""}`
                      : "",
                  }));
                }
              }}
              min="1"
              max="60"
              required
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter number of months (1-60)"
            />
            <p className="text-[#9CA3AF] text-xs mt-1">
              Enter a number between 1 and 60 months
            </p>
          </div>

          {/* Position */}
          <div>
            <label className="block text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Position Number*
            </label>
            <input
              type="number"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              required
              min="1"
              className="w-full h-[48px] bg-[#1A1A1A] border border-[#333333] rounded-[8px] px-4 text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] focus:outline-none focus:border-[#FDCE06] transition-colors"
              placeholder="Enter position number"
            />
          </div>

          {/* Availability */}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-[48px] bg-transparent border border-[#333333] rounded-[8px] text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:border-[#555555] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[48px] bg-[#FDCE06] rounded-[8px] text-[#1A1A1A] font-[Inter] font-medium text-[14px] leading-[1.21em] hover:bg-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <ClipLoader color="#1A1A1A" size={20} />
              ) : (
                "Update Equipment"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditEquipmentModal;
