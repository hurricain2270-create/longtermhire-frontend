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
import { BTN } from "./styles/buttons";
import api from "./services/api";
import { equipmentApi } from "./services/equipmentApi";

const CHIP = (on) =>
  "px-3 py-1.5 rounded-full font-[Inter] text-[14px] transition-colors border " +
  (on
    ? "bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06] font-bold"
    : "bg-[#292A2B] text-[#9CA3AF] border-[#333] hover:border-[#FDCE06] hover:text-[#FDCE06]");

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
  const [descFilter, setDescFilter] = useState("all");
  const [imgFilter, setImgFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [hireFilter, setHireFilter] = useState("all");

  // Every machine, so ones with no content record still get a tile — those
  // are precisely the ones needing attention, and the content list can't
  // return them because the row doesn't exist yet.
  const [allEquipment, setAllEquipment] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await equipmentApi.getEquipment(1, 200, {});
        setAllEquipment((res && res.data) || []);
      } catch (e) {
        console.error("Could not load equipment list:", e);
      }
    })();
  }, []);

  // Which machines are currently out on hire. Same source Equipment
  // Management uses, so the two pages can never disagree.
  const [onHireIds, setOnHireIds] = useState(new Set());
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/fleet-report");
        if (res && res.data && !res.data.error) {
          const hires = (res.data.data && res.data.data.hires) || [];
          setOnHireIds(
            new Set(
              hires
                .filter((h) => h.hire_status === "active")
                .map((h) => String(h.equipment_id))
            )
          );
        }
      } catch (e) {
        console.error("Could not load hire status:", e);
      }
    })();
  }, []);
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

  // What still needs content written. Everything loads in one page and the
  // fleet is small, so this is worked out here rather than on the server.
  const hasDesc = (it) => String(it.description || "").trim().length > 0;
  const photoCount = (it) =>
    Array.isArray(it.images) && it.images.length > 0
      ? it.images.length
      : it.image_url ? 1 : 0;
  const hasImg = (it) => photoCount(it) > 0;

  // specs_files comes back from the equipment table as a JSON string.
  const specCount = (it) => {
    const raw = it.specs_files;
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.length;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : parsed ? 1 : 0;
    } catch (e) {
      return String(raw).trim() ? 1 : 0;
    }
  };
  const hasSpec = (it) => specCount(it) > 0;
  const isOnHire = (it) => onHireIds.has(String(it._eqId));

  // One row per machine. Content is merged on where it exists; where it
  // doesn't, the tile still appears with nothing filled in.
  const rows = allEquipment.length
    ? allEquipment.map((eq) => {
        const found = contentData.find(
          (ct) => String(ct.content_equipment_id) === String(eq.id)
        );
        return found
          ? { ...found, _eqId: eq.id, equipment_id: eq.equipment_id, equipment_name: eq.equipment_name }
          : {
              id: "eq-" + eq.id,
              _eqId: eq.id,
              _noContent: true,
              equipment_id: eq.equipment_id,
              equipment_name: eq.equipment_name,
              description: "",
              images: [],
              specs_files: eq.specs_files,
            };
      })
    : contentData.map((ct) => ({ ...ct, _eqId: ct.content_equipment_id }));

  const matchesDesc = (it) =>
    descFilter === "all" || (descFilter === "yes" ? hasDesc(it) : !hasDesc(it));
  const matchesImg = (it) =>
    imgFilter === "all" || (imgFilter === "yes" ? hasImg(it) : !hasImg(it));
  const matchesSpec = (it) =>
    specFilter === "all" || (specFilter === "yes" ? hasSpec(it) : !hasSpec(it));
  const matchesHire = (it) =>
    hireFilter === "all" || (hireFilter === "on" ? isOnHire(it) : !isOnHire(it));

  // Each count reflects the other filters, so a chip shows what clicking it gives.
  const tally = (pred, skip) =>
    rows.filter(
      (it) =>
        (skip === "desc" || matchesDesc(it)) &&
        (skip === "img" || matchesImg(it)) &&
        (skip === "spec" || matchesSpec(it)) &&
        (skip === "hire" || matchesHire(it)) &&
        pred(it)
    ).length;
  const countDesc = (v) =>
    tally((it) => v === "all" || (v === "yes" ? hasDesc(it) : !hasDesc(it)), "desc");
  const countImg = (v) =>
    tally((it) => v === "all" || (v === "yes" ? hasImg(it) : !hasImg(it)), "img");
  const countSpec = (v) =>
    tally((it) => v === "all" || (v === "yes" ? hasSpec(it) : !hasSpec(it)), "spec");
  const countHire = (v) =>
    tally((it) => v === "all" || (v === "on" ? isOnHire(it) : !isOnHire(it)), "hire");

  // The query returns newest first; the grid reads better by plant number.
  const visible = rows
    .filter((it) => matchesDesc(it) && matchesImg(it) && matchesSpec(it) && matchesHire(it))
    .slice()
    .sort((a, b) =>
      String(a.equipment_id || "").localeCompare(String(b.equipment_id || ""),
        undefined, { numeric: true, sensitivity: "base" })
    );

  const filtersActive =
    descFilter !== "all" || imgFilter !== "all" ||
    specFilter !== "all" || hireFilter !== "all";

  const mainPhoto = (it) => {
    if (Array.isArray(it.images) && it.images.length) {
      const main = it.images.find((i) => i.is_main === 1 || i.is_main === true);
      return (main || it.images[0]).image_url;
    }
    return it.image_url || null;
  };

  return (
    <div className="p-4 sm:p-8 bg-transparent min-h-screen">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px] leading-[1.11em]">
          Content Management
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Manage equipment descriptions, images and banners shown to clients in the equipment portal.</p>
      </header>

      {/* Filters */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { key: "all", label: "All", n: rows.length, on: descFilter === "all" && imgFilter === "all" && specFilter === "all",
              act: () => { setDescFilter("all"); setImgFilter("all"); setSpecFilter("all"); } },
            { key: "desc", label: "No description", n: countDesc("no"), on: descFilter === "no",
              act: () => setDescFilter(descFilter === "no" ? "all" : "no") },
            { key: "img", label: "No photos", n: countImg("no"), on: imgFilter === "no",
              act: () => setImgFilter(imgFilter === "no" ? "all" : "no") },
            { key: "spec", label: "No spec", n: countSpec("no"), on: specFilter === "no",
              act: () => setSpecFilter(specFilter === "no" ? "all" : "no") },
          ].map((o) => (
            <button key={o.key} onClick={o.act} className={CHIP(o.on)}>
              {o.label} <span className="opacity-60">{o.n}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "on", label: "On hire" },
            { key: "off", label: "Not on hire" },
          ].map((o) => (
            <button key={o.key} onClick={() => setHireFilter(o.key)} className={CHIP(hireFilter === o.key)}>
              {o.label} <span className="opacity-60">{countHire(o.key)}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A2A2A]">
          <div className="text-[#9CA3AF] font-[Inter] text-[14px]">
            Showing {visible.length} of {rows.length} machines
          </div>
          {filtersActive && (
            <button
              onClick={() => { setDescFilter("all"); setImgFilter("all"); setSpecFilter("all"); setHireFilter("all"); }}
              className={BTN.secondarySm}
            >
              Clear filters
            </button>
          )}
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
            className={BTN.primary + " w-full sm:w-auto"}
          >
            Add Content
          </button>
        </div>

        {/* Tile grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <ClipLoader color="#FDCE06" size={40} />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] font-[Inter] text-[14px]">
            Nothing matches those filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map((item) => {
              const photo = mainPhoto(item);
              const pc = photoCount(item);
              const sc = specCount(item);
              const onHire = isOnHire(item);
              return (
                <div key={item.id}
                  className="bg-[#292A2B] border border-[#333333] rounded-xl overflow-hidden">
                  <div className="relative">
                    {photo ? (
                      <div className="w-full aspect-[4/3] bg-[#1F1F20] border-b border-[#333333] flex items-center justify-center">
                        <img src={photo} alt={item.equipment_name || "Machine"}
                          className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-1.5 bg-[#3a2f14] border-b border-[#333333]">
                        <span className="text-[#F59E0B] text-[26px] leading-none">⌷</span>
                        <span className="text-[#F59E0B] font-[Inter] text-[13px]">No photos yet</span>
                      </div>
                    )}
                    {onHire && (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#14352a] text-[#4CAF50] font-[Inter] text-[12px]">
                        On hire
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    <div className="text-[#E5E5E5] font-[Inter] text-[15px] font-semibold">
                      {item.equipment_name || "Unnamed"}
                    </div>
                    <div className="text-[#6B7280] font-[Inter] text-[13px] mt-0.5 mb-2.5">
                      {item.equipment_id || "—"}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-[Inter] text-[13px] mb-3">
                      <span className={hasDesc(item) ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                        {hasDesc(item) ? "Written" : "No description"}
                      </span>
                      <span className={pc > 0 ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                        {pc} {pc === 1 ? "photo" : "photos"}
                      </span>
                      <span className={sc > 0 ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                        {sc > 0 ? sc + (sc === 1 ? " spec" : " specs") : "No spec"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {item._noContent ? (
                        <button onClick={handleAddContent} className={BTN.primarySm}>
                          Add content
                        </button>
                      ) : (
                        <>
                          <button onClick={(e) => handleAction("Edit", item, e)} className={BTN.editSm}>
                            Edit
                          </button>
                          <button onClick={(e) => handleAction("Details", item, e)} className={BTN.primarySm}>
                            Details
                          </button>
                          <button onClick={(e) => handleAction("Delete", item, e)}
                            className={BTN.dangerSm + " ml-auto"}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}


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
