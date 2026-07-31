// @ts-nocheck
import { useState, useEffect, Fragment } from "react";
import { ClipLoader } from "react-spinners";
import api from "./services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddClientModal from "./components/AddClientModal";
import EditClientModal from "./components/EditClientModal";
import { BTN } from "./styles/buttons";
import ClientDetailsModal from "./components/ClientDetailsModal";
import EquipmentPopover from "./components/EquipmentPopover";

import { clientApi } from "./services/clientApi";
import { equipmentApi } from "./services/equipmentApi";
import { useNavigate } from "react-router";

// Filter chip — yellow when active, matching how the rest of the app marks
// "this is the thing you have selected".
const CHIP = (on) =>
  "px-3 py-1.5 rounded-full font-[Inter] text-[14px] transition-colors border " +
  (on
    ? "bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06] font-bold"
    : "bg-[#292A2B] text-[#9CA3AF] border-[#333] hover:border-[#FDCE06] hover:text-[#FDCE06]");

const ClientManagement = () => {
  const [searchData, setSearchData] = useState({
    clientId: "",
    clientName: "",
    companyName: "",
  });
  const navigate = useNavigate();
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] =
    useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

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

  // Equipment popover state
  const [equipmentPopover, setEquipmentPopover] = useState({
    isOpen: false,
    clientId: null,
    anchorEl: null,
  });

  // API data states
  const [clients, setClients] = useState([]);
  const [inviteFilter, setInviteFilter] = useState("all");
  const [kitFilter, setKitFilter] = useState("all");

  // Onboarding submissions. A client who has sent their details but does not
  // exist as a company yet — same page, earlier stage.
  const [subs, setSubs] = useState([]);
  const [showSubs, setShowSubs] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({ contact_name: "", email: "" });

  const loadSubs = async () => {
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/onboarding");
      if (res?.data && !res.data.error) setSubs(res.data.data || []);
    } catch (e) {
      console.error("Could not load submissions:", e);
    }
  };
  useEffect(() => { loadSubs(); }, []);

  const waiting = subs.filter((s) => s.status === "submitted");

  const sendInvite = async () => {
    if (!invite.email) { toast.error("Put in an email"); return; }
    try {
      const res = await api.post("/v1/api/longtermhire/super_admin/onboarding/invite", invite);
      if (res?.data?.error) throw new Error();
      toast.success(res.data.data.sent ? "Form sent" : "Created, but the email did not go");
      setInvite({ contact_name: "", email: "" });
      setInviting(false);
      loadSubs();
    } catch (e) {
      toast.error("Could not send that");
    }
  };

  const createFromSub = async (s) => {
    if (!window.confirm("Create " + s.business_name + " as a company?")) return;
    try {
      const res = await api.post("/v1/api/longtermhire/super_admin/onboarding/" + s.id + "/create", {});
      if (res?.data?.error) throw new Error(res.data.message);
      toast.success(res.data.message || "Company created");
      loadSubs();
      loadInitialData();
    } catch (e) {
      toast.error("Could not create that");
    }
  };
  const [companyMembers, setCompanyMembers] = useState([]);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [equipment, setEquipment] = useState([]);

  // Track equipment assignments per client
  const [clientEquipment, setClientEquipment] = useState({});

  // Loading states
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Load equipment master list in background
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const response = await equipmentApi.getEquipment(1, 1000);
        setEquipment(response.data || []);
      } catch (error) {
        console.error("Error loading equipment master list:", error);
      }
    };
    loadEquipment();
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
    loadInitialData(1, debouncedSearchData, true);
  }, [debouncedSearchData]);

  const handleResendMember = async (member) => {
    if (!window.confirm("Send " + member.member_name + " new login details? This resets their password and emails it to " + member.member_email + ".")) return;
    try {
      await clientApi.resendInvitation(member.user_id);
      toast.success("New login details sent to " + member.member_email);
    } catch (e) {
      toast.error(e?.message || "Failed to resend invitation");
    }
  };

  // Additional users on the same company as this owner
  const membersForOwner = (ownerUserId) =>
    companyMembers.filter(
      (m) =>
        String(m.owner_user_id) === String(ownerUserId) &&
        String(m.user_id) !== String(ownerUserId)
    );

  const loadInitialData = async (
    page = 1,
    searchFilters = {},
    showFullLoading = true
  ) => {
    try {
      if (showFullLoading) {
        setLoading(true);
      }
      const clientsRes = await clientApi.getClients(page, 200, searchFilters);
      const clientsData = clientsRes.data || [];
      setClients(clientsData);

      // Company members, so additional users group under their owner
      try {
        const membersRes = await api.get(
          "/v1/api/longtermhire/super_admin/company-members"
        );
        if (membersRes?.data && !membersRes.data.error) {
          setCompanyMembers(membersRes.data.data || []);
        }
      } catch (e) {
        // grouping is a nicety — never block the client list on it
      }

      // Update pagination info
      if (clientsRes.pagination) {
        setPagination(clientsRes.pagination);
        setCurrentPage(clientsRes.pagination.page);
      }

      // Load assignments from pre-loaded data
      await loadClientAssignments(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data. Please try again.");
    } finally {
      if (showFullLoading) {
        setLoading(false);
      }
    }
  };

  // Load equipment assignments for all clients
  const loadClientAssignments = (clientsData) => {
    try {
      const equipmentAssignments = {};

      if (Array.isArray(clientsData)) {
        clientsData.forEach(client => {
          if (client.equipment && Array.isArray(client.equipment)) {
            equipmentAssignments[client.user_id] = client.equipment;
          }
        });
      }

      setClientEquipment(equipmentAssignments);
    } catch (error) {
      console.error("Error processing client equipment:", error);
    }
  };

  // Onboarding checklist — add to this as more setup steps appear
  const setupStatus = (client) => {
    const items = [
      { label: "Quote terms", done: Number(client.has_terms) > 0 },
      { label: "Equipment assigned", done: Number(client.equipment_count) > 0 },
      {
        label: "Pricing",
        done:
          !!client.pricing_package_id || Number(client.has_custom_discounts) > 0,
      },
      { label: "Welcome note", done: Number(client.has_welcome) > 0 },
    ];
    return {
      items,
      missing: items.filter((i) => !i.done),
      done: items.filter((i) => i.done).length,
      total: items.length,
    };
  };

  const handleResendInvitation = async (client) => {
    const firstTime = !client.invited_at;
    try {
      await clientApi.resendInvitation(client.user_id);
      toast.success(
        (firstTime ? "Invitation sent to " : "New login details sent to ") +
          (client.email || client.client_name)
      );
      // Refresh so the invited badge and button state update straight away
      loadInitialData(currentPage, searchData);
    } catch (error) {
      toast.error(error.message || "Failed to send invitation");
    }
  };

  const handleInviteClient = async (clientData) => {
    try {
      setInviteLoading(true);
      await clientApi.inviteClient(clientData);
      toast.success("Client invited successfully! Invitation email sent.");
      setIsAddClientModalOpen(false);
      loadInitialData(); // Reload clients
    } catch (error) {
      console.error("Error inviting client:", error);
      toast.error(error.message || "Error inviting client. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await clientApi.deleteClient(clientId);
        toast.success("Client deleted successfully!");
        loadInitialData(currentPage, searchData); // Reload current page
      } catch (error) {
        console.error("Error deleting client:", error);
        toast.error(
          error.message || "Error deleting client. Please try again."
        );
      }
    }
  };

  const handleAssignEquipment = async (clientUserId, equipmentIds) => {
    try {
      setAssignmentLoading(true);
      await clientApi.assignEquipment(clientUserId, equipmentIds);
      toast.success("Equipment assigned successfully!");
      // Don't reload entire page, just update silently
    } catch (error) {
      console.error("Error assigning equipment:", error);
      toast.error(
        error.message || "Error assigning equipment. Please try again."
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Get all available equipment options from API data
  const getAllEquipmentOptions = () => {
    return equipment.map((item) => ({
      id: item.id,
      name: item.equipment_name,
      category: item.category_name,
      available: item.availability,
    }));
  };

  // Helper function to get assigned equipment names
  const getAssignedEquipmentNames = (clientUserId) => {
    const assignedEquipment = clientEquipment[clientUserId] || [];
    return assignedEquipment
      .map((item) => {
        // Handle both simple IDs and full objects from consolidated API
        if (typeof item === 'object') {
          return item.equipment_name || item.name || `Equipment ${item.equipment_id || item.id}`;
        }
        const equipmentItem = equipment.find((eq) => eq.id === item);
        return equipmentItem
          ? String(equipmentItem.equipment_name)
          : `Equipment ${item}`;
      })
      .filter(Boolean);
  };

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
    loadInitialData(newPage, debouncedSearchData);
  };

  const handleAddClient = () => {
    setIsAddClientModalOpen(true);
  };

  // Edit client handlers
  const handleEditClient = (client) => {
    setSelectedClient(client);
    setIsEditClientModalOpen(true);
  };

  // View client details handler
  const handleViewClientDetails = (client) => {
    navigate(`/client-management/${client.company_id}`);
  };

  const handleUpdateClient = async (clientData) => {
    try {
      setInviteLoading(true);
      await clientApi.updateClient(selectedClient.id, clientData);
      toast.success("Client updated successfully!");
      setIsEditClientModalOpen(false);
      setSelectedClient(null);
      loadInitialData(currentPage, searchData); // Reload current page
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Error updating client. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Equipment assignment handlers
  const handleEquipmentAssign = (clientUserId, event) => {
    setEquipmentPopover({
      isOpen: true,
      clientId: clientUserId,
      anchorEl: event.currentTarget,
    });
  };

  const handleEquipmentApply = async (selectedEquipmentIds) => {
    if (equipmentPopover.clientId) {
      try {
        await handleAssignEquipment(
          equipmentPopover.clientId,
          selectedEquipmentIds
        );

        // Convert equipment IDs to full equipment objects for UI
        const selectedEquipmentObjects = selectedEquipmentIds.map(
          (equipmentId) => {
            const fullEquipment = equipment.find((eq) => eq.id === equipmentId);
            return (
              fullEquipment || {
                id: equipmentId,
                equipment_id: equipmentId,
                equipment_name: `Equipment ${equipmentId}`,
                category_name: "N/A",
              }
            );
          }
        );

        // Update local state for UI
        setClientEquipment((prev) => ({
          ...prev,
          [equipmentPopover.clientId]: selectedEquipmentObjects,
        }));
      } catch (error) {
        console.error("Error applying equipment assignment:", error);
      }
    }
    setEquipmentPopover({ isOpen: false, clientId: null, anchorEl: null });
  };

  // Show loading spinner while data is loading
  if (loading) {
    return (
      <div className="p-8 bg-[#292A2B] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <p className="text-[#E5E5E5] mt-4">Loading clients...</p>
        </div>
      </div>
    );
  }

  // The whole list arrives in one page (limit 200) and there are tens of
  // clients, not thousands, so filtering happens here rather than round-tripping.
  // No search box: the whole client list fits on one screen.
  const matchesText = () => true;
  const isInvited = (cl) => !!cl.invited_at;
  const hasKit = (cl) => Number(cl.equipment_count || 0) > 0;

  const matchesInvite = (cl) =>
    inviteFilter === "all" || (inviteFilter === "yes" ? isInvited(cl) : !isInvited(cl));
  const matchesKit = (cl) =>
    kitFilter === "all" || (kitFilter === "yes" ? hasKit(cl) : !hasKit(cl));

  // Counts reflect the other filters, so a chip shows what clicking it gives you.
  const countInvite = (val) =>
    clients.filter((c2) => matchesText(c2) && matchesKit(c2) &&
      (val === "all" || (val === "yes" ? isInvited(c2) : !isInvited(c2)))).length;
  const countKit = (val) =>
    clients.filter((c2) => matchesText(c2) && matchesInvite(c2) &&
      (val === "all" || (val === "yes" ? hasKit(c2) : !hasKit(c2)))).length;

  const visible = clients.filter(
    (cl) => matchesText(cl) && matchesInvite(cl) && matchesKit(cl)
  );
  const filtersActive = inviteFilter !== "all" || kitFilter !== "all";

  return (
    <div className="p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em]">
          Client Management
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Invite clients, assign equipment and pricing, and manage each company's access to the portal.</p>
      </header>

      {/* Filters */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-5 mb-8">
        <div className="mb-3">
          <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
            Login sent
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "yes", label: "Invited" },
              { key: "no", label: "Not invited" },
            ].map((o) => (
              <button key={o.key} onClick={() => setInviteFilter(o.key)}
                className={CHIP(inviteFilter === o.key)}>
                {o.label} <span className="opacity-60">{countInvite(o.key)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
            Equipment assigned
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "yes", label: "Has equipment" },
              { key: "no", label: "None yet" },
            ].map((o) => (
              <button key={o.key} onClick={() => setKitFilter(o.key)}
                className={CHIP(kitFilter === o.key)}>
                {o.label} <span className="opacity-60">{countKit(o.key)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex flex-wrap items-center gap-2">
          <button onClick={() => setShowSubs(!showSubs)}
            className={
              "px-3.5 py-1.5 rounded-full font-[Inter] text-[13px] transition-colors " +
              (waiting.length > 0
                ? "bg-[#3a2f14] text-[#F59E0B] border border-[#F59E0B55]"
                : "bg-[#292A2B] text-[#9CA3AF] border border-[#333]")
            }>
            Submissions <span className="opacity-70">{waiting.length}</span>
          </button>
          <button onClick={() => setInviting(true)} className={BTN.secondarySm}>
            + Send an onboarding form
          </button>
        </div>

        {inviting && (
          <div className="mt-3 bg-[#1F1F20] border border-[#333] rounded-lg p-4 max-w-[420px]">
            <p className="text-[#E5E5E5] font-[Inter] text-[15px] font-semibold mb-3">
              Send an onboarding form
            </p>
            <input value={invite.contact_name}
              onChange={(e) => setInvite({ ...invite, contact_name: e.target.value })}
              placeholder="Their name"
              className="w-full bg-[#292A2B] border border-[#333] rounded-lg text-[#E5E5E5] text-[15px] px-3 py-2.5 outline-none focus:border-[#FDCE06] mb-2.5" />
            <input value={invite.email} inputMode="email"
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              placeholder="Their email"
              className="w-full bg-[#292A2B] border border-[#333] rounded-lg text-[#E5E5E5] text-[15px] px-3 py-2.5 outline-none focus:border-[#FDCE06] mb-3" />
            <div className="flex gap-2">
              <button onClick={sendInvite} className={BTN.success}>Send it</button>
              <button onClick={() => setInviting(false)} className={BTN.secondary}>Cancel</button>
            </div>
          </div>
        )}

        {showSubs && (
          <div className="mt-3 space-y-2.5">
            {subs.length === 0 ? (
              <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
                Nothing yet. Send a form and it will land here.
              </p>
            ) : subs.map((s) => (
              <div key={s.id} className="bg-[#1F1F20] border border-[#333] rounded-lg p-4">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <p className="text-[#E5E5E5] font-[Inter] text-[16px] font-semibold">
                      {s.business_name || s.invited_name || s.invited_email}
                    </p>
                    <p className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
                      {s.status === "sent" ? "Form sent, nothing back yet"
                        : s.abn ? "ABN " + s.abn : "No ABN given"}
                    </p>
                  </div>
                  <span className={
                    "px-2.5 py-1 rounded-full font-[Inter] text-[12px] " +
                    (s.status === "created" ? "bg-[#14352a] text-[#4CAF50]"
                      : s.status === "submitted" ? "bg-[#3a2f14] text-[#F59E0B]"
                      : "bg-[#292A2B] text-[#6B7280]")
                  }>
                    {s.status === "created" ? "Created"
                      : s.status === "submitted" ? "Needs review" : "Waiting"}
                  </span>
                </div>

                {s.status !== "sent" && (
                  <>
                    <p className="text-[#9CA3AF] font-[Inter] text-[13px]">
                      {[s.contact_name, s.contact_role, s.contact_mobile].filter(Boolean).join(" · ")}
                    </p>
                    {s.postal_address ? (
                      <p className="text-[#9CA3AF] font-[Inter] text-[13px]">{s.postal_address}</p>
                    ) : null}
                    {s.people && s.people.length > 0 && (
                      <div className="mt-2.5">
                        <p className="text-[#6B7280] font-[Inter] text-[11px] uppercase tracking-[0.05em] mb-1">
                          Wants logins for
                        </p>
                        {s.people.map((p, i) => (
                          <p key={i} className="text-[#9CA3AF] font-[Inter] text-[13px]">
                            {p.name} · {p.role}{p.email ? " · " + p.email : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {s.status === "submitted" && (
                  <button onClick={() => createFromSub(s)} className={BTN.success + " mt-3"}>
                    Create the company
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2A2A2A]">
          <div className="text-[#9CA3AF] font-[Inter] text-[14px]">
            Showing {visible.length} of {clients.length} clients
          </div>
          {filtersActive && (
            <button
              onClick={() => { setInviteFilter("all"); setKitFilter("all"); }}
              className={BTN.secondarySm}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Client Table Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg">
        {/* Section Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.4em]">
            Company
          </h3>
          <button
            onClick={handleAddClient}
            className={BTN.primary}
          >
            + Add Company
          </button>
        </div>

        {/* Table Container with Overflow */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            {/* Table Header */}
            <thead className="bg-[#292A2B]">
              <tr>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-left px-4 py-3 w-16">
                  ID#
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-left px-4 py-3 min-w-[160px]">
                  Owner Name*
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-left px-4 py-3 min-w-[180px]">
                  Email
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-left px-4 py-3 min-w-[120px]">
                  Company Name
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-center px-4 py-3 min-w-[120px]">
                  Equipment
                </th>
                <th className="text-[#9CA3AF] font-[Inter] font-bold text-[12px] leading-[1.25em] text-center px-4 py-3 min-w-[160px]">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-[#9CA3AF] py-8">
                    No clients found. Click "Add Client" to invite your first
                    client.
                  </td>
                </tr>
              ) : (
                visible.map((client, index) => (
                  <Fragment key={client.id}>
                  <tr
                    className={`${index < clients.length - 1
                      ? "border-b border-[#333333]"
                      : ""
                      } hover:bg-[#292A2B] transition-colors`}
                  >
                    <td className="text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] px-4 py-4">
                      {client.id}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] px-4 py-4">
                      {client.client_name}
                      {!client.invited_at ? (
                        <span className="block mt-1 text-[11px] text-[#FDCE06] font-[Inter] font-normal">
                          Not yet invited
                        </span>
                      ) : null}
                      {setupStatus(client).done < setupStatus(client).total ? (
                        <span className="block mt-0.5 text-[11px] text-[#9CA3AF] font-[Inter] font-normal">
                          {setupStatus(client).done} of {setupStatus(client).total} set up
                        </span>
                      ) : null}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] px-4 py-4">
                      {client.email}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] px-4 py-4">
                      {client.company_name || "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) =>
                            handleEquipmentAssign(client.user_id, e)
                          }
                          title={
                            clientEquipment[client.user_id]?.length > 0
                              ? `Assigned Equipment: ${getAssignedEquipmentNames(
                                client.user_id
                              ).join(", ") || "Loading..."
                              }`
                              : "Click to assign equipment"
                          }
                          className={`border rounded-md font-[Inter] font-normal text-[12px] leading-[1.25em] line-clamp-2 px-3 py-1 flex items-center gap-2 transition-colors ${clientEquipment[client.user_id]?.length > 0
                            ? "bg-[#FDCE06] border-[#FDCE06] text-[#1F1F20]"
                            : "bg-[#292A2B] border-[#333333] text-[#E5E5E5] hover:border-[#FDCE06]"
                            }`}
                        >
                          {clientEquipment[client.user_id]?.length > 0
                            ? `Assigned (${clientEquipment[client.user_id].length
                            })`
                            : "Assign"}
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M3 4.5L6 7.5L9 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2 items-center justify-center">
                        <button onClick={() => handleViewClientDetails(client)} className={BTN.primary}>
                          View
                        </button>
                        <button onClick={() => handleEditClient(client)} className={BTN.edit}>
                          Edit
                        </button>
                        <button
                          onClick={() => setInviteTarget(client)}
                          title={
                            client.invited_at
                              ? "Reset password and email new login details"
                              : "Send this client their login details for the first time"
                          }
                          className={BTN.secondary}
                        >
                          {client.invited_at ? "Resend" : "Send invite"}
                        </button>
                        <button onClick={() => handleDeleteClient(client.id)} className={BTN.danger}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {membersForOwner(client.user_id).map((m) => (
                    <tr
                      key={"member-" + m.id}
                      className="border-b border-[#333333] bg-[#1A1A1B]"
                    >
                      <td colSpan={7} className="px-4 py-2">
                        <div className="flex items-center gap-3 pl-10">
                          <span className="text-[#555] text-[13px]">&#8627;</span>
                          <span className="text-[#9CA3AF] font-[Inter] font-medium text-[13px]">
                            {m.member_name}
                          </span>
                          <span className="text-[#6B7280] font-[Inter] text-[12px]">
                            {m.member_email}
                          </span>
                          <span className="text-[#9CA3AF] font-[Inter] text-[11px] px-2 py-0.5 rounded-full bg-[#292A2B] border border-[#333333]">
                            {m.role}
                          </span>
                          <button
                            onClick={() => handleResendMember(m)}
                            title="Reset password and email new login details"
                            className={BTN.secondarySm}
                          >
                            Resend login
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center p-6 border-t border-[#333333]">
            <div className="text-[#9CA3AF] font-[Inter] font-normal text-[14px]">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} clients
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-[Inter] font-medium text-[14px] hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`px-3 py-2 border rounded-md font-[Inter] font-medium text-[14px] transition-colors ${pageNum === pagination.page
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
                className="px-3 py-2 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-[Inter] font-medium text-[14px] hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSubmit={handleInviteClient}
        loading={inviteLoading}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => {
          setIsEditClientModalOpen(false);
          setSelectedClient(null);
        }}
        onSubmit={handleUpdateClient}
        client={selectedClient}
        loading={inviteLoading}
      />

      {/* Client Details Modal */}
      <ClientDetailsModal
        isOpen={isClientDetailsModalOpen}
        onClose={() => {
          setIsClientDetailsModalOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        clientEquipment={
          selectedClient ? clientEquipment[selectedClient.user_id] || [] : []
        }
      />

      {/* Equipment Popover */}
      <EquipmentPopover
        isOpen={equipmentPopover.isOpen}
        onClose={() =>
          setEquipmentPopover({ isOpen: false, clientId: null, anchorEl: null })
        }
        onApply={handleEquipmentApply}
        referenceElement={equipmentPopover.anchorEl}
        selectedEquipment={
          equipmentPopover.clientId
            ? (clientEquipment[equipmentPopover.clientId] || []).map(
              (eq) => eq.equipment_id || eq.id
            )
            : []
        }
        equipmentOptions={getAllEquipmentOptions()}
        loading={assignmentLoading}
      />

      {/* Toast Container */}
      {inviteTarget && (() => {
        const s = setupStatus(inviteTarget);
        const firstTime = !inviteTarget.invited_at;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-md">
              <div className="px-5 py-4 border-b border-[#333]">
                <h3 className="text-[#E5E5E5] font-[Inter] font-bold text-[18px]">
                  {firstTime ? "Send invite" : "Send new login details"}
                </h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-[#9CA3AF] font-[Inter] text-sm leading-relaxed">
                  {inviteTarget.client_name} at {inviteTarget.company_name} will be
                  emailed login details at {inviteTarget.email}.
                  {firstTime ? "" : " This resets their current password."}
                </p>
                {s.missing.length > 0 && (
                  <div className="mt-3 px-3 py-2 rounded bg-[#3a2e00] border border-[#5a4800]">
                    <p className="text-[#FDCE06] font-[Inter] text-xs font-medium mb-1">
                      Not set up yet: {s.missing.map((m) => m.label.toLowerCase()).join(", ")}
                    </p>
                    <p className="text-[#9CA3AF] font-[Inter] text-xs leading-relaxed">
                      They can still log in, but anything missing will fall back to
                      defaults.
                    </p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-[#333] flex justify-end gap-3">
                <button
                  onClick={() => setInviteTarget(null)}
                  className="px-4 py-1.5 border border-[#444] rounded text-[#E5E5E5] font-[Inter] font-bold text-[13px] hover:border-[#666] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const t = inviteTarget;
                    setInviteTarget(null);
                    handleResendInvitation(t);
                  }}
                  className="px-4 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] transition-colors"
                >
                  {s.missing.length > 0 ? "Send anyway" : "Send"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

</div>
  );
};

export default ClientManagement;
