// @ts-nocheck
import { useState } from "react";
import Modal from "./Modal";
import { BTN } from "../styles/buttons";

const CustomPackageModal = ({
  isOpen,
  onClose,
  onSave,
  clientId,
  clientEquipment = [],
}) => {
  // Debug: Log the equipment data
  console.log("CustomPackageModal - clientEquipment:", clientEquipment);
  const [formData, setFormData] = useState({
    discountType: "percentage", // "percentage" or "fixed"
    discountValue: "",
  });

  console.log(clientEquipment);
  const [errors, setErrors] = useState({});
  const [selectedEquipment, setSelectedEquipment] = useState([]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (selectedEquipment.length === 0) {
      newErrors.equipment = "Please select at least one equipment";
    }

    if (!formData.discountValue || formData.discountValue === "") {
      newErrors.discountValue = "Discount value is required";
    } else {
      const value = parseFloat(formData.discountValue);
      if (isNaN(value) || value <= 0) {
        newErrors.discountValue = "Please enter a valid positive number";
      } else if (formData.discountType === "percentage" && value > 100) {
        newErrors.discountValue = "Percentage cannot exceed 100%";
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

    const discountValue = parseFloat(formData.discountValue);

    onSave({
      discountType: formData.discountType,
      discountValue: discountValue,
      selectedEquipment: selectedEquipment,
      displayName:
        formData.discountType === "percentage"
          ? `Custom - ${discountValue}% off`
          : `Custom - $${discountValue} off`,
    });

    // Reset form
    setFormData({
      discountType: "percentage",
      discountValue: "",
    });
    setErrors({});
  };

  const handleCancel = () => {
    setFormData({
      discountType: "percentage",
      discountValue: "",
    });
    setErrors({});
    setSelectedEquipment([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Create Equipment-Specific Custom Discount"
      width="600px"
    >
      <div className="space-y-6">
        {/* Description */}
        <p className="text-[#9CA3AF] font-[Inter] text-[16px] leading-[24px] -mt-2">
          Create a custom discount that will be applied to all equipment
          assigned to this client.
        </p>

        {/* Equipment Selection */}
        <div>
          <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
            Select equipment to apply custom discount:
          </label>
          <div className="bg-[#292A2B] border border-[#333333] rounded-[6px] p-3 max-h-32 overflow-y-auto">
            {clientEquipment.length > 0 ? (
              clientEquipment.map((equipment, index) => {
                const equipmentId = equipment.equipment_id || equipment.id;
                const isSelected = selectedEquipment.includes(equipmentId);

                return (
                  <div
                    key={equipmentId || index}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-[#333333] rounded px-2 transition-colors"
                    onClick={() => {
                      setSelectedEquipment((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== equipmentId)
                          : [...prev, equipmentId]
                      );
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by onClick
                      className="w-4 h-4 text-[#FDCE06] bg-[#292A2B] border-[#333333] rounded focus:ring-[#FDCE06] focus:ring-2"
                    />
                    <span className="text-[#E5E5E5] font-[Inter] text-[14px]">
                      {equipment.equipment_name ||
                        equipment.name ||
                        `Equipment ${equipmentId || index}`}
                      {equipment.category_name &&
                        equipment.category_name !== "N/A" &&
                        ` (${equipment.category_name})`}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-[#9CA3AF] font-[Inter] text-[14px] py-1">
                No equipment assigned to this client. Please assign equipment
                first.
              </div>
            )}
          </div>
          {errors.equipment && (
            <p className="text-red-500 text-sm mt-1 font-[Inter]">
              {errors.equipment}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Discount Type */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Discount Type
            </label>
            <div className="relative">
              <select
                value={formData.discountType}
                onChange={(e) =>
                  handleInputChange("discountType", e.target.value)
                }
                className="w-full h-[50px] bg-[#292A2B] border border-[#333333] rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 pr-10 outline-none appearance-none cursor-pointer focus:border-[#FDCE06] transition-colors"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount Off ($)</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
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

          {/* Discount Value */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Discount Value
            </label>
            <div className="relative">
              <span
                className={`absolute top-1/2 transform -translate-y-1/2 font-[Inter] text-[16px] text-[#9CA3AF] z-10 ${
                  formData.discountType === "fixed" ? "left-4" : "right-4"
                }`}
              >
                {formData.discountType === "percentage" ? "%" : "$"}
              </span>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) =>
                  handleInputChange("discountValue", e.target.value)
                }
                placeholder="0"
                step="0.01"
                min="0"
                max={formData.discountType === "percentage" ? "100" : undefined}
                className={`w-full h-[50px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] outline-none transition-colors ${
                  errors.discountValue
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#333333] focus:border-[#FDCE06]"
                } ${
                  formData.discountType === "fixed" ? "pl-8 pr-3" : "pl-3 pr-8"
                }`}
              />
            </div>
            {errors.discountValue && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.discountValue}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className={BTN.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={BTN.primary}
            >
              Apply to Equipment
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CustomPackageModal;
