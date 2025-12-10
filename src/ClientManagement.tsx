// @ts-nocheck
import { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddClientModal from "./components/AddClientModal";
import EditClientModal from "./components/EditClientModal";
import ClientDetailsModal from "./components/ClientDetailsModal";
import EquipmentPopover from "./components/EquipmentPopover";
import PricingPopover from "./components/PricingPopover";
import CustomPackageModal from "./components/CustomPackageModal";

import { clientApi } from "./services/clientApi";
import { equipmentApi } from "./services/equipmentApi";
import { pricingApi } from "./services/pricingApi";
import { useNavigate } from "react-router";

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

  // Pricing popover state
  const [pricingPopover, setPricingPopover] = useState({
    isOpen: false,
    clientId: null,
    anchorEl: null,
  });
  const [customPackageModal, setCustomPackageModal] = useState({
    isOpen: false,
    clientId: null,
  });

  // API data states
  const [clients, setClients] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [pricingPackages, setPricingPackages] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
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
    // Only load client data, skip expensive assignment loading during search
    const loadClientsOnly = async () => {
      try {
        const clientsRes = await clientApi.getClients(1, 200, debouncedSearchData);
        const clientsData = clientsRes.data || [];
        setClients(clientsData);
        
        if (clientsRes.pagination) {
          setPagination(clientsRes.pagination);
          setCurrentPage(clientsRes.pagination.page);
        }
        
        // Only load assignments if we have a small number of clients (not searching)
        const isSearching = debouncedSearchData.clientId || debouncedSearchData.clientName || debouncedSearchData.companyName;
        if (!isSearching || clientsData.length <= 10) {
          await loadClientAssignments(clientsData, equipment);
        } else {
          // Clear assignments during search to avoid expensive operations
          setClientEquipment({});
          setClientPricing({});
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        toast.error("Error loading clients. Please try again.");
      }
    };
    
    loadClientsOnly();
  }, [debouncedSearchData]);

  const loadInitialData = async (page = 1, searchFilters = {}, showFullLoading = true) => {
    try {
      if (showFullLoading) {
        setLoading(true);
      }
      const [clientsRes, equipmentRes, pricingRes] = await Promise.all([
        clientApi.getClients(page, 200, searchFilters),
        equipmentApi.getEquipment(1, 1000),
        pricingApi.getPricingPackages(),
      ]);
      console.log(clientsRes, equipmentRes, pricingRes);
      const clientsData = clientsRes.data || [];
      const equipmentData = equipmentRes.data || [];
      setClients(clientsData);
      setEquipment(equipmentData);
      setPricingPackages(pricingRes.data || []);

      // Update pagination info
      if (clientsRes.pagination) {
        setPagination(clientsRes.pagination);
        setCurrentPage(clientsRes.pagination.page);
      }

      // Load assignments for each client (pass equipmentData to ensure it's available)
      await loadClientAssignments(clientsData, equipmentData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data. Please try again.");
    } finally {
      if (showFullLoading) {
        setLoading(false);
      }
    }
  };

  console.log("Equipment:", equipment);
  console.log("Clients:", clients);
  console.log("Pricing Packages:", pricingPackages);

  // Load equipment and pricing assignments for all clients
  const loadClientAssignments = async (
    clientsData,
    equipmentData = equipment
  ) => {
    try {
      const equipmentAssignments = {};
      const pricingAssignments = {};

      for (const client of clientsData) {
        try {
          // Load equipment assignments
          const equipmentRes = await clientApi.getClientEquipment(
            client.user_id
          );
          console.log(equipmentRes);
          if (equipmentRes.data && equipmentRes.data.length > 0) {
            // Use the equipment data directly from API response (it already has names)
            const clientEquipmentDetails = equipmentRes.data.map(
              (assignment) => ({
                id: assignment.equipment_id,
                equipment_id: assignment.equipment_id,
                equipment_name: assignment.equipment_name,
                category_name: assignment.category_name,
                availability: assignment.availability,
              })
            );
            equipmentAssignments[client.user_id] = clientEquipmentDetails;
          }

          // Load pricing assignments based on API response structure
          if (client.has_custom_discounts === 1) {
            // Client has custom discounts
            pricingAssignments[client.user_id] = [
              {
                name: "Custom Pricing",
                description: "Equipment-specific custom discounts applied",
                package_id: "custom",
                type: "custom",
              },
            ];
          } else if (client.pricing_package_name) {
            // Client has a pricing package assigned
            const fullPackage = pricingPackages.find(
              (pkg) => pkg.name === client.pricing_package_name
            );
            const pricingInfo = fullPackage || {
              name: client.pricing_package_name,
              description: `Package: ${client.pricing_package_name}`,
              package_id: client.pricing_package_id || "Unknown",
            };

            pricingAssignments[client.user_id] = [pricingInfo];
          }
          // If neither custom discounts nor package, no pricing assignment is shown
        } catch (error) {
          console.error(
            `Error loading assignments for client ${client.user_id}:`,
            error
          );
          // Continue with other clients even if one fails
        }
      }

      setClientEquipment(equipmentAssignments);
      setClientPricing(pricingAssignments);
    } catch (error) {
      console.error("Error loading client assignments:", error);
    }
  };

  console.log("Equipment data:", equipment);

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

  const handleAssignPricing = async (clientUserId, pricingPackageId) => {
    try {
      setAssignmentLoading(true);
      await clientApi.assignPricing(clientUserId, pricingPackageId);
      toast.success("Pricing package assigned successfully!");

      // Update local state instead of full reload
      const selectedPackage = pricingPackages.find(
        (pkg) => pkg.id === pricingPackageId
      );
      if (selectedPackage) {
        // Update clients state
        setClients((prevClients) =>
          prevClients.map((client) =>
            client.user_id === clientUserId
              ? {
                  ...client,
                  pricing_package_name: selectedPackage.name,
                  pricing_package_id: selectedPackage.id,
                  has_custom_discounts: 0, // Reset custom discounts when package is assigned
                }
              : client
          )
        );

        // Update pricing assignments state
        setClientPricing((prev) => ({
          ...prev,
          [clientUserId]: [selectedPackage],
        }));
      }
    } catch (error) {
      console.error("Error assigning pricing:", error);
      toast.error(
        error.message || "Error assigning pricing. Please try again."
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

  // Track selected equipment per client
  const [clientEquipment, setClientEquipment] = useState({});

  // Track pricing assignments per client
  const [clientPricing, setClientPricing] = useState({});
  console.log("Client Pricing Data:", clientPricing);

  // Helper function to get assigned equipment names
  const getAssignedEquipmentNames = (clientUserId) => {
    const assignedIds = clientEquipment[clientUserId] || [];
    return assignedIds
      .map((id) => {
        const equipmentItem = equipment.find((eq) => eq.id === id);
        return equipmentItem
          ? String(equipmentItem.equipment_name)
          : `Equipment ${id}`;
      })
      .filter(Boolean); // Remove any undefined/null values
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

        // Reload equipment assignments to ensure data consistency
        await loadClientAssignments(clients);
      } catch (error) {
        console.error("Error applying equipment assignment:", error);
      }
    }
    setEquipmentPopover({ isOpen: false, clientId: null, anchorEl: null });
  };

  // Pricing assignment handlers
  const handlePricingClick = (clientUserId, event) => {
    setPricingPopover({
      isOpen: true,
      clientId: clientUserId,
      anchorEl: event.currentTarget,
    });
  };

  const handleCustomPackageClick = () => {
    // Close popover and open custom modal
    setCustomPackageModal({
      isOpen: true,
      clientId: pricingPopover.clientId,
    });
    setPricingPopover({ isOpen: false, clientId: null, anchorEl: null });
  };

  const handleCustomPackageSave = async (customPackage) => {
    if (customPackageModal.clientId) {
      try {
        // Get the assigned equipment for this client
        const clientEquipmentData =
          clientEquipment[customPackageModal.clientId] || [];

        if (clientEquipmentData.length === 0) {
          toast.error(
            "Please assign equipment to this client first before applying custom discounts."
          );
          return;
        }

        // Apply custom discount to selected equipment only
        const discountPromises = customPackage.selectedEquipment.map(
          (equipmentId) =>
            clientApi.assignEquipmentDiscount(
              customPackageModal.clientId,
              equipmentId,
              customPackage
            )
        );

        await Promise.all(discountPromises);
        toast.success(
          "Custom discount applied to all assigned equipment successfully!"
        );

        // Update local state instead of full reload
        setClients((prevClients) =>
          prevClients.map((client) =>
            client.user_id === customPackageModal.clientId
              ? {
                  ...client,
                  has_custom_discounts: 1,
                  pricing_package_name: null, // Clear package when custom is applied
                  pricing_package_id: null,
                }
              : client
          )
        );

        // Update pricing assignments state
        setClientPricing((prev) => ({
          ...prev,
          [customPackageModal.clientId]: [
            {
              name: "Custom Pricing",
              description: "Equipment-specific custom discounts applied",
              package_id: "custom",
              type: "custom",
            },
          ],
        }));
      } catch (error) {
        console.error("Error applying custom discount:", error);
        toast.error("Error applying custom discount. Please try again.");
      }
    }
    // Close custom modal
    setCustomPackageModal({ isOpen: false, clientId: null });
  };

  const handlePricingSelect = async (selectedPackageId) => {
    if (pricingPopover.clientId) {
      try {
        await handleAssignPricing(pricingPopover.clientId, selectedPackageId);
      } catch (error) {
        console.error("Error applying pricing assignment:", error);
      }
    }
    // Always close the popover
    setPricingPopover({ isOpen: false, clientId: null, anchorEl: null });
  };

  // Removed static clientData - now using API data from 'clients' state

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

  return (
    <div className="p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em]">
          Client Management
        </h1>
      </header>

      {/* Search Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 mb-8">
        <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.2em] mb-6">
          Search
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Client ID Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Client ID
            </label>
            <input
              type="text"
              name="clientId"
              value={searchData.clientId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
              style={{ height: "42px" }}
            />
          </div>

          {/* Client Name Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Client Name
            </label>
            <input
              type="text"
              name="clientName"
              value={searchData.clientName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-3 outline-none focus:border-[#FDCE06] transition-colors"
              style={{ height: "42px" }}
            />
          </div>

          {/* Company Name Field */}
          <div className="flex flex-col">
            <label className="text-[#9CA3AF] font-[Inter] font-medium text-[14px] leading-[1.21em] mb-2">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={searchData.companyName}
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
              className="bg-[#FDCE06] w-[200px] rounded-md text-[#1F1F20] font-[Inter] font-bold text-[16px] leading-[1.19em] px-6 py-3 hover:bg-[#E5B800] transition-colors"
              style={{ height: "42px" }}
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Client Table Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg">
        {/* Section Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-[20px] leading-[1.4em]">
            Client
          </h3>
          <button
            onClick={handleAddClient}
            className="bg-[#FDCE06] rounded-md text-[#1F1F20] font-[Inter] font-bold text-[16px] leading-[1.19em] px-6 py-2 hover:bg-[#E5B800] transition-colors"
          >
            + Add Client
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
                clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={`${
                      index < clients.length - 1
                        ? "border-b border-[#333333]"
                        : ""
                    } hover:bg-[#292A2B] transition-colors`}
                  >
                    <td className="text-[#E5E5E5] font-[Inter] font-normal text-[14px] leading-[1.21em] px-4 py-4">
                      {client.id}
                    </td>
                    <td className="text-[#E5E5E5] font-[Inter] font-medium text-[14px] leading-[1.21em] px-4 py-4">
                      {client.client_name}
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
                              ? `Assigned Equipment: ${
                                  getAssignedEquipmentNames(
                                    client.user_id
                                  ).join(", ") || "Loading..."
                                }`
                              : "Click to assign equipment"
                          }
                          className={`border rounded-md font-[Inter] font-normal text-[12px] leading-[1.25em] line-clamp-2 px-3 py-1 flex items-center gap-2 transition-colors ${
                            clientEquipment[client.user_id]?.length > 0
                              ? "bg-[#FDCE06] border-[#FDCE06] text-[#1F1F20]"
                              : "bg-[#292A2B] border-[#333333] text-[#E5E5E5] hover:border-[#FDCE06]"
                          }`}
                        >
                          {clientEquipment[client.user_id]?.length > 0
                            ? `Assigned (${
                                clientEquipment[client.user_id].length
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
                      <div className="flex gap-3 items-center justify-center">
                        <button
                          onClick={() => handleViewClientDetails(client)}
                          className="text-[#FDCE06] font-[Inter] font-medium text-[14px] leading-[1.43em] hover:underline transition-all"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-[#FDCE06] font-[Inter] font-medium text-[14px] leading-[1.43em] hover:underline transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-400 font-[Inter] font-medium text-[14px] leading-[1.43em] hover:underline transition-all"
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
                      className={`px-3 py-2 border rounded-md font-[Inter] font-medium text-[14px] transition-colors ${
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
        clientPricing={
          selectedClient ? clientPricing[selectedClient.user_id] || [] : []
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

      {/* Pricing Popover */}
      <PricingPopover
        isOpen={pricingPopover.isOpen}
        onClose={() =>
          setPricingPopover({ isOpen: false, clientId: null, anchorEl: null })
        }
        onSelect={handlePricingSelect}
        onCustomPackageClick={handleCustomPackageClick}
        referenceElement={pricingPopover.anchorEl}
        equipmentOptions={getAllEquipmentOptions()}
        pricingPackages={pricingPackages}
        loading={assignmentLoading}
      />

      {/* Custom Package Modal */}
      <CustomPackageModal
        isOpen={customPackageModal.isOpen}
        onClose={() => setCustomPackageModal({ isOpen: false, clientId: null })}
        onSave={handleCustomPackageSave}
        clientId={customPackageModal.clientId}
        clientEquipment={
          customPackageModal.clientId &&
          clientEquipment[customPackageModal.clientId]
            ? clientEquipment[customPackageModal.clientId]
            : []
        }
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

export default ClientManagement;
