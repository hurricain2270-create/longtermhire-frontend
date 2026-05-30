// @ts-nocheck
import React, { useState, useEffect } from "react";
import { pricingApi } from "./services/pricingApi";
import ClipLoader from "react-spinners/ClipLoader";
import AddPricingPackageModal from "./components/AddPricingPackageModal";
import EditPricingModal from "./components/EditPricingModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PricingManagement = () => {
  const [searchData, setSearchData] = useState({
    packageId: "",
    packageName: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      setDebouncedSearchData(searchData);
    }
  };

  const handleSearch = () => {
    setDebouncedSearchData(searchData);
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchPricingPackages(newPage, debouncedSearchData);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchData({
      packageId: "",
      packageName: "",
    });
    setCurrentPage(1);
    fetchPricingPackages(1, {});
  };

  const [packageData, setPackageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 200,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Debounced search state
  const [debouncedSearchData, setDebouncedSearchData] = useState(searchData);

  // Fetch pricing packages from API with pagination and search
  const fetchPricingPackages = async (page = 1, searchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await pricingApi.getPricingPackages(
        page,
        200,
        searchFilters
      );
      setPackageData(data.data || []);

      // Update pagination info
      if (data.pagination) {
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      }
    } catch (err) {
      console.error("Error fetching pricing packages:", err);
      setError("Failed to load pricing packages");
      toast.error("Failed to load pricing packages");
    } finally {
      setLoading(false);
    }
  };

  // Load pricing packages on component mount
  useEffect(() => {
    fetchPricingPackages();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchData(searchData);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchData]);

  // Fetch data when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
    fetchPricingPackages(1, debouncedSearchData);
  }, [debouncedSearchData]);

  // Handle package submission
  const handleSubmitPackage = async (packageData) => {
    try {
      setAddLoading(true);
      await pricingApi.addPricingPackage(packageData);
      setIsAddModalOpen(false);
      toast.success("Pricing package created successfully!");
      // Refresh the package list
      await fetchPricingPackages(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error creating package:", err);
      toast.error("Failed to create package. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // Edit package handlers
  const handleEditPackage = (pkg) => {
    setSelectedPackage(pkg);
    setIsEditModalOpen(true);
  };

  const handleUpdatePackage = async (packageData) => {
    try {
      setAddLoading(true);
      await pricingApi.updatePricingPackage(selectedPackage.id, packageData);
      toast.success("Pricing package updated successfully!");
      setIsEditModalOpen(false);
      setSelectedPackage(null);
      // Refresh the package list
      await fetchPricingPackages(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error updating package:", err);
      toast.error("Failed to update package. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // Delete package handler
  const handleDeletePackage = async (packageId) => {
    if (
      window.confirm("Are you sure you want to delete this pricing package?")
    ) {
      try {
        await pricingApi.deletePricingPackage(packageId);
        toast.success("Pricing package deleted successfully!");
        // Refresh the package list
        await fetchPricingPackages(currentPage, debouncedSearchData);
      } catch (err) {
        console.error("Error deleting package:", err);
        toast.error("Failed to delete package. Please try again.");
      }
    }
  };

  // Show loading spinner while data is loading
  if (loading) {
    return (
      <div className="p-8 bg-[#292A2B] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <p className="text-[#E5E5E5] mt-4">Loading pricing packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em]">
          Pricing Management
        </h1>
      </header>

      {/* Search Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 mb-8">
        <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.2em] mb-6">
          Search
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Package ID Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Package ID
            </label>
            <input
              type="text"
              name="packageId"
              value={searchData.packageId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
              style={{ height: "42px" }}
            />
          </div>

          {/* Package Name Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Package Name
            </label>
            <input
              type="text"
              name="packageName"
              value={searchData.packageName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
              style={{ height: "42px" }}
            />
          </div>

          {/* Search Buttons */}
          <div className="flex flex-col justify-end gap-2 md:col-span-2 lg:col-span-1">
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#FDCE06] w-[200px] rounded-md text-[#1F1F20] font-[Inter] font-bold text-[16px] leading-[1.19em] px-6 py-3 hover:bg-[#E5B800] transition-colors disabled:opacity-50"
                style={{ height: "42px" }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
              {/* <button
                onClick={handleClearSearch}
                disabled={loading}
                className="bg-[#6B7280] text-[#E5E5E5] font-[Inter] font-medium text-[14px] px-4 py-3 rounded-md hover:bg-[#4B5563] transition-colors disabled:opacity-50"
                style={{ height: "42px" }}
              >
                Clear
              </button> */}
            </div>
          </div>
        </div>
      </section>

      {/* Add Package Button */}

      {/* Pricing Packages Table */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.2em] mb-6">
              Pricing Packages
            </h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#FDCE06] rounded-md text-[#1F1F20] font-inter font-bold text-sm lg:text-base px-6 py-2 hover:bg-[#E5B800] transition-colors whitespace-nowrap"
            >
              Add Pricing Package
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333333]">
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    ID
                  </th>
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    Package Name
                  </th>
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    Description
                  </th>
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    Discount Type
                  </th>
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    Discount Value
                  </th>
                  <th className="text-left text-[#E5E5E5] font-[Inter] font-medium text-[14px] py-3 px-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <ClipLoader color="#FDCE06" size={30} />
                        <span className="ml-3 text-[#E5E5E5]">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <div className="text-red-500">
                        <p>{error}</p>
                        <button
                          onClick={fetchPricingPackages}
                          className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : packageData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <div className="text-[#9CA3AF]">
                        <p>No pricing packages found</p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                        >
                          Add First Package
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  packageData.map((pkg, index) => (
                    <tr
                      key={pkg.package_id}
                      className={index > 0 ? "border-t border-[#333333]" : ""}
                    >
                      <td className="text-[#E5E5E5] font-[Inter] text-[14px] py-3 px-4">
                        {pkg.package_id}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-[14px] py-3 px-4">
                        {pkg.name}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-[14px] py-3 px-4">
                        {pkg.description}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-[14px] py-3 px-4">
                        {pkg.discount_type === 0
                          ? "Percentage"
                          : "Fixed Amount"}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-[14px] py-3 px-4">
                        {pkg.discount_type === 0
                          ? `${pkg.discount_value}%`
                          : `$${pkg.discount_value}`}
                      </td>
                      <td className="text-[#FDCE06] font-[Inter] text-[14px] py-3 px-4">
                        <button
                          onClick={() => handleEditPackage(pkg)}
                          className="text-[#FDCE06] hover:underline mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="px-3 py-2 bg-[#333333] text-[#E5E5E5] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#444444] transition-colors"
          >
            Previous
          </button>

          <span className="text-[#E5E5E5] font-[Inter] text-[14px]">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNext}
            className="px-3 py-2 bg-[#333333] text-[#E5E5E5] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#444444] transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      <AddPricingPackageModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmitPackage}
        loading={addLoading}
      />

      <EditPricingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdatePackage}
        pricingPackage={selectedPackage}
        loading={addLoading}
      />

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

export default PricingManagement;
