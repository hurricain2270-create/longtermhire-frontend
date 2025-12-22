// @ts-nocheck
import React from "react";

function ContentDetailsModal({ isOpen, onClose, content, onEdit }) {
  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-xl">
            Content Details
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
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
                      {content.equipment_id ||
                        content.equipment?.equipment_id ||
                        "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Equipment Name
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {content.equipment_name || "N/A"}
                    </div>
                  </div>

                  {/* <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Category
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {content.category_name || "N/A"}
                    </div>
                  </div> */}

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Content ID
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {content.id || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Created Date
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {content.created_at
                        ? new Date(content.created_at).toLocaleDateString("en-AU")
                        : "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Last Updated
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-2 text-[#E5E5E5]">
                      {content.updated_at
                        ? new Date(content.updated_at).toLocaleDateString("en-AU")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Content Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                  Content Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Description
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-3 text-[#E5E5E5] min-h-[100px]">
                      {content.description || "No description available"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Banner Description
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md px-3 py-3 text-[#E5E5E5] min-h-[100px]">
                      {content.banner_description ||
                        "No banner description available"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-1">
                      Images (
                      {content.images && Array.isArray(content.images)
                        ? content.images.length
                        : content.image_url
                          ? 1
                          : 0}
                      )
                    </label>
                    <div className="bg-[#292A2B] border border-[#333333] rounded-md p-3">
                      {content.images &&
                        Array.isArray(content.images) &&
                        content.images.length > 0 ? (
                        <div className="space-y-4">
                          {/* Main Image Display */}
                          {(() => {
                            const mainImage = content.images.find(
                              (img) => img.is_main === 1 || img.is_main === true
                            );
                            const displayImage = mainImage || content.images[0];
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[#E5E5E5] font-medium text-sm">
                                    Main Image:
                                  </span>
                                  {mainImage && (
                                    <span className="bg-[#FDCE06] text-[#1A1A1A] px-2 py-1 rounded text-xs font-medium">
                                      Main
                                    </span>
                                  )}
                                </div>
                                <img
                                  src={displayImage.image_url}
                                  alt={
                                    displayImage.caption ||
                                    content.equipment_name
                                  }
                                  className="w-full h-48 object-cover rounded-md"
                                  onError={(e) => {
                                    e.target.src = "/images/graphview.png";
                                  }}
                                />
                                {displayImage.caption && (
                                  <div className="text-[#9CA3AF] text-sm">
                                    Caption: {displayImage.caption}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* All Images Grid */}
                          {content.images.length > 1 && (
                            <div className="space-y-2">
                              <span className="text-[#E5E5E5] font-medium text-sm">
                                All Images:
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {content.images.map((image, index) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={image.image_url}
                                      alt={
                                        image.caption || `Image ${index + 1}`
                                      }
                                      className="w-full h-20 object-cover rounded-md border border-[#333333]"
                                      onError={(e) => {
                                        e.target.src = "/images/graphview.png";
                                      }}
                                    />
                                    {(image.is_main === 1 ||
                                      image.is_main === true) && (
                                        <div className="absolute top-1 left-1 w-5 h-5 bg-[#FDCE06] rounded-full flex items-center justify-center">
                                          <svg
                                            className="w-3 h-3 text-[#1A1A1A]"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      )}
                                    {image.caption && (
                                      <div
                                        className="text-[#9CA3AF] text-xs mt-1 truncate"
                                        title={image.caption}
                                      >
                                        {image.caption}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : content.image_url ? (
                        <div className="space-y-3">
                          <img
                            src={content.image_url}
                            alt={content.equipment_name}
                            className="w-full h-48 object-cover rounded-md"
                            onError={(e) => {
                              e.target.src = "/images/graphview.png";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 bg-[#1A1A1A] rounded-md">
                          <div className="text-center text-[#9CA3AF]">
                            <svg
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="mx-auto mb-2"
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
                onEdit(content);
              }
            }}
            className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors font-bold"
          >
            Edit Content
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContentDetailsModal;
