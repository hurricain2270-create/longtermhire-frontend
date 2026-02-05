import React, { useState, useEffect, useCallback } from "react";

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: any;
  formatCurrency: (amount: number) => string;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({
  isOpen,
  onClose,
  equipment,
  formatCurrency,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(3);

  // Parse images from equipment
  const getImages = () => {
    if (!equipment) return [];

    if (equipment.allImages && Array.isArray(equipment.allImages)) {
      return equipment.allImages;
    }

    if (equipment.content_images) {
      let images = [];
      if (typeof equipment.content_images === "string") {
        try {
          if (equipment.content_images.includes("|||")) {
            images = equipment.content_images
              .split("|||")
              .map((s: string) => JSON.parse(s));
          } else {
            const parsed = JSON.parse(equipment.content_images);
            images = Array.isArray(parsed) ? parsed : [parsed];
          }
        } catch (e) {
          images = [{ image_url: equipment.content_images }];
        }
      } else if (Array.isArray(equipment.content_images)) {
        images = equipment.content_images;
      }
      return images;
    }

    // Fallback to single image
    return [{ image_url: equipment.image_url || equipment.image }];
  };

  const images = getImages();

  // Navigation functions
  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const previousImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextImage();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextImage, previousImage, onClose]);

  // Reset image index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      setSelectedDuration(3);
    }
  }, [isOpen, equipment?.id]);

  // Get maintenance info
  const getMaintenanceInfo = () => {
    if (
      equipment?.maintenance_periods &&
      Array.isArray(equipment.maintenance_periods) &&
      equipment.maintenance_periods.length > 0
    ) {
      const today = new Date();
      const maintenance = equipment.maintenance_periods.find(
        (p: any) => new Date(p.end_date) >= today
      );

      if (maintenance) {
        const startDate = new Date(maintenance.start_date);
        const endDate = new Date(maintenance.end_date);
        return {
          start: startDate.toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          end: endDate.toLocaleDateString("en-AU", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
        };
      }
    }
    return null;
  };

  const maintenanceInfo = getMaintenanceInfo();

  // Get base price and calculate discounts
  const basePrice =
    parseFloat(equipment?.custom_base_price || equipment?.base_price) || 0;
  const discountValue =
    parseFloat(equipment?.discount || equipment?.discount_value) || 0;
  const discountType = equipment?.discount_type;
  const compoundingValue =
    parseFloat(
      equipment?.compounding_discount || equipment?.compounding_discount_value
    ) || 0;
  const compoundingType = equipment?.compounding_discount_type;

  const hasDiscount = discountValue > 0;
  const hasCompounding = compoundingValue > 0;

  // Calculate price based on duration and discounts (conforming to old logic)
  // OLD LOGIC: Apply compounding FIRST (from month 1), then package discount on total
  const compoundingDiscount = compoundingValue > 0 ? compoundingValue : 0;
  const compoundingDiscountType = compoundingType || "percentage";

  // Calculate compounding effect over duration (starting from month 1)
  let standardCompoundingCost = 0;
  let currentMonthPrice = basePrice;

  for (let month = 1; month <= selectedDuration; month++) {
    standardCompoundingCost += currentMonthPrice;
    // Apply compounding discount for next month (if compounding exists)
    if (compoundingDiscount > 0) {
      if (
        compoundingDiscountType === "%" ||
        compoundingDiscountType === "percentage"
      ) {
        currentMonthPrice = currentMonthPrice * (1 - compoundingDiscount / 100);
      } else {
        currentMonthPrice = Math.max(
          0,
          currentMonthPrice - compoundingDiscount
        );
      }
    }
  }

  // THEN apply package discount (base discount) on top of the compounding total
  let finalCost = standardCompoundingCost;
  if (discountValue > 0) {
    if (discountType === "%" || discountType === "percentage") {
      finalCost = standardCompoundingCost * (1 - discountValue / 100);
    } else {
      finalCost = Math.max(0, standardCompoundingCost - discountValue);
    }
  }

  const undiscountedTotal = basePrice * selectedDuration;
  const totalSavings = undiscountedTotal - finalCost;
  const monthlyAvgSavings = totalSavings / selectedDuration;

  // Calculate discounted price for display (first month after base discount)
  const discountedPrice =
    discountValue > 0
      ? discountType === "%" || discountType === "percentage"
        ? basePrice * (1 - discountValue / 100)
        : Math.max(0, basePrice - discountValue)
      : basePrice;
  const savings = basePrice - discountedPrice;

  if (!isOpen || !equipment) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1F1F20] border-2 border-[#333333] rounded-lg w-full max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#333333]">
          <h2 className="text-[#E5E5E5] text-xl font-bold">
            {equipment.equipment_name || equipment.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
            aria-label="Close modal"
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Image + Pricing */}
            <div className="space-y-4">
              {/* Main Image Display with 4:3 Aspect Ratio */}
              <div className="relative bg-[#2A2A2B] rounded-lg overflow-hidden aspect-[4/3] border-2 border-[#333333]">
                {/* Placeholder X pattern */}
                <svg
                  className="w-full h-full absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    stroke="#444444"
                    strokeWidth="1"
                  />
                  <line
                    x1="100"
                    y1="0"
                    x2="0"
                    y2="100"
                    stroke="#444444"
                    strokeWidth="1"
                  />
                </svg>

                {/* Main Image */}
                <img
                  src={
                    images[currentImageIndex]?.image_url ||
                    equipment.image_url ||
                    equipment.image
                  }
                  alt={`${equipment.equipment_name || equipment.name} - Image ${currentImageIndex + 1}`}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
                  onError={(e: any) => {
                    e.target.style.opacity = "0";
                  }}
                  onLoad={(e: any) => {
                    e.target.style.opacity = "1";
                  }}
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={previousImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                      aria-label="Previous image"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M15 18l-6-6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                      aria-label="Next image"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Very Small Thumbnail Carousel - Below Big Image */}
              {images.length > 1 && (
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-10 h-10 rounded border transition-all overflow-hidden ${index === currentImageIndex
                          ? "border-[#FDCE06] ring-1 ring-[#FDCE06]"
                          : "border-[#333333] hover:border-[#9CA3AF]"
                        }`}
                    >
                      <img
                        src={img.image_url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.src = "/images/graphview.png";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Availability - Only show for unavailable equipment */}
              {(() => {
                const isUnavailable =
                  equipment.status === "Unavailable" ||
                  equipment.status === "Booked" ||
                  equipment.availability === 0;

                if (!isUnavailable) return null;

                let date = null;
                if (equipment.unavailability_due_month) {
                  date = new Date(equipment.unavailability_due_month);
                  // If invalid date, use next month instead
                  if (isNaN(date.getTime())) {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    date = nextMonth;
                  }
                } else {
                  // If no date provided but equipment is unavailable, show next month
                  const nextMonth = new Date();
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  date = nextMonth;
                }

                return (
                  <div className="text-[#10B981] text-sm font-semibold">
                    Available{" "}
                    {date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                );
              })()}

              {/* Price Section */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#9CA3AF] text-sm">Base Price:</span>
                  <span
                    className={`text-lg font-bold ${hasDiscount ? "line-through text-[#6B7280]" : "text-[#E5E5E5]"}`}
                  >
                    {formatCurrency(basePrice)}
                  </span>
                </div>

                {hasDiscount && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#9CA3AF] text-sm">
                      After Discount:
                    </span>
                    <span className="text-[#E5E5E5] text-lg font-bold">
                      {formatCurrency(discountedPrice)}
                    </span>
                    <span className="text-[#10B981] text-sm font-semibold">
                      (Save {formatCurrency(savings)})
                    </span>
                  </div>
                )}

                {hasCompounding && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#333333]">
                    <span className="text-[#9CA3AF] text-sm">
                      Total for {selectedDuration} month
                      {selectedDuration > 1 ? "s" : ""}:
                    </span>
                    <span className="text-[#E5E5E5] text-lg font-bold">
                      {formatCurrency(finalCost)}
                    </span>
                  </div>
                )}
              </div>

              {/* Savings per month slider */}
              {hasCompounding && (
                <div className="space-y-2 pt-2 border-t border-[#333333]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#E5E5E5] text-sm font-semibold">
                      Savings per month:
                    </span>
                    <span className="text-[#10B981] text-sm font-bold">
                      -{formatCurrency(monthlyAvgSavings)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={selectedDuration}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedDuration(parseInt(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-1 bg-[#333333] appearance-none cursor-pointer slider"
                      style={{
                        background: "#333333",
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className="text-[#9CA3AF] text-sm">
                      {selectedDuration} month{selectedDuration > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Description + Maintenance */}
            <div className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[#E5E5E5] text-sm font-bold">Description</h4>
                <div
                  className="text-[#9CA3AF] text-sm leading-relaxed prose prose-invert max-w-none"
                  style={{
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      equipment.description ||
                      equipment.content_description ||
                      "No description available",
                  }}
                />
              </div>

              {/* Banner Description */}
              {equipment.banner_description && (
                <div className="space-y-2 pt-2 border-t border-[#333333]">
                  <h4 className="text-[#FDCE06] text-sm font-bold">
                    Banner Description
                  </h4>
                  <div className="text-[#E5E5E5] text-sm italic leading-relaxed">
                    {equipment.banner_description}
                  </div>
                </div>
              )}

              {/* Maintenance Schedule */}
              {maintenanceInfo && (
                <div className="space-y-2">
                  <h4 className="text-[#E5E5E5] text-sm font-bold">
                    Maintenance Schedule
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="text-[#9CA3AF]">
                      From {maintenanceInfo.start} to {maintenanceInfo.end}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional maintenance periods */}
              {equipment?.maintenance_periods &&
                equipment.maintenance_periods.length > 1 && (
                  <div className="space-y-1 text-xs">
                    {equipment.maintenance_periods
                      .slice(1)
                      .map((period: any, index: number) => {
                        const start = new Date(
                          period.start_date
                        ).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        });
                        const end = new Date(
                          period.end_date
                        ).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        });
                        return (
                          <div key={index} className="text-[#9CA3AF]">
                            From {start} to {end}
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
