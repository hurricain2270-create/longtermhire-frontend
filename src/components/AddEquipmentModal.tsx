// @ts-nocheck
import { useState } from "react";
import Modal from "./Modal";

const AddEquipmentModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    category: "",
    equipmentName: "",
    basePrice: "",
    minimumDuration: "3",
    position: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([
    "Excavators",
    "Cranes",
    "Loaders",
    "Bobcats",
    "Backhoes",
  ]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleAddCategory = () => {
    setShowAddCategory(true);
  };

  const handleSaveNewCategory = () => {
    if (newCategoryName.trim()) {
      // Check if category already exists (case-insensitive)
      const categoryExists = categories.some(
        (cat) => cat.toLowerCase() === newCategoryName.trim().toLowerCase()
      );

      if (!categoryExists) {
        const updatedCategories = [...categories, newCategoryName.trim()];
        setCategories(updatedCategories);
        setFormData((prev) => ({
          ...prev,
          category: newCategoryName.trim(),
        }));
      }

      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  const handleCancelAddCategory = () => {
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleDurationChange = (operation) => {
    const currentValue = parseInt(formData.minimumDuration) || 0;
    if (operation === "increment") {
      setFormData((prev) => ({
        ...prev,
        minimumDuration: (currentValue + 1).toString(),
      }));
    } else if (operation === "decrement" && currentValue > 1) {
      setFormData((prev) => ({
        ...prev,
        minimumDuration: (currentValue - 1).toString(),
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.equipmentName.trim()) {
      newErrors.equipmentName = "Equipment name is required";
    }
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      newErrors.basePrice = "Please enter a valid base price";
    }
    if (!formData.position || parseInt(formData.position) <= 0) {
      newErrors.position = "Please enter a valid position number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      ...formData,
      availability: true,
      // equipmentId intentionally omitted — backend auto-generates it
      // using the category's first letter + sequential number (e.g. E001, S001)
    });

    // Reset form only on successful submission
    setFormData({
      category: "",
      equipmentName: "",
      basePrice: "",
      minimumDuration: "3",
      position: "",
      description: "",
    });
    setErrors({});
    setShowAddCategory(false);
    setNewCategoryName("");
  };

  const handleCancel = () => {
    // Don't clear form data when canceling - preserve user input
    setErrors({});
    setShowAddCategory(false);
    setNewCategoryName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Equipment"
      width="min(700px, 95vw)"
    >
      <div className="space-y-6">
        {/* Description */}
        <p className="text-[#9CA3AF] font-[Inter] text-[16px] leading-[24px] -mt-2">
          Add new equipment to your rental inventory with pricing and
          availability settings.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Category *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setIsDropdownOpen(false)}
                  className={`w-full h-[46px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 pr-10 outline-none appearance-none cursor-pointer transition-colors ${
                    errors.category
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#333333] focus:border-[#FDCE06]"
                  }`}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {/* <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    width="15"
                    height="9"
                    viewBox="0 0 15 9"
                    fill="none"
                    className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : "rotate-0"}`}
                  >
                    <path d="M7.5 0L15 9L0 9L7.5 0Z" fill="#E5E5E5" />
                  </svg>
                </div> */}
              </div>
              <button
                type="button"
                onClick={handleAddCategory}
                className="w-[44px] h-[44px] bg-[#333333] hover:bg-[#404040] border-none rounded-[6px] cursor-pointer flex items-center justify-center transition-colors"
                title="Add new category"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1V15M1 8H15"
                    stroke="#E5E5E5"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.category}
              </p>
            )}

            {/* Add Category Input */}
            {showAddCategory && (
              <div className="mt-3 p-3 bg-[#1A1A1A] border border-[#333333] rounded-[6px]">
                <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[12px] leading-[16px] mb-2">
                  New Category Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="flex-1 h-[36px] bg-[#292A2B] border border-[#333333] rounded-[4px] text-[#E5E5E5] text-[14px] font-[Inter] px-3 outline-none focus:border-[#FDCE06] transition-colors"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSaveNewCategory()
                    }
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewCategory}
                    className="px-3 py-1 bg-[#FDCE06] text-[#000000] text-[12px] font-bold rounded-[4px] hover:bg-[#E5B800] transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAddCategory}
                    className="px-3 py-1 bg-[#6B7280] text-[#E5E5E5] text-[12px] font-bold rounded-[4px] hover:bg-[#4B5563] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equipment Name Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Equipment Name *
            </label>
            <input
              type="text"
              value={formData.equipmentName}
              onChange={(e) =>
                handleInputChange("equipmentName", e.target.value)
              }
              placeholder="e.g., CAT 320 Excavator"
              className={`w-full h-[46px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 outline-none transition-colors ${
                errors.equipmentName
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#333333] focus:border-[#FDCE06]"
              }`}
            />
            {errors.equipmentName && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.equipmentName}
              </p>
            )}
          </div>

          {/* Base Price Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Base Price (per month) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] text-[16px] font-[Inter]">
                $
              </span>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) => handleInputChange("basePrice", e.target.value)}
                placeholder="0"
                step="1"
                min="0"
                className={`w-full h-[46px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] pl-8 pr-3 outline-none transition-colors ${
                  errors.basePrice
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#333333] focus:border-[#FDCE06]"
                }`}
              />
            </div>
            {errors.basePrice && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.basePrice}
              </p>
            )}
          </div>

          {/* Minimum Hire Duration Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Minimum Hire Duration
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="number"
                  value={formData.minimumDuration}
                  onChange={(e) =>
                    handleInputChange("minimumDuration", e.target.value)
                  }
                  min="1"
                  className="w-[96px] h-[46px] bg-[#292A2B] border border-[#333333] rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] text-center outline-none focus:border-[#FDCE06] transition-colors"
                />
                <div className="absolute right-2 top-2 flex flex-col gap-0">
                  <button
                    type="button"
                    onClick={() => handleDurationChange("increment")}
                    className="w-[7.5px] h-[16px] bg-none border-none cursor-pointer p-0 flex items-center justify-center hover:opacity-70"
                  >
                    <svg
                      width="7.5"
                      height="4.5"
                      viewBox="0 0 7.5 4.5"
                      fill="none"
                    >
                      <path d="M0 4.5L7.5 0L0 4.5Z" fill="#9CA3AF" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDurationChange("decrement")}
                    className="w-[7.5px] h-[16px] bg-none border-none cursor-pointer p-0 flex items-center justify-center hover:opacity-70"
                  >
                    <svg
                      width="7.5"
                      height="4.5"
                      viewBox="0 0 7.5 4.5"
                      fill="none"
                    >
                      <path d="M7.5 0L0 4.5L7.5 0Z" fill="#9CA3AF" />
                    </svg>
                  </button>
                </div>
              </div>
              <span className="text-[#D1D5DB] text-[16px] font-[Inter]">
                Months
              </span>
            </div>
          </div>

          {/* Position Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Position Number *
            </label>
            <input
              type="number"
              value={formData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              placeholder="Enter position number"
              min="1"
              className={`w-full h-[46px] bg-[#292A2B] border rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 outline-none transition-colors ${
                errors.position
                  ? "border-red-500 focus:border-red-500"
                  : "border-[#333333] focus:border-[#FDCE06]"
              }`}
            />
            {errors.position && (
              <p className="text-red-500 text-sm mt-1 font-[Inter]">
                {errors.position}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-[#D1D5DB] font-[Inter] font-medium text-[14px] leading-[20px] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter equipment description..."
              rows={5}
              className="w-full bg-[#292A2B] border border-[#333333] rounded-[6px] text-[#E5E5E5] text-[16px] font-[Inter] px-3 py-3 outline-none focus:border-[#FDCE06] transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-[#333333] hover:bg-[#404040] border-none rounded-[6px] text-white font-[Inter] font-bold text-[16px] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#FDCE06] hover:bg-[#E5B800] border-none rounded-[6px] text-[#1F1F20] font-[Inter] font-bold text-[16px] cursor-pointer transition-colors"
            >
              Add Equipment
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddEquipmentModal;
