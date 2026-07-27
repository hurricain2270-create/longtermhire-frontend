// @ts-nocheck
import React, { useState, useEffect } from "react";
import AddEquipmentModal from "./components/AddEquipmentModal";
import EditEquipmentModal from "./components/EditEquipmentModal";
import EquipmentDetailsModal from "./components/EquipmentDetailsModal";
import { equipmentApi } from "./services/equipmentApi";
import { contentApi } from "./services/contentApi";
import api from "./services/api";
import ClipLoader from "react-spinners/ClipLoader";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router";
import { BTN } from "./styles/buttons";
import MachineEditor from "./components/MachineEditor";

// Filter chip. Selected reads as the yellow the rest of the app uses for
// "this is the active thing".
const CHIP = (on) =>
  "px-3 py-1.5 rounded-full font-[Inter] text-[14px] transition-colors border " +
  (on
    ? "bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06] font-bold"
    : "bg-[#292A2B] text-[#9CA3AF] border-[#333] hover:border-[#FDCE06] hover:text-[#FDCE06]");

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
  const [hireFilter, setHireFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [gapFilter, setGapFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
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

  // Which equipment is currently out on hire
  // Listing content lives in its own table, but it belongs to the machine —
  // so it's loaded here and merged on, rather than living on a separate page.
  const [contentRows, setContentRows] = useState([]);
  const loadContent = async () => {
    try {
      const res = await contentApi.getContent(1, 200, {});
      setContentRows((res && res.data) || []);
    } catch (e) {
      console.error("Could not load listing content:", e);
    }
  };
  useEffect(() => { loadContent(); }, []);

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
        console.error("Could not load hire status for colour coding:", e);
      }
    })();
  }, []);
  const isOnHire = (item) => onHireIds.has(String(item.id));

  const contentFor = (item) =>
    contentRows.find((ct) => String(ct.content_equipment_id) === String(item.id)) || null;

  const photosOf = (item) => {
    const ct = contentFor(item);
    if (!ct) return [];
    if (Array.isArray(ct.images) && ct.images.length) return ct.images;
    return ct.image_url ? [{ id: "legacy", image_url: ct.image_url, is_main: 1 }] : [];
  };
  const mainPhoto = (item) => {
    const ph = photosOf(item);
    if (!ph.length) return null;
    return (ph.find((p) => p.is_main === 1 || p.is_main === true) || ph[0]).image_url;
  };
  const descOf = (item) => String((contentFor(item) || {}).description || "").trim();

  // specs_files is a JSON string on the equipment row.
  const specCount = (item) => {
    const raw = item.specs_files;
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.length;
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.length : p ? 1 : 0;
    } catch (e) {
      return String(raw).trim() ? 1 : 0;
    }
  };

  // Everything loads in one page (limit 200) and the fleet is small, so
  // filtering happens here rather than round-tripping for every keystroke.
  // No search box — the chips and a fleet this size make it unnecessary.
  const matchesText = (item) => {
    const t = "";
    if (!t) return true;
    return [item.equipment_name, item.equipment_id, item.category_name]
      .some((v) => String(v || "").toLowerCase().includes(t));
  };
  const matchesHire = (item) =>
    hireFilter === "all" ||
    (hireFilter === "on" ? isOnHire(item) : !isOnHire(item));
  const matchesGap = (item) => {
    if (gapFilter === "all") return true;
    if (gapFilter === "desc") return descOf(item).length === 0;
    if (gapFilter === "photo") return photosOf(item).length === 0;
    if (gapFilter === "spec") return specCount(item) === 0;
    if (gapFilter === "price") return !item.base_price;
    return true;
  };
  const countGap = (val) =>
    equipment.filter((i) => {
      if (!matchesText(i) || !matchesHire(i) || !matchesCategory(i)) return false;
      if (val === "all") return true;
      if (val === "desc") return descOf(i).length === 0;
      if (val === "photo") return photosOf(i).length === 0;
      if (val === "spec") return specCount(i) === 0;
      if (val === "price") return !i.base_price;
      return true;
    }).length;

  const matchesCategory = (item) =>
    categoryFilter === "all" || (item.category_name || "Uncategorised") === categoryFilter;

  // Counts reflect the *other* filters, so a chip shows what you would actually
  // get if you clicked it — not a total that ignores what is already selected.
  const countHire = (val) =>
    equipment.filter((i) => matchesText(i) && matchesCategory(i) &&
      (val === "all" || (val === "on" ? isOnHire(i) : !isOnHire(i)))).length;
  const countCategory = (val) =>
    equipment.filter((i) => matchesText(i) && matchesHire(i) &&
      (val === "all" || (i.category_name || "Uncategorised") === val)).length;

  // The select needs ids, not just names — derive both from the fleet.
  const categoryOptions = Array.from(
    new Map(
      equipment
        .filter((i) => i.category_id)
        .map((i) => [String(i.category_id), { id: i.category_id, category_name: i.category_name || "Uncategorised" }])
    ).values()
  ).sort((a, b) => a.category_name.localeCompare(b.category_name));

  const categories = Array.from(
    new Set(equipment.map((i) => i.category_name || "Uncategorised"))
  ).sort();

  const visible = equipment
    .filter((i) => matchesText(i) && matchesHire(i) && matchesCategory(i) && matchesGap(i))
    .slice()
    .sort((a, b) =>
      String(a.equipment_id || "").localeCompare(String(b.equipment_id || ""),
        undefined, { numeric: true, sensitivity: "base" })
    );
  const filtersActive =
    hireFilter !== "all" || categoryFilter !== "all" || gapFilter !== "all";

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
          <p className="text-[#9CA3AF] text-sm mt-1">Add and maintain your equipment fleet — categories, pricing, availability and specifications.</p>
        </div>

        {editingId ? (
          (() => {
            const idx = visible.findIndex((i) => String(i.id) === String(editingId));
            const machine = visible[idx] || equipment.find((i) => String(i.id) === String(editingId));
            if (!machine) return null;
            return (
              <MachineEditor
                machine={machine}
                content={contentFor(machine)}
                categories={categoryOptions}
                onHire={isOnHire(machine)}
                index={idx < 0 ? 0 : idx}
                total={visible.length}
                onPrev={() => idx > 0 && setEditingId(visible[idx - 1].id)}
                onNext={() => idx < visible.length - 1 && setEditingId(visible[idx + 1].id)}
                onBack={() => setEditingId(null)}
                onSaved={() => { fetchEquipment(); loadContent(); }}
              />
            );
          })()
        ) : (
        <>
        {/* Filters */}
        <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-5 mb-8">
          <div className="mb-3">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
              Hire status
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "on", label: "On hire" },
                { key: "off", label: "Not on hire" },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setHireFilter(o.key)}
                  className={CHIP(hireFilter === o.key)}
                >
                  {o.label} <span className="opacity-60">{countHire(o.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
              Needs attention
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "desc", label: "No description" },
                { key: "photo", label: "No photos" },
                { key: "spec", label: "No spec" },
                { key: "price", label: "No price" },
              ].map((o) => (
                <button key={o.key} onClick={() => setGapFilter(o.key)}
                  className={CHIP(gapFilter === o.key)}>
                  {o.label} <span className="opacity-60">{countGap(o.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
              Category
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategoryFilter("all")} className={CHIP(categoryFilter === "all")}>
                All <span className="opacity-60">{countCategory("all")}</span>
              </button>
              {categories.map((cat) => {
                const n = countCategory(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    disabled={n === 0 && categoryFilter !== cat}
                    className={CHIP(categoryFilter === cat) + (n === 0 ? " opacity-40" : "")}
                  >
                    {cat} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A2A2A]">
            <div className="text-[#9CA3AF] font-[Inter] text-[14px]">
              Showing {visible.length} of {equipment.length} machines
            </div>
            {filtersActive && (
              <button
                onClick={() => { setHireFilter("all"); setCategoryFilter("all"); setGapFilter("all"); }}
                className={BTN.secondarySm}
              >
                Clear filters
              </button>
            )}
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
              className={BTN.primary}
            >
              Add Equipment
            </button>
          </div>

          {/* Tile grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <ClipLoader color="#FDCE06" size={40} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-3">{error}</p>
              <button onClick={fetchEquipment} className={BTN.primary}>Retry</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-[#9CA3AF] font-[Inter] text-[14px]">
              Nothing matches those filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-4 gap-x-12">
              {visible.map((item) => {
                const photo = mainPhoto(item);
                const pc = photosOf(item).length;
                const sc = specCount(item);
                const written = descOf(item).length > 0;
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
                          <span className="text-[#F59E0B] font-[Inter] text-[24px]">No photos yet</span>
                        </div>
                      )}
                      {isOnHire(item) && (
                        <span className="absolute top-3 right-3 px-4 py-1.5 rounded-full bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[20px]">
                          On hire
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="text-[#E5E5E5] font-[Inter] text-[30px] leading-tight font-semibold">
                        {item.equipment_name || "Unnamed"}
                      </div>
                      <div className="text-[#9CA3AF] font-[Inter] text-[22px] mt-1 mb-3.5">
                        {item.equipment_id || "—"}
                        {item.category_name ? " · " + item.category_name : ""}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 font-[Inter] text-[22px] mb-4">
                        <span className={written ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                          {written ? "Written" : "No description"}
                        </span>
                        <span className={pc > 0 ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                          {pc} {pc === 1 ? "photo" : "photos"}
                        </span>
                        <span className={sc > 0 ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                          {sc > 0 ? sc + (sc === 1 ? " spec" : " specs") : "No spec"}
                        </span>
                        <span className={item.base_price ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>
                          {item.base_price ? "Priced" : "No price"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(item.id)} className={BTN.editLg}>
                          Edit
                        </button>
                        <button onClick={() => handleViewDetails(item)} className={BTN.primaryLg}>
                          Details
                        </button>
                        <button onClick={() => handleDeleteEquipment(item.id)}
                          className={BTN.dangerLg + " ml-auto"}>
                          Delete
                        </button>
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

        </>
        )}

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
</div>
    </div>
  );
};

export default EquipmentManagement;
