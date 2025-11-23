// @ts-nocheck
import React, { useState, useEffect } from "react";
import AddEquipmentModal from "./components/AddEquipmentModal";
import EditEquipmentModal from "./components/EditEquipmentModal";
import EquipmentDetailsModal from "./components/EquipmentDetailsModal";
import { equipmentApi } from "./services/equipmentApi";
import ClipLoader from "react-spinners/ClipLoader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router";

const EquipmentManagement = () => {
  const [searchData, setSearchData] = useState({
    categoryId: "",
    categoryName: "",
    equipmentId: "",
    equipmentName: "",
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  // Fetch equipment data from API with pagination and search
  const fetchEquipment = async (page = 1, searchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentApi.getEquipment(page, 200, searchFilters);
      setEquipment(data.data || []);

      // Update pagination info
      if (data.pagination) {
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      }
    } catch (err) {
      console.error("Error fetching equipment:", err);
      setError("Failed to load equipment");
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  // Load equipment on component mount
  useEffect(() => {
    fetchEquipment();
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
    fetchEquipment(1, debouncedSearchData);
  }, [debouncedSearchData]);

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
    fetchEquipment(newPage, debouncedSearchData);
  };

  const handleAddEquipment = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveEquipment = async (newEquipment) => {
    try {
      setLoading(true);
      await equipmentApi.addEquipment(newEquipment);
      setIsAddModalOpen(false);
      toast.success("Equipment added successfully!");
      // Refresh the equipment list
      await fetchEquipment(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error adding equipment:", err);
      setError("Failed to add equipment");
      toast.error("Failed to add equipment");
    } finally {
      setLoading(false);
    }
  };

  // Edit equipment handlers
  const handleEditEquipment = (equipment) => {
    setSelectedEquipment(equipment);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (equipment) => {
    navigate(`/equipment-management/${equipment.id}`);
  };

  const handleUpdateEquipment = async (equipmentData) => {
    try {
      setLoading(true);
      await equipmentApi.updateEquipment(selectedEquipment.id, equipmentData);
      toast.success("Equipment updated successfully!");
      setIsEditModalOpen(false);
      setSelectedEquipment(null);
      // Refresh the equipment list
      await fetchEquipment(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error updating equipment:", err);
      toast.error("Failed to update equipment");
    } finally {
      setLoading(false);
    }
  };

  // // Delete equipment handler
  // const handleDeleteEquipment = async (equipmentId) => {
  //   if (window.confirm("Are you sure you want to delete this equipment?")) {
  //     try {
  //       await equipmentApi.deleteEquipment(equipmentId);
  //       toast.success("Equipment deleted successfully!");
  //       // Refresh the equipment list
  //       await fetchEquipment(currentPage, searchData);
  //     } catch (err) {
  //       console.error("Error deleting equipment:", err);
  //       toast.error("Failed to delete equipment");
  //     }
  //   }
  // };

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const sanitized =
      typeof value === "string" ? value.replace(/,/g, "") : value;
    const number = Number(sanitized);
    if (Number.isNaN(number)) return "N/A";
    return number.toLocaleString("en-US");
  };

  // Handle equipment deletion
  const handleDeleteEquipment = async (equipmentId) => {
    if (!window.confirm("Are you sure you want to delete this equipment?")) {
      return;
    }

    try {
      setLoading(true);
      await equipmentApi.deleteEquipment(equipmentId);
      // Refresh the equipment list
      await fetchEquipment();
    } catch (err) {
      console.error("Error deleting equipment:", err);
      setError("Failed to delete equipment");
    } finally {
      setLoading(false);
    }
  };

  // Handle availability toggle
  const handleToggleAvailability = async (equipmentId, currentAvailability) => {
    try {
      await equipmentApi.updateEquipmentAvailability(
        equipmentId,
        !currentAvailability
      );
      // Update the local state instead of refetching all data
      setEquipment((prevEquipment) =>
        prevEquipment.map((item) =>
          item.id === equipmentId
            ? { ...item, availability: !currentAvailability }
            : item
        )
      );
      toast.success("Availability updated successfully!");
    } catch (err) {
      console.error("Error updating availability:", err);
      setError("Failed to update availability");
      toast.error("Failed to update availability");
    }
  };

  return (
    <div className="p-4 lg:p-8 bg-[#292A2B] min-h-screen">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[#E5E5E5] font-inter font-bold text-2xl lg:text-4xl leading-tight">
            Equipment Management
          </h1>
        </div>

        {/* Search Section */}
        <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 mb-8">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.2em] mb-6">
            Search
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Category ID */}
            <div className="flex flex-col">
              <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
                Category ID
              </label>
              <input
                type="text"
                name="categoryId"
                value={searchData.categoryId}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                style={{ height: "42px" }}
              />
            </div>

            {/* Category Name */}
            <div className="flex flex-col">
              <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
                Category Name
              </label>
              <input
                type="text"
                name="categoryName"
                value={searchData.categoryName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                style={{ height: "42px" }}
              />
            </div>

            {/* Equipment ID */}
            <div className="flex flex-col">
              <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
                Equipment ID
              </label>
              <input
                type="text"
                name="equipmentId"
                value={searchData.equipmentId}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                style={{ height: "42px" }}
              />
            </div>

            {/* Equipment Name */}
            <div className="flex flex-col">
              <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
                Equipment Name
              </label>
              <input
                type="text"
                name="equipmentName"
                value={searchData.equipmentName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
                style={{ height: "42px" }}
              />
            </div>

            {/* Search Button */}
            <div className="flex flex-col">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#FDCE06] w-[200px] rounded-md text-[#1F1F20] font-[Inter] font-bold text-[16px] leading-[1.19em] px-6 py-3 hover:bg-[#E5B800] transition-colors disabled:opacity-50"
                style={{ height: "42px" }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </section>

        {/* Equipment Table Section */}
        <section className="bg-[#1F1F20] border border-[#333333] rounded-lg">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-[#333333] gap-4">
            <h3 className="text-[#E5E5E5] font-inter font-semibold text-xl lg:text-2xl">
              Equipment
            </h3>
            <button
              onClick={handleAddEquipment}
              className="bg-[#FDCE06] rounded-md text-[#1F1F20] font-inter font-bold text-sm lg:text-base px-6 py-2 hover:bg-[#E5B800] transition-colors whitespace-nowrap"
            >
              Add Equipment
            </button>
          </div>

          {/* Table Container with Overflow */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              {/* Table Header */}
              <thead className="bg-[#292A2B]">
                <tr>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Category ID</span>
                      <div className="flex justify-center items-center mt-1">
                        <svg
                          width="8.75"
                          height="14"
                          viewBox="0 0 8.75 14"
                          fill="none"
                        >
                          <path
                            d="M0 0.876L8.75 13.127L0 0.876Z"
                            fill="#6B7280"
                          />
                        </svg>
                      </div>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Category</span>
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Equipment ID</span>
                      <div className="flex justify-center items-center mt-1">
                        <svg
                          width="8.75"
                          height="14"
                          viewBox="0 0 8.75 14"
                          fill="none"
                        >
                          <path
                            d="M0 0.876L8.75 13.127L0 0.876Z"
                            fill="#6B7280"
                          />
                        </svg>
                      </div>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Equipment</span>
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-center px-3 py-4">
                    View
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    Position
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Base</span>
                      <span>Price</span>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    <div className="flex flex-col">
                      <span>Min. Hire</span>
                      <span>Duration</span>
                    </div>
                  </th>
                  <th className="text-[#E5E5E5] font-inter font-bold text-xs lg:text-sm text-left px-3 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <ClipLoader color="#FDCE06" size={30} />
                        <span className="ml-3 text-[#E5E5E5]">
                          Loading equipment...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="text-red-500">
                        <p>{error}</p>
                        <button
                          onClick={fetchEquipment}
                          className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : equipment.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="text-[#9CA3AF]">
                        <p>No equipment found</p>
                        <button
                          onClick={handleAddEquipment}
                          className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                        >
                          Add First Equipment
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  equipment.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-[#333333] hover:bg-[#292A2B] transition-colors"
                    >
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.category_id}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.category_name}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.equipment_id}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.equipment_name}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4 flex justify-center">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-[white]/70 border border-white/50 p-3 rounded-lg font-inter font-medium text-le text-sm hover:underline transition-all"
                        >
                          View
                        </button>
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.position || "N/A"}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        ${formatMoney(item.base_price)}
                      </td>
                      <td className="text-[#E5E5E5] font-inter font-normal text-sm px-3 py-4">
                        {item.minimum_duration}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-[#FDCE06] font-inter font-medium text-sm hover:underline transition-all"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditEquipment(item)}
                            className="text-[#FDCE06] font-inter font-medium text-sm hover:underline transition-all"
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-500 font-inter font-medium text-sm hover:underline transition-all"
                            onClick={() => handleDeleteEquipment(item.id)}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center p-6 border-t border-[#333333]">
              <div className="text-[#9CA3AF] font-inter font-normal text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} equipment
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-2 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-inter font-medium text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum =
                      Math.max(
                        1,
                        Math.min(pagination.totalPages - 4, pagination.page - 2)
                      ) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border rounded-md font-inter font-medium text-sm transition-colors ${
                          pageNum === pagination.page
                            ? "bg-[#FDCE06] border-[#FDCE06] text-[#1A1A1A]"
                            : "bg-[#292A2B] border-[#333333] text-[#E5E5E5] hover:bg-[#333333]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-2 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-inter font-medium text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Add Equipment Modal */}
        <AddEquipmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveEquipment}
        />

        {/* Edit Equipment Modal */}
        <EditEquipmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEquipment(null);
          }}
          onSubmit={handleUpdateEquipment}
          equipment={selectedEquipment}
          loading={loading}
        />

        {/* Equipment Details Modal */}
        <EquipmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
          onEdit={(equip) => {
            if (equip) {
              setSelectedEquipment(equip);
            }
            setIsDetailsModalOpen(false);
            setIsEditModalOpen(true);
          }}
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
    </div>
  );
};

export default EquipmentManagement;
