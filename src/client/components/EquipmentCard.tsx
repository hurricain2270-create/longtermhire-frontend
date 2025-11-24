import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";

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
}) => {
    // Local state for duration slider
    const [selectedDuration, setSelectedDuration] = useState(3);
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [savingsPerMonth, setSavingsPerMonth] = useState(0);

    // Calculate price based on duration and discounts
    useEffect(() => {
        const basePrice = parseFloat(equipment.custom_base_price || equipment.base_price) || 0;
        const discountValue = parseFloat(equipment.discount) || 0;
        const discountType = equipment.discount_type;
        const compoundingValue = parseFloat(equipment.compounding_discount) || 0;
        const compoundingType = equipment.compounding_discount_type;

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
        // Simple model: Price per month = InitialPrice - (Compounding * (Month - 1))
        // Or if percentage: Price = PreviousMonth * (1 - Compounding)

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
    }, [selectedDuration, equipment]);

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

    // Calculate days to maintenance
    const getDaysToMaintenance = () => {
        if (equipment.maintenance_periods && Array.isArray(equipment.maintenance_periods)) {
            const today = new Date();
            // Find the earliest future maintenance start date
            const upcomingMaintenance = equipment.maintenance_periods
                .map((p: any) => new Date(p.start_date))
                .filter((d: Date) => d > today)
                .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

            if (upcomingMaintenance) {
                const diffTime = upcomingMaintenance.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            }
        }
        return null;
    };

    // Determine card variant based on equipment status and discount
    const getCardVariant = () => {
        const daysToMaintenance = getDaysToMaintenance();

        // Variant 1: Days to Maintenance (upcoming maintenance within 90 days)
        if (daysToMaintenance !== null && daysToMaintenance > 0 && daysToMaintenance <= 90) {
            return "days_to_maintenance";
        }

        // Variant 2: Maintenance/Unavailable (currently unavailable)
        if (equipment.status === "Maintenance" || equipment.status === "Unavailable" || equipment.status === "Booked") {
            return "maintenance";
        }

        const hasDiscount = parseFloat(equipment.discount) > 0;
        const hasCompounding = parseFloat(equipment.compounding_discount) > 0;

        // Variant 4: Both discount and compounding (strikethrough + slider)
        if (hasDiscount && hasCompounding) {
            return "both";
        }

        // Variant: Compounding only (slider, no strikethrough of base price, but shows savings)
        if (!hasDiscount && hasCompounding) {
            return "compounding_only";
        }

        // Variant 3: Discount only (show strikethrough)
        if (hasDiscount && !hasCompounding) {
            return "discount";
        }

        // Default: simple price display
        return "simple";
    };

    const variant = getCardVariant();
    const basePrice = parseFloat(equipment.custom_base_price || equipment.base_price) || 0;
    const daysToMaintenance = getDaysToMaintenance();

    // Get maintenance date display
    const getMaintenanceDate = () => {
        if (equipment.maintenance_periods && Array.isArray(equipment.maintenance_periods)) {
            const today = new Date();
            const nextMaintenance = equipment.maintenance_periods
                .find((p: any) => new Date(p.end_date) >= today);

            if (nextMaintenance) {
                const date = new Date(nextMaintenance.start_date);
                return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
            }
        }
        return "Unknown Date";
    };

    // Calculate discounted price for display (Base Discount Only)
    const getBaseDiscountedPrice = () => {
        const discountValue = parseFloat(equipment.discount) || 0;
        const discountType = equipment.discount_type;

        if (discountValue > 0) {
            if (discountType === "%") {
                return basePrice * (1 - discountValue / 100);
            } else {
                return Math.max(0, basePrice - discountValue);
            }
        }
        return basePrice;
    };

    return (
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

                {/* Pricing Section - Different variants */}
                <div className="mb-4">
                    {/* Variant 1: Days to Maintenance */}
                    {variant === "days_to_maintenance" && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[#E5E5E5] text-sm font-semibold">Days to Maintenance</span>
                                <div className="flex items-center gap-2">
                                    {/* Calendar icon with number */}
                                    <div className="relative w-8 h-8 border-2 border-[#FDCE06] flex items-center justify-center bg-[#2A2A2B] rounded">
                                        <svg className="absolute top-0 left-0 w-full h-2 rounded-t" viewBox="0 0 32 8">
                                            <rect x="0" y="0" width="32" height="8" fill="#FDCE06" />
                                        </svg>
                                        <span className="text-xs font-bold mt-1 text-[#FDCE06]">{daysToMaintenance}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-orange-500 text-sm font-semibold">
                                Maintenance {getMaintenanceDate()}
                            </div>
                        </>
                    )}

                    {/* Variant 2: Maintenance/Unavailable */}
                    {variant === "maintenance" && (
                        <>
                            <div className="text-[#E5E5E5] text-lg font-bold mb-2">
                                {formatCurrency(basePrice)}
                            </div>
                            <div className="text-orange-500 text-sm font-semibold">
                                {equipment.status === "Booked" ? "Booked" : "Maintenance"} {getMaintenanceDate()}
                            </div>
                        </>
                    )}

                    {/* Variant 3: Discount only */}
                    {variant === "discount" && (
                        <>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-[#6B7280] text-lg font-bold line-through">
                                    {formatCurrency(basePrice)}
                                </span>
                                <span className="text-[#E5E5E5] text-lg font-bold">
                                    {formatCurrency(getBaseDiscountedPrice())}
                                </span>
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold mb-1">
                                Save {formatCurrency(basePrice - getBaseDiscountedPrice())}
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold">
                                Available Now
                            </div>
                        </>
                    )}

                    {/* Variant 4: Both discount and slider */}
                    {variant === "both" && (
                        <>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-[#6B7280] text-lg font-bold line-through">
                                    {formatCurrency(basePrice)}
                                </span>
                                <span className="text-[#E5E5E5] text-lg font-bold">
                                    {formatCurrency(getBaseDiscountedPrice())}
                                </span>
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold mb-1">
                                Save {formatCurrency(savingsPerMonth)}/month
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold mb-3">
                                Available Now
                            </div>
                        </>
                    )}

                    {/* Variant: Compounding Only */}
                    {variant === "compounding_only" && (
                        <>
                            <div className="text-[#E5E5E5] text-lg font-bold mb-2">
                                {formatCurrency(basePrice)}
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold mb-1">
                                Save up to {formatCurrency(savingsPerMonth)}/month
                            </div>
                            <div className="text-[#10B981] text-sm font-semibold mb-3">
                                Available Now
                            </div>
                        </>
                    )}

                    {/* Variant 5: Simple */}
                    {variant === "simple" && (
                        <div className="text-[#E5E5E5] text-lg font-bold mb-2">
                            {formatCurrency(basePrice)}
                        </div>
                    )}
                </div>

                {/* Slider Section - For both and compounding_only */}
                {(variant === "both" || variant === "compounding_only") && (
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
                            {/* Custom thumb is handled by CSS injected in ClientDashboard */}
                        </div>
                        <div className="flex justify-between text-[#9CA3AF] text-xs">
                            <span>1 month</span>
                            <span>12 months</span>
                        </div>
                        <div className="text-center text-[#E5E5E5] text-sm font-semibold mt-2">
                            Duration: {selectedDuration} month{selectedDuration > 1 ? 's' : ''}
                        </div>
                    </div>
                )}

                {/* Request Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (variant !== "maintenance") {
                            onRequest(equipment);
                        }
                    }}
                    disabled={variant === "maintenance" || requestLoading}
                    className={`w-full py-3 rounded font-bold transition-colors mt-auto ${variant === "maintenance"
                        ? "bg-[#333333] text-[#6B7280] cursor-not-allowed"
                        : "bg-[#FDCE06] text-[#000000] hover:bg-[#E5B800]"
                        }`}
                >
                    {requestLoading ? (
                        <ClipLoader size={20} color={variant === "maintenance" ? "#6B7280" : "#000000"} />
                    ) : variant === "maintenance" ? (
                        "Unavailable"
                    ) : (
                        "Request Quote"
                    )}
                </button>
            </div>
        </div>
    );
};

export default EquipmentCard;
