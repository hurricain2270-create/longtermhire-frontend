// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import AddQuoteModal from "./components/AddQuoteModal";
import EditQuoteModal from "./components/EditQuoteModal";
import { pdf } from "@react-pdf/renderer";
import QuotePDF from "./components/QuotePDF";
import { quoteApi } from "./services/quoteApi";

const QuoteManagement = () => {
  const [searchData, setSearchData] = useState({
    quoteId: "",
    companyName: "",
  });

  const [quotes, setQuotes] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Load quotes on component mount and when pagination/search changes
  useEffect(() => {
    loadQuotes();
  }, [pagination.page]);

  const loadQuotes = async () => {
    try {
      setLoading(true);

      const filters = {};
      if (searchData.quoteId) filters.quote_id = searchData.quoteId;
      if (searchData.companyName) filters.company_name = searchData.companyName;

      const response = await quoteApi.getQuotes(pagination.page, pagination.limit, filters);

      if (!response.error && response.data) {
        // Map backend field names to frontend format
        const mappedQuotes = response.data.map((quote) => ({
          id: quote.id,
          quoteId: quote.quote_id,
          companyName: quote.company_name || "",
          companyEmail: quote.company_email || "",
          companyAddress: quote.company_address || "",
          companyLogo: quote.company_logo || null,
          quoteExpiresAfter: quote.quote_expires_after?.toString() || "7",
          produceQuoteFor: quote.produce_quote_for?.toString() || "12",
          gstPercentage: quote.gst_percentage?.toString() || "15",
          termsOfHire: quote.terms_of_hire || "",
          createdDate: quote.created_at
            ? new Date(quote.created_at).toISOString().split("T")[0]
            : "",
          status: quote.status || "Active",
        }));

        setQuotes(mappedQuotes);

        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          }));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading quotes:", error);
      toast.error(error.message || "Failed to load quotes");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = () => {
    // Reset to page 1 and reload
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadQuotes();
  };

  const handleClearSearch = () => {
    setSearchData({
      quoteId: "",
      companyName: "",
    });
    // Reload with cleared filters
    setTimeout(() => loadQuotes(), 100);
  };

  const handleAddQuote = () => {
    setIsAddModalOpen(true);
  };

  const handleEditQuote = (quote) => {
    setSelectedQuote(quote);
    setIsEditModalOpen(true);
  };

  const handleSaveQuote = async (quoteData) => {
    try {
      // Transform camelCase data to snake_case for backend
      const payload = {
        company_name: quoteData.companyName,
        company_email: quoteData.companyEmail,
        company_address: quoteData.companyAddress || "",
        company_logo: quoteData.companyLogo || null,
        quote_expires_after: parseInt(quoteData.quoteExpiresAfter) || 7,
        produce_quote_for: parseInt(quoteData.produceQuoteFor) || 12,
        gst_percentage: parseFloat(quoteData.gstPercentage) || 15,
        terms_of_hire: quoteData.termsOfHire || "",
      };

      const response = await quoteApi.createQuote(payload);

      if (!response.error) {
        toast.success("Quote created successfully!");
        setIsAddModalOpen(false);
        // Reload quotes to show new quote
        await loadQuotes();
      } else {
        toast.error(response.message || "Failed to create quote");
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      toast.error(error.message || "Failed to create quote");
    }
  };

  const handleUpdateQuote = async (quoteData, quoteId) => {
    try {
      // Transform camelCase data to snake_case for backend
      const payload = {
        company_name: quoteData.companyName,
        company_email: quoteData.companyEmail,
        company_address: quoteData.companyAddress || "",
        company_logo: quoteData.companyLogo || null,
        quote_expires_after: parseInt(quoteData.quoteExpiresAfter) || 7,
        produce_quote_for: parseInt(quoteData.produceQuoteFor) || 12,
        gst_percentage: parseFloat(quoteData.gstPercentage) || 15,
        terms_of_hire: quoteData.termsOfHire || "",
        status: quoteData.status || "Active",
      };

      const response = await quoteApi.updateQuote(quoteId, payload);

      if (!response.error) {
        toast.success("Quote updated successfully!");
        setIsEditModalOpen(false);
        setSelectedQuote(null);
        // Reload quotes to show updated data
        await loadQuotes();
      } else {
        toast.error(response.message || "Failed to update quote");
      }
    } catch (error) {
      console.error("Error updating quote:", error);
      toast.error(error.message || "Failed to update quote");
    }
  };

  const handleDeleteQuote = async (quoteId) => {
    if (window.confirm("Are you sure you want to delete this quote?")) {
      try {
        const response = await quoteApi.deleteQuote(quoteId);

        if (!response.error) {
          toast.success("Quote deleted successfully!");
          // Reload quotes
          await loadQuotes();
        } else {
          toast.error(response.message || "Failed to delete quote");
        }
      } catch (error) {
        console.error("Error deleting quote:", error);
        toast.error(error.message || "Failed to delete quote");
      }
    }
  };

  const handleDownloadPDF = async (quote = null) => {
    try {
      // Use the provided quote or the first quote from the list
      const quoteToDownload = quote || quotes[0];

      if (!quoteToDownload) {
        toast.error("No quote available to download. Please create a quote first.");
        return;
      }

      const quoteData = {
        company_name: quoteToDownload.companyName,
        company_address: quoteToDownload.companyAddress,
        company_email: quoteToDownload.companyEmail,
        company_logo: quoteToDownload.companyLogo,
        gst_percentage: quoteToDownload.gstPercentage,
        terms_of_hire: quoteToDownload.termsOfHire,
        quote_id: quoteToDownload.quoteId,
        quote_expires_after: quoteToDownload.quoteExpiresAfter,
        produce_quote_for: quoteToDownload.produceQuoteFor,
        created_at: quoteToDownload.createdDate,
        equipmentData: {
          id: "001",
          description: "7 Ton Excavator",
          basePrice: 5000,
          discount: 1,
        },
      };

      const blob = await pdf(<QuotePDF quoteData={quoteData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quote-${quoteToDownload.quoteId || new Date().getTime()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Quote PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px] leading-[1.11em]">
          Quote Management
        </h1>
      </header>

      {/* Search Section */}
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quote ID Search */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Quote ID
            </label>
            <input
              type="text"
              name="quoteId"
              value={searchData.quoteId}
              onChange={handleInputChange}
              placeholder="Enter Quote ID"
              className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06] transition-colors"
            />
          </div>

          {/* Company Name Search */}
          <div>
            <label className="block text-[#9CA3AF] font-[Inter] font-medium text-sm mb-2">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={searchData.companyName}
              onChange={handleInputChange}
              placeholder="Enter Company Name"
              className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06] transition-colors"
            />
          </div>

          {/* Search Buttons */}
          <div className="lg:col-span-2 flex items-end gap-3">
            <button
              onClick={handleSearch}
              className="bg-[#FDCE06] text-[#1F1F20] px-6 py-2 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleClearSearch}
              className="bg-[#333333] text-[#E5E5E5] px-6 py-2 rounded-md font-[Inter] font-medium text-sm hover:bg-[#404040] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleAddQuote}
          className="bg-[#FDCE06] text-[#1F1F20] px-6 py-3 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] transition-colors flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Quote
        </button>


      </div>

      {/* Quotes Table */}
      <div className="bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            {/* Table Header */}
            <thead className="bg-[#292A2B]">
              <tr>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Quote ID
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Company Name
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Email
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Created Date
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Expires In
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                  Status
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-center px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <ClipLoader color="#FDCE06" size={30} />
                      <span className="ml-3 text-[#E5E5E5]">
                        Loading quotes...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <div className="text-[#9CA3AF]">
                      <p>No quotes found</p>
                      <button
                        onClick={handleAddQuote}
                        className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                      >
                        Create First Quote
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-t border-[#333333] hover:bg-[#292A2B] transition-colors"
                  >
                    <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                      {quote.quoteId}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                      {quote.companyName}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                      {quote.companyEmail}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                      {quote.createdDate}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                      {quote.quoteExpiresAfter} days
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${quote.status === "Active"
                          ? "bg-green-900/30 text-green-400 border border-green-400/30"
                          : "bg-red-900/30 text-red-400 border border-red-400/30"
                          }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-3 items-center justify-center">
                        <button
                          onClick={() => handleDownloadPDF(quote)}
                          className="text-[#4CAF50] font-[Inter] font-medium text-sm hover:underline transition-all"
                          title="Download PDF"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="text-[#FDCE06] font-[Inter] font-medium text-sm hover:underline transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="text-red-400 font-[Inter] font-medium text-sm hover:underline transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddQuoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveQuote}
      />

      <EditQuoteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateQuote}
        quote={selectedQuote}
      />

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default QuoteManagement;
