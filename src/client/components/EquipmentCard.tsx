import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import SpecModal from "./SpecModal";
import QuoteModal from "./QuoteModal";

interface EquipmentCardProps {
    equipment: any;
    onQuickView: () => void;
    onRequest: (equipment: any) => void;
    requestLoading: boolean;
    selectedImageIndex: number;
    onImageSelect: (equipmentId: number, imageIndex: number) => void;
    formatCurrency: (amount: number) => string;
    handleImageLoad: (url: string) => void;
    imageObjectFit: Record<string, string>;
    userRole?: string;
}



const EquipmentCard: React.FC<EquipmentCardProps> = ({
    equipment,
    onQuickView,
    onRequest,
    requestLoading,
    selectedImageIndex,
    onImageSelect,
    formatCurrency,
    handleImageLoad,
    imageObjectFit,
    userRole = "member", // Default to member if not provided
}) => {
    // Local state for duration slider
    const [selectedDuration, setSelectedDuration] = useState(3);
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [savingsPerMonth, setSavingsPerMonth] = useState(0);

    // Modal states
    const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

    const isSupervisor = userRole === "Supervisor";

    // Robust check for discount values
    const basePrice = parseFloat(equipment.custom_base_price || equipment.base_price) || 0;
    const discountValue = parseFloat(equipment.discount || equipment.discount_value) || 0;
    const discountType = equipment.discount_type;
    const compoundingValue = parseFloat(equipment.compounding_discount || equipment.compounding_discount_value) || 0;
    const compoundingType = equipment.compounding_discount_type;

    const hasDiscount = discountValue > 0;
    const hasCompounding = compoundingValue > 0;

    // Calculate price based on duration and discounts
    useEffect(() => {
        if (isSupervisor) return; // Skip calculation for supervisor

        let totalCost = 0;
        let totalSavings = 0;
        let monthlyAvgSavings = 0;

        // Calculate initial discounted price (base discount)
        let initialPrice = basePrice;
        if (discountValue > 0) {
            if (discountType === "%") {
                initialPrice = basePrice * (1 - discountValue / 100);
            } else {
                initialPrice = Math.max(0, basePrice - discountValue);
            }
        }

        // Calculate compounding effect over duration
        let currentMonthPrice = initialPrice;
        for (let month = 1; month <= selectedDuration; month++) {
            // Apply compounding discount for months > 1
            if (month > 1 && compoundingValue > 0) {
                if (compoundingType === "%") {
                    currentMonthPrice = currentMonthPrice * (1 - compoundingValue / 100);
                } else {
                    currentMonthPrice = Math.max(0, currentMonthPrice - compoundingValue);
                }
            }
            totalCost += currentMonthPrice;
        }

        const undiscountedTotal = basePrice * selectedDuration;
        totalSavings = undiscountedTotal - totalCost;
        monthlyAvgSavings = totalSavings / selectedDuration;

        setCalculatedPrice(totalCost);
        setTotalDiscount(totalSavings);
        setSavingsPerMonth(monthlyAvgSavings);
    }, [selectedDuration, equipment, basePrice, discountValue, discountType, compoundingValue, compoundingType, isSupervisor]);

    const getMainImageSrc = () => {
        if (equipment.content_images) {
            // Parse if string, otherwise use as is
            let images = [];
            if (typeof equipment.content_images === 'string') {
                try {
                    if (equipment.content_images.includes('|||')) {
                        images = equipment.content_images.split('|||').map((s: string) => JSON.parse(s));
                    } else {
                        try {
                            const parsed = JSON.parse(equipment.content_images);
                            images = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            images = [{ image_url: equipment.content_images }];
                        }
                    }
                } catch (e) {
                    console.error("Error parsing images", e);
                }
            } else if (Array.isArray(equipment.content_images)) {
                images = equipment.content_images;
            }

            if (images.length > 0) {
                return images[selectedImageIndex]?.image_url || equipment.image_url || equipment.image;
            }
        }
        return equipment.image_url || equipment.image; // Fallback
    };

    // Get availability date string
    const getAvailabilityText = () => {
        if (equipment.unavailability_due_month) {
            // If it's a full date string, format it
            const date = new Date(equipment.unavailability_due_month);
            if (!isNaN(date.getTime())) {
                return `Available ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }
            return `Available ${equipment.unavailability_due_month}`;
        }
        // Do not show "Available Now" for available items
        return null;
    };

    // Get maintenance date string and days until
    const getMaintenanceInfo = () => {
        if (equipment.maintenance_periods && Array.isArray(equipment.maintenance_periods) && equipment.maintenance_periods.length > 0) {
            const today = new Date();
            // Find current or next maintenance
            const maintenance = equipment.maintenance_periods
                .find((p: any) => new Date(p.end_date) >= today);

            if (maintenance) {
                const startDate = new Date(maintenance.start_date);
                const timeDiff = startDate.getTime() - today.getTime();
                const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

                return {
                    text: `Maintenance ${startDate.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}`,
                    daysUntil: daysUntil > 0 ? daysUntil : 0,
                    isActive: daysUntil <= 0 && new Date(maintenance.end_date) >= today
                };
            }
        }
        return null;
    };

    // Calculate discounted price (Base Discount)
    const getDiscountedPrice = () => {
        if (hasDiscount) {
            if (discountType === "%" || discountType === "percentage") {
                return basePrice * (1 - discountValue / 100);
            } else {
                return Math.max(0, basePrice - discountValue);
            }
        }
        return basePrice;
    };

    const discountedPrice = getDiscountedPrice();
    const savings = basePrice - discountedPrice;

    const availabilityText = getAvailabilityText();
    const maintenanceInfo = getMaintenanceInfo();
    const isUnavailable = equipment.status === "Unavailable" || equipment.status === "Booked" || equipment.status === "Maintenance";

    return (
        <>
            <div
                className="bg-[#1F1F20] border-2 border-[#333333] rounded-lg w-[280px] min-h-[420px] flex flex-col cursor-pointer hover:shadow-lg hover:border-[#FDCE06] transition-all"
                onClick={onQuickView}
            >
                {/* Image Section */}
                <div className="border-b-2 border-[#333333] p-6">
                    <div className="w-full h-[160px] bg-[#2A2A2B] flex items-center justify-center relative rounded">
                        {/* Placeholder X pattern */}
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100" y2="100" stroke="#444444" strokeWidth="1" />
                            <line x1="100" y1="0" x2="0" y2="100" stroke="#444444" strokeWidth="1" />
                        </svg>
                        {/* Actual image overlay */}
                        <img
                            src={getMainImageSrc()}
                            alt={equipment.equipment_name || equipment.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 rounded"
                            onError={(e: any) => {
                                e.target.style.opacity = "0";
                            }}
                            onLoad={(e: any) => {
                                e.target.style.opacity = "1";
                            }}
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1">
                    {/* Equipment Name */}
                    <h3 className="text-[#E5E5E5] text-base font-bold mb-2">
                        {equipment.equipment_name || equipment.name}
                    </h3>

                    {/* Description - 2 lines with ellipsis */}
                    <div
                        className="text-[#9CA3AF] text-sm mb-4 line-clamp-2 overflow-hidden"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.5em',
                            height: '3em',
                            minHeight: '3em'
                        }}
                        dangerouslySetInnerHTML={{
                            __html: equipment.description || equipment.content_description || "No description available"
                        }}
                    />

                    {/* Pricing & Status Section */}
                    <div className="mb-4">
                        {isSupervisor ? (
                            // Supervisor View: No pricing, show maintenance countdown
                            <div className="flex flex-col gap-4">
                                {maintenanceInfo ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[#E5E5E5] text-sm">
                                                {maintenanceInfo.isActive ? "Maintenance Active" : "Days to Maintenance"}
                                            </span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5E5E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                        </div>
                                        <div className="text-[#FDCE06] text-lg font-bold">
                                            {maintenanceInfo.text}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[#9CA3AF] text-sm italic">
                                        No scheduled maintenance
                                    </div>
                                )}

                                {/* Availability Line for Supervisor */}
                                {availabilityText && (
                                    <div className={`${availabilityText === "Unavailable" ? "text-[#6B7280]" : "text-[#10B981]"} text-sm font-semibold`}>
                                        {availabilityText}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard View: Pricing and Status
                            <>
                                {/* Price Display */}
                                {hasDiscount ? (
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-[#6B7280] text-lg font-bold line-through">
                                            {formatCurrency(basePrice)}
                                        </span>
                                        <span className="text-[#E5E5E5] text-lg font-bold">
                                            {formatCurrency(discountedPrice)}
                                        </span>
                                        <span className="text-[#10B981] text-sm font-semibold ml-auto">
                                            Save {formatCurrency(savings)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-[#E5E5E5] text-lg font-bold mb-2">
                                        {formatCurrency(basePrice)}
                                    </div>
                                )}

                                {/* Status Lines */}
                                <div className="flex flex-col gap-1">
                                    {/* Availability Line */}
                                    {availabilityText && (
                                        <div className={`${availabilityText === "Unavailable" ? "text-[#6B7280]" : "text-[#10B981]"} text-sm font-semibold`}>
                                            {availabilityText}
                                        </div>
                                    )}

                                    {/* Maintenance Line (if applicable) */}
                                    {maintenanceInfo && (
                                        <div className="text-orange-500 text-sm font-semibold">
                                            {maintenanceInfo.text}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Slider Section - Only if compounding discount exists AND not supervisor */}
                    {hasCompounding && !isSupervisor && (
                        <div className="mb-4 pb-4 border-t-2 border-[#333333] pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[#E5E5E5] text-sm font-semibold">
                                    Savings per month:
                                </span>
                                <span className="text-[#10B981] text-sm font-bold">
                                    -{formatCurrency(savingsPerMonth)}
                                </span>
                            </div>
                            <div className="relative mb-2">
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
                                        background: '#333333',
                                    }}
                                />
                            </div>
                            <div className="flex justify-end">
                                <span className="text-[#9CA3AF] text-sm">
                                    {selectedDuration} month{selectedDuration > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isUnavailable) {
                                    onRequest(equipment);
                                }
                            }}
                            disabled={isUnavailable || requestLoading}
                            className={`flex-1 px-3 py-2 border-2 border-[#FDCE06] bg-[#FDCE06] text-[#000000] text-sm font-semibold hover:bg-[#E5B800] hover:border-[#E5B800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap rounded ${isUnavailable ? "bg-[#333333] border-[#333333] text-[#6B7280]" : ""
                                }`}
                        >
                            {requestLoading ? (
                                <ClipLoader size={14} color={isUnavailable ? "#6B7280" : "#000000"} />
                            ) : isUnavailable ? (
                                "Unavailable"
                            ) : (
                                "Request"
                            )}
                        </button>

                        {!isSupervisor && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsQuoteModalOpen(true);
                                }}
                                className="flex-1 px-3 py-2 border-2 border-[#333333] bg-[#2A2A2B] text-[#E5E5E5] text-sm font-semibold hover:bg-[#333333] transition-colors whitespace-nowrap rounded"
                            >
                                Quote
                            </button>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsSpecModalOpen(true);
                            }}
                            className="flex-1 px-3 py-2 border-2 border-[#333333] bg-[#2A2A2B] text-[#E5E5E5] text-sm font-semibold hover:bg-[#333333] transition-colors whitespace-nowrap rounded"
                        >
                            Spec
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SpecModal
                isOpen={isSpecModalOpen}
                onClose={() => setIsSpecModalOpen(false)}
                files={equipment.specs_files || []}
                equipmentName={equipment.equipment_name || equipment.name}
            />

            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                equipment={equipment}
            />
        </>
    );
};

export default EquipmentCard;
