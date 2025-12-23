// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { PDFViewer } from "@react-pdf/renderer";
import QuotePDF from "./QuotePDF";
import { equipmentApi } from "../services/equipmentApi";
import { quoteApi } from "../services/quoteApi";
import { settingsApi } from "../services/settingsApi";
import SimpleRichTextEditor from "./SimpleRichTextEditor";

const AddQuoteModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    companyId: "",
    companyLogo: null,
    companyName: "",
    companyAddress: "",
    companyEmail: "",
    quoteExpiresAfter: "3",
    produceQuoteFor: "8",
    gstPercentage: "15",
    termsOfHire: "",
  });

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [logoPreview, setLogoPreview] = useState(null);

  // Fetch companies on mount
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingCompanies(true);
    setLoadingSettings(true);
    try {
      // Fetch companies
      const companiesResponse = await quoteApi.getCompanies();
      if (!companiesResponse.error) {
        setCompanies(companiesResponse.data || []);
      }

      // Fetch default settings
      const settingsResponse = await settingsApi.getSettings();
      if (!settingsResponse.error && settingsResponse.data) {
        const settings = settingsResponse.data;
        setFormData(prev => ({
          ...prev,
          quoteExpiresAfter: settings.default_quote_expires_after?.toString() || "7",
          produceQuoteFor: settings.default_produce_quote_for?.toString() || "12",
          gstPercentage: settings.default_gst_percentage?.toString() || "15",
          termsOfHire: settings.default_terms_of_hire || "",
        }));
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoadingCompanies(false);
      setLoadingSettings(false);
    }
  };

  /* Removed old fetchCompanies */

  const handleCompanySelect = (e) => {
    const companyId = e.target.value;
    setFormData((prev) => ({ ...prev, companyId }));

    if (companyId) {
      const selectedCompany = companies.find(c => c.id.toString() === companyId);
      if (selectedCompany) {
        setFormData((prev) => ({
          ...prev,
          companyName: selectedCompany.company_name || "",
          companyAddress: selectedCompany.company_address || "",
          companyEmail: selectedCompany.owner_email || "",
          // companyLogo handled by backend or settings
        }));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Logo upload removed as per requirements

  const handleSubmit = () => {
    // Validation
    if (!formData.companyId) {
      toast.error("Please select a company");
      return;
    }
    if (!formData.companyName || !formData.companyEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Prepare data with company_id
    const quoteData = {
      company_id: parseInt(formData.companyId),
      company_name: formData.companyName,
      company_address: formData.companyAddress,
      company_email: formData.companyEmail,
      company_logo: formData.companyLogo,
      quote_expires_after: parseInt(formData.quoteExpiresAfter),
      produce_quote_for: parseInt(formData.produceQuoteFor),
      gst_percentage: parseFloat(formData.gstPercentage),
      terms_of_hire: formData.termsOfHire,
    };

    console.log("📋 Quote Data being sent:", quoteData);
    onSave(quoteData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      companyId: "",
      companyLogo: null,
      companyName: "",
      companyAddress: "",
      companyEmail: "",
      quoteExpiresAfter: "3",
      produceQuoteFor: "8",
      gstPercentage: "15",
      termsOfHire: "",
    });
    setLogoPreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-xl">
            Create New Quote
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

              {/* Company Dropdown */}
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
                  Select Company *
                </label>
                <select
                  value={formData.companyId}
                  onChange={handleCompanySelect}
                  disabled={loadingCompanies}
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-2 outline-none focus:border-[#FDCE06] transition-colors"
                >
                  <option value="">Select a company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Logo Field Removed */}

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
                  onChange={(html) => setFormData((prev) => ({ ...prev, termsOfHire: html }))}
                  height={150}
                />
              </div>
            </div>

            {/* Right Side - Preview */}
            <div>
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg mb-4">
                Preview
              </h3>
              <div className="bg-white rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <PDFViewer width="100%" height="100%" showToolbar={false}>
                  <QuotePDF
                    quoteData={{
                      company_name: formData.companyName || "Your Company",
                      company_address: formData.companyAddress || "Your Address",
                      company_email: formData.companyEmail || "email@company.com",
                      company_logo: logoPreview,
                      gst_percentage: formData.gstPercentage || "15",
                      terms_of_hire: formData.termsOfHire || "Terms and conditions will appear here",
                      quote_id: "PREVIEW",
                      quote_expires_after: formData.quoteExpiresAfter || "3",
                      produce_quote_for: formData.produceQuoteFor || "8",
                      created_at: new Date().toISOString(),
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
            Save Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuoteModal;
