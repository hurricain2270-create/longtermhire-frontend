// @ts-nocheck
import React from "react";

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const sanitized = typeof value === "string" ? value.replace(/,/g, "") : value;
  const number = Number(sanitized);
  if (Number.isNaN(number)) return "N/A";
  return number.toLocaleString("en-US");
};

function EquipmentDetailsModal({ isOpen, onClose, equipment, onEdit }) {
  if (!isOpen || !equipment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-xl">
            Equipment Details
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Equipment Images */}
            <div className="lg:col-span-1">
              <div className="bg-[#292A2B] border border-[#333333] rounded-lg p-4">
                {equipment.images && equipment.images.length > 0 ? (
                  <div className="space-y-4">
                    {/* Main Image */}
                    <div>
                      <img
                        src={
                          equipment.images.find((img) => img.is_main === 1)
                            ?.image_url || equipment.images[0]?.image_url
                        }
                        alt={equipment.equipment_name || equipment.name}
                        className="w-full h-64 object-cover rounded-md"
                        onError={(e) => {
                          e.target.src = "/images/graphview.png";
                        }}
                      />
                    </div>

                    {/* Image Gallery - Show additional images if available */}
                    {equipment.images.length > 1 && (
                      <div>
                        <h4 className="text-[#E5E5E5] font-[Inter] font-medium text-sm mb-2">
                          Additional Images ({equipment.images.length - 1})
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {equipment.images
                            .filter((img) => img.is_main === 0)
                            .slice(0, 6) // Show max 6 additional images
                            .map((image, index) => (
                              <div key={image.id || index} className="relative">
                                <img
                                  src={image.image_url}
                                  alt={
                                    image.caption ||
                                    `${equipment.equipment_name} - Image ${index + 1}`
                                  }
                                  className="w-full h-16 object-cover rounded-md"
                                  onError={(e) => {
                                    e.target.src = "/images/graphview.png";
                                  }}
                                />
                                {image.caption && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-md truncate">
                                    {image.caption}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : equipment.content_image ? (
                  <img
                    src={equipment.content_image}
                    alt={equipment.equipment_name || equipment.name}
                    className="w-full h-64 object-cover rounded-md"
                    onError={(e) => {
                      e.target.src = "/images/graphview.png";
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-[#1A1A1A] rounded-md">
                    <div className="text-center text-[#9CA3AF]">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mx-auto mb-3"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <circle
                          cx="8.5"
                          cy="8.5"
                          r="1.5"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M21 15L16 10L5 21"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p>No image available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Basic Information */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Equipment ID
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.equipment_id || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Equipment Name
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.equipment_name || equipment.name || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Category
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.category_name || equipment.category || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Position
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.position || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Availability Status
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${equipment.availability === 1 ||
                            equipment.status === "Available"
                            ? "bg-[rgba(34,197,94,0.2)] text-[#22C55E]"
                            : "bg-[rgba(239,68,68,0.2)] text-[#EF4444]"
                          }`}
                      >
                        {equipment.availability === 1 ||
                          equipment.status === "Available"
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Created Date
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.created_at
                        ? new Date(equipment.created_at).toLocaleDateString("en-AU")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Content */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                  Pricing Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Base Price
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      ${formatMoney(equipment.base_price)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Minimum Duration
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.minimum_duration || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Total Images
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {equipment.images ? equipment.images.length : 0} images
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                  Content Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Description
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-3 text-[#E5E5E5] min-h-[80px]">
                      {equipment.description || "No description available"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Banner Description
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-3 text-[#E5E5E5] min-h-[80px]">
                      {equipment.banner_description ||
                        "No banner description available"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#333333]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#292A2B] border border-[#333333] text-[#E5E5E5] rounded-md hover:bg-[#333333] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onEdit) {
                onEdit(equipment);
              }
            }}
            className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors font-bold"
          >
            Edit Equipment
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentDetailsModal;
