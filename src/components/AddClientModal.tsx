import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import Modal from "./Modal";
import { equipmentApi } from "../services/equipmentApi";
import { pricingApi } from "../services/pricingApi";

const AddClientModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    userName: "",
    password: "",
    equipment: [],
  });

  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);

  // Load equipment data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (isOpen) {
        setDataLoading(true);
        try {
          // Load equipment
          const equipmentResponse = await equipmentApi.getEquipment(1, 1000);
          setAvailableEquipment(equipmentResponse.data || []);
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setDataLoading(false);
        }
      }
    };

    loadData();
  }, [isOpen]);

  // Close equipment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEquipmentDropdown &&
        !event.target.closest(".equipment-dropdown")
      ) {
        setShowEquipmentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEquipmentDropdown]);

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

  // Handle equipment selection
  const handleEquipmentToggle = (equipmentId) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(equipmentId)
        ? prev.equipment.filter((id) => id !== equipmentId)
        : [...prev.equipment, equipmentId],
    }));
  };

  // Handle select all equipment
  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      equipment: availableEquipment.map((eq) => eq.id),
    }));
  };

  // Handle deselect all equipment
  const handleDeselectAll = () => {
    setFormData((prev) => ({
      ...prev,
      equipment: [],
    }));
  };

  // Get selected equipment names for display
  const getSelectedEquipmentNames = () => {
    if (formData.equipment.length === 0) return "Select Equipment";
    if (formData.equipment.length === 1) {
      const equipment = availableEquipment.find(
        (eq) => eq.id === formData.equipment[0]
      );
      return equipment ? equipment.equipment_name : "Select Equipment";
    }
    return `${formData.equipment.length} equipment selected`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data for API (send all fields)
    const clientData = {
      client_name: formData.clientName,
      company_name: formData.companyName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      username: formData.userName,
      password: formData.password,
      equipment: formData.equipment,
    };

    try {
      await onSubmit(clientData);
      // Reset form on success
      setFormData({
        clientName: "",
        companyName: "",
        email: "",
        phone: "",
        address: "",
        userName: "",
        password: "",
        equipment: [],
      });
    } catch (error) {
      // Error handling is done in parent component
      console.error("Form submission error:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setFormData({
      clientName: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      userName: "",
      password: "",
      equipment: [],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Client"
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

            {/* User Name Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                User Name
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                required
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 outline-none focus:border-[#FDCE06] transition-colors font-[Inter] text-base"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
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

          {/* Equipment Field (Full Width) */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Equipment
            </label>
            <div className="relative equipment-dropdown">
              <button
                type="button"
                className="w-full h-11 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 text-left outline-none hover:border-[#FDCE06] transition-colors flex items-center justify-between font-[Inter] text-base"
                onClick={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
              >
                <span>
                  {dataLoading
                    ? "Loading equipment..."
                    : getSelectedEquipmentNames()}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transform transition-transform ${showEquipmentDropdown ? "rotate-180" : ""}`}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {/* Equipment Dropdown */}
              {showEquipmentDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1F1F20] border border-[#333333] rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                  {availableEquipment.length > 0 ? (
                    <>
                      <div className="px-4 py-3 border-b border-[#333333] flex justify-between items-center sticky top-0 bg-[#1F1F20] z-10">
                        <span className="text-[#9CA3AF] text-xs">
                          {formData.equipment.length} selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[11px] px-2 py-1 border border-[#FDCE06] text-[#FDCE06] rounded hover:bg-[#FDCE06] hover:text-[#1F1F20] transition-colors"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="text-[11px] px-2 py-1 border border-[#9CA3AF] text-[#9CA3AF] rounded hover:bg-[#9CA3AF] hover:text-[#1F1F20] transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>

                      {availableEquipment.map((equipment) => (
                        <div
                          key={equipment.id}
                          className="flex items-center px-4 py-3 hover:bg-[#292A2B] cursor-pointer transition-colors"
                          onClick={() => handleEquipmentToggle(equipment.id)}
                        >
                          <input
                            type="checkbox"
                            checked={formData.equipment.includes(equipment.id)}
                            readOnly
                            className="mr-3 w-4 h-4 rounded accent-[#FDCE06]"
                          />
                          <div className="flex-1">
                            <div className="text-[#E5E5E5] text-sm font-medium">
                              {equipment.equipment_name}
                            </div>
                            <div className="text-[#9CA3AF] text-xs">
                              {equipment.category_name} • ${equipment.base_price}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-3 text-[#9CA3AF] text-center">
                      {dataLoading ? "Loading..." : "No equipment available"}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                  Sending...
                </>
              ) : (
                "Send Invite"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddClientModal;
