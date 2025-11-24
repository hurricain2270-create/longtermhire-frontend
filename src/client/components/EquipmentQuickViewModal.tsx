// @ts-nocheck
import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners/ClipLoader";
import { toast } from "react-toastify";

/**
 * EquipmentQuickViewModal
 * Props:
 *  - equipment: equipment object with images, details, maintenance, pricing
 *  - isOpen: boolean to control visibility
 *  - onClose: function to close modal
 *  - onRequest: function to request equipment (same as in EquipmentCard)
 *  - requestLoading: boolean indicating request in progress
 *  - userRole: role of current user (Supervisor, Engineer, Owner, etc.)
 */
const EquipmentQuickViewModal = ({
    equipment,
    isOpen,
    onClose,
    onRequest,
    requestLoading,
    userRole = "member",
}) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [maintenanceInfo, setMaintenanceInfo] = useState(null);

    // Parse images from equipment.content_images (same logic as EquipmentCard)
    const parseImages = () => {
        if (!equipment) return [];
        if (equipment.content_images) {
            if (typeof equipment.content_images === "string") {
                try {
                    if (equipment.content_images.includes("|||")) {
                        return equipment.content_images
                            .split("|||")
                            .map((s) => JSON.parse(s));
                    }
                    const parsed = JSON.parse(equipment.content_images);
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    return [{ image_url: equipment.content_images }];
                }
            } else if (Array.isArray(equipment.content_images)) {
                return equipment.content_images;
            }
        }
        // fallback to image_url / image
        return [{ image_url: equipment.image_url || equipment.image }];
    };

    const images = parseImages();

    // Maintenance info (same logic as EquipmentCard but extracted for modal)
    useEffect(() => {
        if (equipment && equipment.maintenance_periods && Array.isArray(equipment.maintenance_periods)) {
            const today = new Date();
            const upcoming = equipment.maintenance_periods.find(
                (p) => new Date(p.end_date) >= today
            );
            if (upcoming) {
                const start = new Date(upcoming.start_date);
                const diff = start.getTime() - today.getTime();
                const days = Math.ceil(diff / (1000 * 3600 * 24));
                setMaintenanceInfo({
                    text: `Maintenance ${start.toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    })}`,
                    daysUntil: days > 0 ? days : 0,
                    isActive: days <= 0 && new Date(upcoming.end_date) >= today,
                });
            }
        }
    }, [equipment]);

    if (!equipment) return null;

    const isSupervisor = userRole === "Supervisor";

    const handlePrev = () => {
        setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
    };
    const handleNext = () => {
        setCurrentIdx((prev) => (prev + 1) % images.length);
    };

    const handleRequest = async () => {
        try {
            await onRequest(equipment);
        } catch (e) {
            toast.error("Failed to request equipment");
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            onClick={onClose}
        >
            <div
                className="bg-[#1F1F20] rounded-lg w-full max-w-4xl mx-4 p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 text-[#E5E5E5] hover:text-[#FDCE06]"
                    onClick={onClose}
                >
                    ✕
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side – Image carousel */}
                    <div className="relative" style={{ paddingTop: "75%" /* 4:3 aspect ratio */ }}>
                        <img
                            src={images[currentIdx].image_url}
                            alt={equipment.equipment_name || equipment.name}
                            className="absolute inset-0 w-full h-full object-cover rounded"
                        />
                        {/* Navigation arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#00000080] text-[#E5E5E5] rounded-full p-2 hover:bg-[#000]"
                                >
                                    ◀
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00000080] text-[#E5E5E5] rounded-full p-2 hover:bg-[#000]"
                                >
                                    ▶
                                </button>
                            </>
                        )}
                    </div>
                    {/* Thumbnails */}
                    {images.length > 1 && (
                        <div className="flex space-x-2 overflow-x-auto mt-2">
                            {images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img.image_url}
                                    alt={`thumb-${idx}`}
                                    className={`w-16 h-12 object-cover rounded cursor-pointer border-2 ${idx === currentIdx ? "border-[#FDCE06]" : "border-transparent"
                                        }`}
                                    onClick={() => setCurrentIdx(idx)}
                                />
                            ))}
                        </div>
                    )}
                    {/* Right side – Details */}
                    <div className="flex flex-col">
                        <h2 className="text-[#E5E5E5] text-xl font-bold mb-2">
                            {equipment.equipment_name || equipment.name}
                        </h2>
                        <p className="text-[#9CA3AF] mb-4 line-clamp-3">
                            {equipment.description || equipment.content_description || "No description available"}
                        </p>
                        {/* Maintenance / Availability */}
                        {isSupervisor ? (
                            <div className="mb-4">
                                {maintenanceInfo ? (
                                    <div className="flex items-center text-[#E5E5E5]">
                                        <span>{maintenanceInfo.isActive ? "Maintenance Active" : `${maintenanceInfo.daysUntil} days to Maintenance`}</span>
                                    </div>
                                ) : (
                                    <div className="text-[#9CA3AF] italic">No scheduled maintenance</div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-4">
                                {/* Pricing for non‑supervisors */}
                                <div className="text-[#E5E5E5] font-medium">
                                    Price: {formatCurrency(equipment.custom_base_price || equipment.base_price)}
                                </div>
                                {/* Show discount if any */}
                                {equipment.discount && (
                                    <div className="text-[#9CA3AF] text-sm">Discount: {equipment.discount}{equipment.discount_type}</div>
                                )}
                            </div>
                        )}
                        {/* Action buttons */}
                        <div className="mt-auto flex space-x-3">
                            <button
                                onClick={handleRequest}
                                disabled={requestLoading}
                                className="bg-[#FDCE06] text-[#1F1F20] px-4 py-2 rounded hover:bg-[#e5b800] disabled:opacity-50"
                            >
                                {requestLoading ? <ClipLoader size={16} color="#1F1F20" /> : "Request"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentQuickViewModal;
