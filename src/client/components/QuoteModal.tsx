// @ts-nocheck
import React, { useState, useEffect } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import QuotePDF from "../../components/QuotePDF";
import { ClipLoader } from "react-spinners";

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: any;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, equipment }) => {
    const [quoteData, setQuoteData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && equipment) {
            prepareQuoteData();
        }
    }, [isOpen, equipment]);

    const prepareQuoteData = () => {
        setLoading(true);
        try {
            // Get client profile from local storage
            const clientProfileStr = localStorage.getItem("clientProfile");
            const clientProfile = clientProfileStr ? JSON.parse(clientProfileStr) : {};
            const clientEmail = localStorage.getItem("clientEmail") || "";

            // Calculate pricing
            const basePrice = parseFloat(equipment.custom_base_price || equipment.base_price) || 0;
            const discountValue = parseFloat(equipment.discount || equipment.discount_value) || 0;
            const discountType = equipment.discount_type;

            // Construct quote data
            const data = {
                company_name: clientProfile.company_name || "Valued Client",
                company_address: clientProfile.company_address || "",
                company_email: clientEmail,
                company_logo: null, // Client logo not typically on quote TO them, but we can add if available
                gst_percentage: "15", // Default NZ GST
                terms_of_hire: "Standard Long Term Hire Terms & Conditions apply.",
                quote_id: `Q-${Date.now().toString().slice(-6)}`,
                quote_expires_after: "7",
                produce_quote_for: "1", // 1 month default?
                created_at: new Date().toISOString().split("T")[0],

                // Admin company info (From)
                admin_company_name: "Long Term Hire Pty Ltd",
                admin_company_address: "PO Box 4089 MOUNT ELIZA VIC 3930 AUSTRALIA",

                // Equipment Details
                equipmentData: {
                    id: equipment.equipment_id || equipment.id,
                    description: equipment.equipment_name,
                    basePrice: basePrice,
                    discount: discountValue,
                    discountType: discountType
                }
            };

            setQuoteData(data);
        } catch (error) {
            console.error("Error preparing quote data", error);
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
                            <ClipLoader color="#FDCE06" size={50} />
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
