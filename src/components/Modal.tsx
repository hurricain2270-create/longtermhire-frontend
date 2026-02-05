import React, { useEffect } from "react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = "672px",
  height = "auto",
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative bg-[#1F1F20] border border-[#333333] rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full"
        style={{
          maxWidth: width,
          height: height,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-8 pb-0">
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-[#E5E5E5]"
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: "36px",
                lineHeight: "40px",
              }}
            >
              {title}
            </h2>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors p-1"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-8 pb-8">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
