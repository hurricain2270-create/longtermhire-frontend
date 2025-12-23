// @ts-nocheck
import React, { useState, useEffect } from "react";
import { contentApi } from "./services/contentApi";
import ClipLoader from "react-spinners/ClipLoader";
import AddContentModal from "./components/AddContentModal";
import EditContentModal from "./components/EditContentModal";
import ContentDetailsModal from "./components/ContentDetailsModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { isImageUrl } from "./utils/uploadUtils";
import { useNavigate, useLocation } from "react-router-dom";

const ContentManagement = () => {
  const [searchData, setSearchData] = useState({
    contentId: "",
    equipmentId: "", // Use equipmentId for ID search
    equipmentName: "",
  });

  const navigate = useNavigate();
  const location = useLocation();

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
    fetchContent(newPage, debouncedSearchData);
  };

  const [contentData, setContentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Use useLocation hook from react-router
  // const navigate = useNavigate(); // This line is already declared above, no need to redeclare
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

  // Fetch content data from API with pagination and search
  const fetchContent = async (page = 1, searchFilters = {}, showFullLoading = true) => {
    try {
      if (showFullLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await contentApi.getContent(page, 200, searchFilters);
      setContentData(data.data || []);

      // Update pagination info
      if (data.pagination) {
        setPagination(data.pagination);
        setCurrentPage(data.pagination.page);
      }
    } catch (err) {
      console.error("Error fetching content:", err);
      setError("Failed to load content");
      toast.error("Failed to load content");
    } finally {
      if (showFullLoading) {
        setLoading(false);
      }
    }
  };

  // Load content on component mount
  useEffect(() => {
    const passedEquipmentName = location.state?.equipmentName;
    if (passedEquipmentName) {
      const filters = { equipmentName: passedEquipmentName };
      setSearchData(prev => ({ ...prev, ...filters }));
      setDebouncedSearchData(filters);
      fetchContent(1, filters);
    } else {
      fetchContent(1, {});
    }
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
    fetchContent(1, debouncedSearchData, false); // Don't show full page loading on search
  }, [debouncedSearchData]);

  // Add content handlers
  const handleAddContent = () => {
    setIsAddModalOpen(true);
  };

  const handleSubmitContent = async (contentData) => {
    try {
      // Send the complete contentData including images array to backend
      const response = await contentApi.addContent(contentData);

      toast.success("Content created successfully!");
      setIsAddModalOpen(false);
      // Refresh the content list
      await fetchContent(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error creating content:", err);
      toast.error("Failed to create content. Please try again.");
    }
  };

  // Edit content handlers
  const handleEditContent = (content) => {
    setSelectedContent(content);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (content) => {
    navigate(`/content-management/${content.id}`);
  };

  const handleUpdateContent = async (contentData, contentId = null) => {
    try {
      // Use provided contentId or fall back to selectedContent
      const idToUpdate = contentId || (selectedContent && selectedContent.id);

      if (!idToUpdate) {
        console.error("No content ID provided for update");
        toast.error("No content ID provided for update");
        return;
      }

      // Send the complete contentData including images array to backend
      await contentApi.updateContent(idToUpdate, contentData);

      toast.success("Content updated successfully!");
      setIsEditModalOpen(false);
      setSelectedContent(null);
      // Refresh the content list
      await fetchContent(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error updating content:", err);
      toast.error("Failed to update content. Please try again.");
    }
  };

  // Handle content deletion
  const handleDeleteContent = async (contentId) => {
    if (!window.confirm("Are you sure you want to delete this content?")) {
      return;
    }

    try {
      await contentApi.deleteContent(contentId);
      toast.success("Content deleted successfully!");
      // Refresh the content list
      await fetchContent(currentPage, debouncedSearchData);
    } catch (err) {
      console.error("Error deleting content:", err);
      toast.error("Failed to delete content. Please try again.");
    }
  };

  const handleAction = (action, content, event) => {
    // Prevent row click when clicking action buttons
    if (event) {
      event.stopPropagation();
    }

    if (action === "Delete") {
      handleDeleteContent(content.id);
    } else if (action === "Edit") {
      handleEditContent(content);
    } else if (action === "Details") {
      handleViewDetails(content);
    } else {
      console.log(`${action} action for content ${content.id}`);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-transparent min-h-screen">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px] leading-[1.11em]">
          Content Management
        </h1>
      </header>

      {/* Search Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg sm:text-[20px] leading-[1.2em] mb-4 sm:mb-6">
          Search
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          {/* Equipment ID Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-sm leading-[1.21em] mb-2">
              Equipment ID
            </label>
            <input
              type="text"
              name="equipmentId"
              value={searchData.equipmentId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-3 outline-none focus:border-[#FDCE06] transition-colors h-[42px]"
            />
          </div>

          {/* Equipment Name Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-sm leading-[1.21em] mb-2">
              Equipment Name
            </label>
            <input
              type="text"
              name="equipmentName"
              value={searchData.equipmentName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-3 outline-none focus:border-[#FDCE06] transition-colors h-[42px]"
            />
          </div>

          {/* Search Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleSearch}
              className="bg-[#FDCE06] w-[120px] text-[#1F1F20] font-[Inter] font-bold text-sm px-4 py-2 rounded-md hover:bg-[#E5B800] transition-colors h-[42px]"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-lg sm:text-[20px] leading-[1.2em]">
            Content
          </h3>

          {/* Add Content Button */}
          <button
            onClick={handleAddContent}
            className="bg-[#FDCE06] hover:bg-[#E5B800] text-[#1F1F20] font-[Inter] font-bold text-sm px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
          >
            Add Content
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            {/* Table Header */}
            <thead className="bg-[#292A2B]">
              <tr>
                <th className="text-left text-[#E5E5E5] font-[Inter] font-bold text-sm px-3 py-3">
                  Equipment ID
                  <span className="inline-block w-2 h-3.5 ml-1">
                    <svg
                      width="8.75"
                      height="14"
                      viewBox="0 0 9 14"
                      fill="none"
                    >
                      <path
                        d="M4.375 0.875L8.75 5.25H0L4.375 0.875Z"
                        fill="#6B7280"
                      />
                      <path
                        d="M4.375 13.125L0 8.75H8.75L4.375 13.125Z"
                        fill="#6B7280"
                      />
                    </svg>
                  </span>
                </th>
                <th className="text-left text-[#E5E5E5] font-[Inter] font-bold text-sm px-3 py-3">
                  Equipment Name
                  <span className="inline-block w-2 h-3.5 ml-1">
                    <svg
                      width="8.75"
                      height="14"
                      viewBox="0 0 9 14"
                      fill="none"
                    >
                      <path
                        d="M4.375 0.875L8.75 5.25H0L4.375 0.875Z"
                        fill="#6B7280"
                      />
                      <path
                        d="M4.375 13.125L0 8.75H8.75L4.375 13.125Z"
                        fill="#6B7280"
                      />
                    </svg>
                  </span>
                </th>
                <th className="text-left text-[#E5E5E5] font-[Inter] font-bold text-sm px-3 py-3">
                  Description
                  <span className="inline-block w-2 h-3.5 ml-1">
                    <svg
                      width="8.75"
                      height="14"
                      viewBox="0 0 9 14"
                      fill="none"
                    >
                      <path
                        d="M4.375 0.875L8.75 5.25H0L4.375 0.875Z"
                        fill="#6B7280"
                      />
                      <path
                        d="M4.375 13.125L0 8.75H8.75L4.375 13.125Z"
                        fill="#6B7280"
                      />
                    </svg>
                  </span>
                </th>

                <th className="text-left text-[#E5E5E5] font-[Inter] font-bold text-sm px-3 py-3">
                  Image
                  <span className="inline-block w-2 h-3.5 ml-1">
                    <svg
                      width="8.75"
                      height="14"
                      viewBox="0 0 9 14"
                      fill="none"
                    >
                      <path
                        d="M4.375 0.875L8.75 5.25H0L4.375 0.875Z"
                        fill="#6B7280"
                      />
                      <path
                        d="M4.375 13.125L0 8.75H8.75L4.375 13.125Z"
                        fill="#6B7280"
                      />
                    </svg>
                  </span>
                </th>
                <th className="text-left text-[#E5E5E5] font-[Inter] font-bold text-sm px-3 py-3">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <ClipLoader color="#FDCE06" size={30} />
                      <span className="ml-3 text-[#E5E5E5]">
                        Loading content...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <div className="text-red-500">
                      <p>{error}</p>
                      <button
                        onClick={fetchContent}
                        className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : contentData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <div className="text-[#9CA3AF]">
                      <p>No content found</p>
                      <button
                        onClick={() => console.log("Add first content")}
                        className="mt-2 px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded-md hover:bg-[#E5B800] transition-colors"
                      >
                        Add First Content
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contentData.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer hover:bg-[#292A2B] transition-colors ${index > 0 ? "border-t border-[#333333]" : ""
                      }`}
                    onClick={() => handleViewDetails(item)}
                    style={{
                      height: index === 0 || index === 4 ? "64.5px" : "65px",
                    }}
                  >
                    <td
                      className="text-[#E5E5E5]"
                      style={{
                        width:
                          index === 0 || index === 4 ? "129.97px" : "129.97px",
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "17px",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          marginTop:
                            index === 0 || index === 4 ? "9.9px" : "10.4px",
                        }}
                      >
                        {item.equipment_id || "N/A"}
                      </div>
                    </td>
                    <td
                      className="text-[#E5E5E5]"
                      style={{
                        width: "157.14px",
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "17px",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          marginTop:
                            index === 0 || index === 4 ? "9.9px" : "10.4px",
                        }}
                      >
                        {item.equipment_name}
                      </div>
                    </td>
                    <td
                      className="text-[#E5E5E5]"
                      style={{
                        width: "267.5px",
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "17px",
                        padding: "12px",
                      }}
                    >
                      {Array.isArray(item.description) ? (
                        <div>
                          <div style={{ marginTop: "0.4px" }} dangerouslySetInnerHTML={{ __html: item.description[0] }} />
                          <div style={{ marginTop: "20px" }} dangerouslySetInnerHTML={{ __html: item.description[1] }} />
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop:
                              index === 0 || index === 4 ? "9.9px" : "10.4px",
                          }}
                          dangerouslySetInnerHTML={{ __html: item.description || '' }}
                        />
                      )}
                    </td>

                    <td
                      className="text-[#E5E5E5]"
                      style={{
                        width: "136.61px",
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "17px",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          marginTop:
                            index === 0 || index === 4 ? "9.9px" : "10.4px",
                        }}
                      >
                        {item.images &&
                          Array.isArray(item.images) &&
                          item.images.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {/* Show only main image in table */}
                            {(() => {
                              const mainImage = item.images.find(
                                (img) =>
                                  img.is_main === 1 || img.is_main === true
                              );
                              if (mainImage) {
                                return (
                                  <div className="relative">
                                    <img
                                      src={mainImage.image_url}
                                      alt={mainImage.caption || "Equipment"}
                                      className="w-16 h-12 object-cover rounded border border-[#333333]"
                                    />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FDCE06] rounded-full flex items-center justify-center">
                                      <svg
                                        className="w-2 h-2 text-[#1A1A1A]"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : item.image_url && isImageUrl(item.image_url) ? (
                          <img
                            src={item.image_url}
                            alt="Equipment"
                            className="w-16 h-12 object-cover rounded border border-[#333333]"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-[#333333] rounded border border-[#444444] flex items-center justify-center">
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
                      </div>
                    </td>
                    <td
                      className="text-[#FDCE06]"
                      style={{
                        width: "111.28px",
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "20px",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          marginTop:
                            index === 0 || index === 4 ? "8.8px" : "9.3px",
                        }}
                      >
                        <button
                          onClick={(e) => handleAction("Edit", item, e)}
                          className="text-[#FDCE06] hover:underline mr-4"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Inter",
                            fontWeight: 400,
                            fontSize: "14px",
                            lineHeight: "20px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleAction("Details", item, e)}
                          className="text-[#FDCE06] hover:underline mr-4"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Inter",
                            fontWeight: 400,
                            fontSize: "14px",
                            lineHeight: "20px",
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={(e) => handleAction("Delete", item, e)}
                          className="text-red-500 hover:underline"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Inter",
                            fontWeight: 400,
                            fontSize: "14px",
                            lineHeight: "20px",
                          }}
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
              of {pagination.total} content items
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
                      className={`px-3 py-2 border rounded-md font-inter font-medium text-sm transition-colors ${pageNum === pagination.page
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

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmitContent}
        loading={loading}
      />

      {/* Edit Content Modal */}
      <EditContentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContent(null);
        }}
        onSubmit={handleUpdateContent}
        content={selectedContent}
        loading={loading}
      />

      {/* Content Details Modal */}
      <ContentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedContent(null);
        }}
        content={selectedContent}
        onEdit={handleEditContent}
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

export default ContentManagement;
