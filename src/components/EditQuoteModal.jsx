// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { PDFViewer } from "@react-pdf/renderer";
import QuotePDF from "./QuotePDF";
import { equipmentApi } from "../services/equipmentApi";
import SimpleRichTextEditor from "./SimpleRichTextEditor";

const EditQuoteModal = ({ isOpen, onClose, onSave, quote }) => {
  const [formData, setFormData] = useState({
    companyLogo: null,
    companyName: "",
    companyAddress: "",
    companyEmail: "",
    quoteExpiresAfter: "3",
    produceQuoteFor: "8",
    gstPercentage: "15",
    termsOfHire: "",
  });

  console.log(formData);

  const [logoPreview, setLogoPreview] = useState(null);

  // Load quote data when modal opens
  useEffect(() => {
    if (quote) {
      setFormData({
        companyLogo: quote.companyLogo || quote.company_logo || null,
        companyName: quote.companyName || "",
        companyAddress: quote.companyAddress || "",
        companyEmail: quote.companyEmail || "",
        quoteExpiresAfter: quote.quoteExpiresAfter || "3",
        produceQuoteFor: quote.produceQuoteFor || "8",
        gstPercentage: quote.gstPercentage || "15",
        termsOfHire: quote.termsOfHire || "",
      });
      // Set logo preview if URL exists
      if (quote.companyLogo || quote.company_logo) {
        setLogoPreview(quote.companyLogo || quote.company_logo);
      }
    }
  }, [quote]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate aspect ratio for logos (specific requirement: 16:9 to 3.5:1)
      const { validateImageFile } = await import("../utils/uploadUtils");
      await validateImageFile(file, {
        minAspectRatio: 16 / 9, // Minimum 16:9 (1.78:1)
        maxAspectRatio: 3.5, // Maximum 3.5:1 (allows 32:9 ultrawide and similar)
      });

      toast.info("Uploading logo...");

      // Upload to S3 using the same API as equipment
      const response = await equipmentApi.uploadFile(file);

      if (response && response.url) {
        setFormData((prev) => ({
          ...prev,
          companyLogo: response.url, // Save the URL string
        }));
        setLogoPreview(response.url);
        toast.success("Logo uploaded successfully!");
      } else {
        toast.error("Failed to upload logo");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.companyName || !formData.companyEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSave(formData, quote.id);
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-xl">
            Edit Quote
          </h2>
          <button
            onClick={handleClose}
            className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Form */}
            <div>
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                Your Company Details
              </h3>

              {/* Company Logo */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="w-20 h-20 object-contain bg-[#292A2B] rounded border border-[#333333]"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-[#292A2B] rounded border border-[#333333] flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-[#666666]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <label className="bg-[#FDCE06] text-[#1F1F20] px-3 py-2 rounded-md font-[Inter] font-medium text-sm cursor-pointer hover:bg-[#E5B800] transition-colors">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Company Name */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter company name"
                />
              </div>

              {/* Company Address */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Company Address
                </label>
                <input
                  type="text"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter company address"
                />
              </div>

              {/* Company Email */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Company Email *
                </label>
                <input
                  type="email"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleInputChange}
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  placeholder="Enter company email"
                />
              </div>

              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4 mt-6">
                Details
              </h3>

              {/* Quote Expires After */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Quote Expires After
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="quoteExpiresAfter"
                    value={formData.quoteExpiresAfter}
                    onChange={handleInputChange}
                    className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] text-sm">
                    days
                  </span>
                </div>
              </div>

              {/* Produce Quote For */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Produce Quote For
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="produceQuoteFor"
                    value={formData.produceQuoteFor}
                    onChange={handleInputChange}
                    className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] text-sm">
                    months
                  </span>
                </div>
              </div>

              {/* GST Percentage */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  GST Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="gstPercentage"
                    value={formData.gstPercentage}
                    onChange={handleInputChange}
                    className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] text-sm">
                    %
                  </span>
                </div>
              </div>

              {/* Terms of Hire */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Terms of Hire
                </label>
                <SimpleRichTextEditor
                  value={formData.termsOfHire}
                  onChange={(html) =>
                    setFormData((prev) => ({ ...prev, termsOfHire: html }))
                  }
                  height={150}
                />
              </div>
            </div>

            {/* Right Side - Preview */}
            <div>
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                Preview
              </h3>
              <div
                className="bg-white rounded-lg overflow-hidden"
                style={{ height: "600px" }}
              >
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <QuotePDF
                    quoteData={{
                      company_name: formData.companyName || "Your Company",
                      company_address:
                        formData.companyAddress || "Your Address",
                      company_email:
                        formData.companyEmail || "email@company.com",
                      company_logo: logoPreview,
                      gst_percentage: formData.gstPercentage || "15",
                      terms_of_hire:
                        formData.termsOfHire ||
                        "Terms and conditions will appear here",
                      quote_id: quote?.quoteId || "PREVIEW",
                      quote_expires_after: formData.quoteExpiresAfter || "3",
                      produce_quote_for: formData.produceQuoteFor || "8",
                      created_at:
                        quote?.createdDate || new Date().toISOString(),
                      equipmentData: {
                        id: "001",
                        description: "7 Ton Excavator",
                        basePrice: 5000,
                        discount: 1,
                      },
                    }}
                  />
                </PDFViewer>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#333333]">
          <button
            onClick={handleClose}
            className="bg-[#333333] text-[#E5E5E5] py-2 px-6 rounded-md font-[Inter] font-medium text-sm hover:bg-[#404040] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#FDCE06] text-[#1F1F20] py-2 px-6 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] transition-colors"
          >
            Update Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuoteModal;
