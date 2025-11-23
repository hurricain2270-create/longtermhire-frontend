// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import SimpleRichTextEditor from "./components/SimpleRichTextEditor";
import { equipmentApi } from "./services/equipmentApi";

const EquipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    equipmentName: "",
    categoryId: "",
    categoryName: "",
    equipmentId: "",
    basePrice: "",
    minimumDuration: "3",
    description: "",
    availability: true,
    availabilityMonth: "",
    availableFrom: "",
    availableTo: "",
    maintenancePeriods: [],
    specsFiles: [],
  });

  useEffect(() => {
    if (id) {
      loadEquipmentDetails();
    }
  }, [id]);

  const loadEquipmentDetails = async () => {
    try {
      setLoading(true);
      const response = await equipmentApi.getEquipmentById(id);
      if (response && !response.error) {
        const equipment = response.data;
        // Parse minimum_duration (format: "3 Months" -> "3")
        const minDuration = equipment.minimum_duration
          ? equipment.minimum_duration.toString().replace(/\s*Months?/i, "").trim()
          : "3";

        setFormData({
          equipmentName: equipment.equipment_name || "",
          categoryId: equipment.category_id || "",
          categoryName: equipment.category_name || "",
          equipmentId: equipment.equipment_id || "",
          basePrice: equipment.base_price?.toString() || "",
          minimumDuration: minDuration,
          description: equipment.description || "",
          availability: equipment.availability === 1 || equipment.availability === true,
          availabilityMonth: equipment.unavailability_due_month || equipment.availability_month || getNextMonth(),
          availableFrom: equipment.available_from || "",
          availableTo: equipment.available_to || "",
          maintenancePeriods: equipment.maintenance_periods || [],
          specsFiles: equipment.specs_files ? JSON.parse(equipment.specs_files) : [],
        });
      } else {
        toast.error(response?.message || "Failed to load equipment details");
      }
    } catch (error) {
      console.error("Error loading equipment:", error);
      toast.error(error.message || "Failed to load equipment details");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvailabilityToggle = () => {
    setFormData((prev) => ({
      ...prev,
      availability: !prev.availability,
    }));
  };

  const handleDescriptionChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const handleMinimumDurationChange = (delta) => {
    const currentValue = parseInt(formData.minimumDuration) || 0;
    const newValue = Math.max(0, currentValue + delta);
    setFormData((prev) => ({
      ...prev,
      minimumDuration: newValue.toString(),
    }));
  };

  const getNextMonth = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getNext12Months = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      date.setMonth(date.getMonth() + 1);
      months.push(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    return months;
  };

  const handleSpecsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await equipmentApi.uploadFile(file);
      if (response && response.url) {
        setFormData((prev) => ({
          ...prev,
          specsFiles: [...(prev.specsFiles || []), response.url],
        }));
        toast.success("Specs uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading specs:", error);
      toast.error("Failed to upload specs");
    }
  };

  const handleRemoveSpec = (index) => {
    setFormData((prev) => ({
      ...prev,
      specsFiles: prev.specsFiles.filter((_, i) => i !== index),
    }));
  };

  const handleAddMaintenancePeriod = () => {
    setFormData((prev) => ({
      ...prev,
      maintenancePeriods: [
        ...prev.maintenancePeriods,
        { start_date: "", end_date: "" },
      ],
    }));
  };

  const handleRemoveMaintenancePeriod = (index) => {
    setFormData((prev) => ({
      ...prev,
      maintenancePeriods: prev.maintenancePeriods.filter((_, i) => i !== index),
    }));
  };

  const handleMaintenancePeriodChange = (index, field, value) => {
    setFormData((prev) => {
      const newPeriods = [...prev.maintenancePeriods];
      newPeriods[index] = { ...newPeriods[index], [field]: value };
      return { ...prev, maintenancePeriods: newPeriods };
    });
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.equipmentName || !formData.basePrice) {
        toast.error("Please fill in all required fields");
        return;
      }

      setSaving(true);

      // Format minimum duration as "X Months"
      const minDurationFormatted = formData.minimumDuration
        ? `${formData.minimumDuration} Months`
        : "3 Months";

      const data = {
        equipment_name: formData.equipmentName,
        category_id: formData.categoryId,
        category_name: formData.categoryName,
        equipment_id: formData.equipmentId,
        base_price: parseFloat(formData.basePrice) || 0,
        minimum_duration: minDurationFormatted,
        description: formData.description || "",
        availability: formData.availability ? 1 : 0,
        availability: formData.availability ? 1 : 0,
        unavailability_due_month: formData.availabilityMonth || getNextMonth(),
        available_from: null, // Deprecated
        available_to: null, // Deprecated
        maintenance_periods: formData.maintenancePeriods.filter(p => p.start_date && p.end_date),
        specs_files: formData.specsFiles || [],
      };

      const response = await equipmentApi.updateEquipment(id, data);

      if (!response.error) {
        toast.success("Equipment updated successfully!");
      } else {
        toast.error(response.message || "Failed to save equipment");
      }
    } catch (error) {
      console.error("Error saving equipment:", error);
      toast.error(error.message || "Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#292A2B]">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <div className="text-[#E5E5E5] font-[Inter] mt-4">
            Loading equipment details...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate("/equipment-management")}
          className="text-[#9CA3AF] hover:text-[#FDCE06] transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px]">
          *{formData.equipmentName || "Equipment Name"}
        </h1>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl space-y-6">
        {/* Equipment Info Section */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <div className="text-[#9CA3AF] font-[Inter] text-sm mb-1">
                Category ID:{formData.categoryId || "001"}
              </div>
              <div className="text-[#E5E5E5] font-[Inter] text-base">
                Category Name: {formData.categoryName || "Excavator"}
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div className="text-[#9CA3AF] font-[Inter] text-sm mb-1">
                Equipment ID: {formData.equipmentId || "E001"}
              </div>
              <div className="text-[#E5E5E5] font-[Inter] text-base mb-2">
                Equipment Name: {formData.equipmentName || "CAT 3200D"}
              </div>
              <div className="text-[#E5E5E5] font-[Inter] text-sm">
                Base Price: {formData.basePrice || "12000"}
              </div>
            </div>
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
            Availability
          </h3>

          {/* Available Toggle */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <label className="text-[#E5E5E5] font-[Inter] text-sm">
                Available:
              </label>
              <div
                onClick={handleAvailabilityToggle}
                className={`rounded-full transition-colors cursor-pointer ${formData.availability ? "bg-[#4CAF50]" : "bg-[#4A5568]"
                  }`}
                style={{ width: "50px", height: "26px", position: "relative" }}
              >
                <div
                  className="absolute bg-[#FFFFFF] rounded-full transition-all duration-200"
                  style={{
                    width: "18px",
                    height: "18px",
                    left: formData.availability ? "28px" : "4px",
                    top: "4px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Availability Dropdown */}
          <div className="mb-4 flex items-center justify-between">
            <label className="block text-[#E5E5E5] font-[Inter] text-sm">
              Availability
            </label>
            <select
              name="availabilityMonth"
              value={formData.availabilityMonth}
              onChange={handleInputChange}
              disabled={formData.availability}
              className={`w-48 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none transition-colors ${formData.availability ? "opacity-50 cursor-not-allowed" : "focus:border-[#FDCE06]"
                }`}
            >
              {getNext12Months().map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Down for Maintenance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[#E5E5E5] font-[Inter] text-sm">
                Down for Maintenance:
              </label>
              <button
                type="button"
                onClick={handleAddMaintenancePeriod}
                className="text-[#FDCE06] text-sm hover:text-[#E5B800] transition-colors"
              >
                + Add Period
              </button>
            </div>

            <div className="space-y-3">
              {formData.maintenancePeriods.map((period, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 bg-[#292A2B] p-3 rounded-md border border-[#333333]">
                  <div className="flex items-center gap-2">
                    <label className="text-[#9CA3AF] text-sm">From</label>
                    <input
                      type="date"
                      value={period.start_date ? period.start_date.split('T')[0] : ""}
                      onChange={(e) => handleMaintenancePeriodChange(index, "start_date", e.target.value)}
                      className="bg-[#1F1F20] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06] transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[#9CA3AF] text-sm">To</label>
                    <input
                      type="date"
                      value={period.end_date ? period.end_date.split('T')[0] : ""}
                      onChange={(e) => handleMaintenancePeriodChange(index, "end_date", e.target.value)}
                      className="bg-[#1F1F20] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMaintenancePeriod(index)}
                      className="p-2 text-[#EF4444] hover:text-[#DC2626] transition-colors ml-2"
                      title="Remove Period"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {formData.maintenancePeriods.length === 0 && (
                <div className="text-[#9CA3AF] text-sm italic">
                  No maintenance periods set.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minimum Hire Duration */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
            Minimum Hire Duration
          </h3>
          <div className="flex items-center gap-3">
            <label className="text-[#E5E5E5] font-[Inter] text-sm">Months</label>
            <div className="relative flex items-center">
              <input
                type="number"
                name="minimumDuration"
                value={formData.minimumDuration}
                onChange={handleInputChange}
                className="w-24 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 pr-10 outline-none focus:border-[#FDCE06] transition-colors"
              />
              <div className="absolute right-2 flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMinimumDurationChange(1)}
                  className="text-[#9CA3AF] hover:text-[#FDCE06] transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9V3M3 6l3-3 3 3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMinimumDurationChange(-1)}
                  className="text-[#9CA3AF] hover:text-[#FDCE06] transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 3v6M9 6l-3 3-3-3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl mb-6">
            Description
          </h3>
          <SimpleRichTextEditor
            value={formData.description}
            onChange={handleDescriptionChange}
            height={200}
          />
        </div>

        {/* Specification Document */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
              Specification Document
            </h3>
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.click();
              }}
              className="p-2 bg-[#333333] hover:bg-[#404040] border border-[#333333] rounded-md transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#E5E5E5]"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* Upload Specification Document */}
            <div>
              <label className="block text-[#E5E5E5] font-[Inter] text-sm mb-2">
                Upload Specification Document
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id="spec-doc-upload"
                  onChange={handleSpecsUpload}
                />
                <label
                  htmlFor="spec-doc-upload"
                  className="flex-1 bg-[#292A2B] border border-[#333333] rounded-md text-[#9CA3AF] px-4 py-2 text-sm cursor-pointer hover:border-[#FDCE06] transition-colors flex items-center justify-between"
                >
                  <span className="truncate max-w-[200px]">
                    {formData.specsFile ? formData.specsFile.split("/").pop() : "Upload PDF"}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </label>
                {formData.specsFile && (
                  <a
                    href={formData.specsFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#FDCE06] hover:text-[#E5B800] transition-colors"
                    title="View Document"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Specs Files List */}
            {formData.specsFiles && formData.specsFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                {formData.specsFiles.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-[#292A2B] border border-[#333333] rounded-md p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span className="text-[#E5E5E5] text-sm truncate">
                        {url.split("/").pop()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#FDCE06] hover:text-[#E5B800] transition-colors"
                        title="View Document"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(index)}
                        className="p-2 text-[#EF4444] hover:text-[#DC2626] transition-colors"
                        title="Remove Document"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}


          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FDCE06] text-[#1F1F20] px-8 py-3 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <ClipLoader size={16} color="#1F1F20" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetails;
