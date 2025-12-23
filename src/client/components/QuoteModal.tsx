// @ts-nocheck
import React, { useState, useEffect } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import QuotePDF from "../../components/QuotePDF";
import { ClipLoader } from "react-spinners";
import { clientEquipmentApi } from "../../services/clientEquipmentApi";
import { settingsApi } from "../../services/settingsApi";
import { toast } from "react-toastify";

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: any;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, equipment }) => {
    const [quoteData, setQuoteData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && equipment) {
            prepareQuoteData();
        }
    }, [isOpen, equipment]);

    const prepareQuoteData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch quote configuration for this equipment
            let quoteConfig = null;
            try {
                quoteConfig = await clientEquipmentApi.getQuoteConfig(equipment.id);
            } catch (quoteError: any) {
                console.warn("Quote config API not available, using defaults:", quoteError);
                // Use default values if API fails
                quoteConfig = {
                    company_name: "Valued Client",
                    company_address: "",
                    company_email: "",
                    company_logo: null,
                    gst_percentage: "15",
                    terms_of_hire: "Standard Long Term Hire Terms & Conditions apply.",
                    quote_expires_after: "7",
                    produce_quote_for: "12"
                };
            }

            // Fetch admin settings for "From" section
            let adminSettings = null;
            try {
                const settingsResponse = await settingsApi.getSettings();
                if (!settingsResponse.error && settingsResponse.data) {
                    adminSettings = settingsResponse.data;
                }
            } catch (error) {
                console.error("Error fetching admin settings:", error);
            }

            // Get client email from localStorage
            const clientEmail = localStorage.getItem("clientEmail") || "";

            // Calculate pricing
            const basePrice = parseFloat(equipment.custom_base_price || equipment.base_price) || 0;
            const discountValue = parseFloat(equipment.discount || equipment.discount_value) || 0;
            const discountType = equipment.discount_type;

            // Construct quote data
            const data = {
                company_name: quoteConfig.company_name || "Valued Client",
                company_address: quoteConfig.company_address || "",
                company_email: quoteConfig.company_email || clientEmail,
                company_logo: quoteConfig.company_logo || null,
                gst_percentage: quoteConfig.gst_percentage?.toString() || "15",
                terms_of_hire: quoteConfig.terms_of_hire || "Standard Long Term Hire Terms & Conditions apply.",
                quote_id: `Q-${Date.now().toString().slice(-6)}`,
                quote_expires_after: quoteConfig.quote_expires_after?.toString() || "7",
                produce_quote_for: quoteConfig.produce_quote_for?.toString() || "12",
                created_at: new Date().toISOString().split("T")[0],

                // Admin company info (From)
                admin_company_name: adminSettings?.company_name || "Long Term Hire Pty Ltd",
                admin_company_address: adminSettings?.company_address || "PO Box 4089 MOUNT ELIZA VIC 3930 AUSTRALIA",
                admin_company_logo: adminSettings?.company_logo || null,

                // Equipment Details
                equipmentData: {
                    id: equipment.equipment_id || equipment.id,
                    description: equipment.equipment_name,
                    basePrice: basePrice,
                    discount: discountValue,
                    discountType: discountType,
                    compounding_discount: parseFloat(equipment.compounding_discount || equipment.compounding_discount_value) || 0,
                    compounding_discount_type: equipment.compounding_discount_type
                }
            };

            setQuoteData(data);
        } catch (error) {
            console.error("Error preparing quote data", error);
            setError("Failed to load quote configuration. Please try again.");
            toast.error("Failed to load quote configuration");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-[#333333] flex justify-between items-center">
                    <h2 className="text-[#E5E5E5] text-xl font-bold">
                        Instant Quote: {equipment?.equipment_name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#525659] relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <ClipLoader color="#FDCE06" size={50} />
                                <p className="text-white mt-4">Loading quote configuration...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white">
                                <p className="text-red-400 mb-4">{error}</p>
                                <button
                                    onClick={prepareQuoteData}
                                    className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded hover:bg-[#E5B800] transition-colors font-bold"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : quoteData ? (
                        <PDFViewer width="100%" height="100%" className="border-none">
                            <QuotePDF quoteData={quoteData} />
                        </PDFViewer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            Failed to generate quote.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#333333] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#333333] text-[#E5E5E5] rounded hover:bg-[#404040] transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuoteModal;
