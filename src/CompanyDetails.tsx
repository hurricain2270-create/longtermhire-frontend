// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import SimpleRichTextEditor from "./components/SimpleRichTextEditor";
import { companyApi } from "./services/companyApi";
import { calculateEquipmentPrice, formatPrice, formatDiscount } from "./utils/pricingCalculator";

const CompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyData, setCompanyData] = useState({
    companyName: "",
    adText: "",
    adTextDestination: "To Sticky Note",
  });

  const [teamMembers, setTeamMembers] = useState([]);

  const [assignedEquipment, setAssignedEquipment] = useState([]);

  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState("");
  const [bulkDiscountType, setBulkDiscountType] = useState("%");
  const [compoundingDiscount, setCompoundingDiscount] = useState("");
  const [compoundingDiscountType, setCompoundingDiscountType] = useState("%");

  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roles: "Engineer",
  });

  useEffect(() => {
    if (id) {
      loadCompanyDetails();
    }
  }, [id]);

  const loadCompanyDetails = async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }

      // Load company details from V2 API
      const response = await companyApi.getCompany(id);

      if (!response.error && response.data) {
        const company = response.data;

        setCompanyData({
          companyName: company.company_name || "",
          adText: company.ad_text || "",
          adTextDestination: company.ad_text_destination || "To Sticky Note",
        });

        // Set team members
        if (company.members && Array.isArray(company.members)) {
          setTeamMembers(
            company.members.map((member) => ({
              id: member.id,
              name: member.member_name,
              email: member.member_email,
              phone: member.member_phone || "",
              role: member.role,
              user_id: member.user_id,
              action: "Details",
            }))
          );
        } else {
          setTeamMembers([]);
        }
      }

      // Load company equipment
      const equipmentResponse = await companyApi.getCompanyEquipment(id);

      if (!equipmentResponse.error && equipmentResponse.data) {
        console.log("Loaded equipment:", equipmentResponse.data);
        setAssignedEquipment(
          equipmentResponse.data.map((item) => ({
            id: item.id,
            equipmentName: item.equipment_name,
            categoryName: item.category_name,
            unitPrice: item.base_price?.toString() || "0",
            discount: item.discount ? parseFloat(item.discount).toString() : "",
            discountType: item.discount_type || "%",
            compoundingDiscount: item.compounding_discount ? parseFloat(item.compounding_discount).toString() : "",
            compoundingDiscountType: item.compounding_discount_type || "%",
            equipment_id: item.equipment_id || item.id, // Fallback to id if equipment_id is not present
          }))
        );
      } else {
        console.error("Failed to load equipment:", equipmentResponse);
        setAssignedEquipment([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading company:", error);
      toast.error(error.message || "Failed to load company details");
      setLoading(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!newTeamMember.name || !newTeamMember.email || !newTeamMember.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if trying to add a Company Owner when one already exists
    if (newTeamMember.roles === "Company Owner") {
      const existingOwner = teamMembers.find(
        (member) => member.role === "Company Owner"
      );

      if (existingOwner) {
        toast.error(
          `Only one Company Owner is allowed per company. ${existingOwner.name} is already the Company Owner.`
        );
        return;
      }

      // Confirm the assignment
      if (
        !window.confirm(
          "Assigning Company Owner role is permanent and cannot be changed later. Are you sure?"
        )
      ) {
        return;
      }
    }

    try {
      // Call V2 API to add team member
      const response = await companyApi.addTeamMember(id, {
        member_name: newTeamMember.name,
        member_email: newTeamMember.email,
        member_phone: newTeamMember.phone,
        role: newTeamMember.roles,
        password: newTeamMember.password,
      });

      // Check for error in response
      if (response && response.error) {
        toast.error(response.message || "Failed to add team member");
        return;
      }

      // Success case
      if (!response.error) {
        // Reload company details to get updated members list
        await loadCompanyDetails();

        setNewTeamMember({
          name: "",
          email: "",
          phone: "",
          password: "",
          roles: "Engineer",
        });
        setShowAddTeamMemberModal(false);
        toast.success("Team member added successfully!");
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      // Handle both error object and string errors
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to add team member";
      toast.error(errorMessage);
    }
  };

  const handleDeleteTeamMember = async (memberId) => {
    try {
      const response = await companyApi.removeTeamMember(id, memberId);

      if (!response.error) {
        // Reload company details to get updated members list
        await loadCompanyDetails();
        toast.success("Team member removed successfully");
      } else {
        toast.error(response.message || "Failed to remove team member");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error(error.message || "Failed to remove team member");
    }
  };

  const handleRoleChange = async (memberId, newRole, currentRole) => {
    // Prevent changing Company Owner role
    if (currentRole === "Company Owner") {
      toast.error("Cannot change the role of a Company Owner. This role is permanent.");
      return;
    }

    // Check if trying to assign Company Owner role
    if (newRole === "Company Owner") {
      // Check if a Company Owner already exists
      const existingOwner = teamMembers.find(
        (member) => member.role === "Company Owner" && member.id !== memberId
      );

      if (existingOwner) {
        toast.error(
          `Only one Company Owner is allowed per company. ${existingOwner.name} is already the Company Owner.`
        );
        return;
      }

      // Confirm the assignment
      if (
        !window.confirm(
          "Assigning Company Owner role is permanent and cannot be changed later. Are you sure?"
        )
      ) {
        return;
      }
    }

    try {
      const response = await companyApi.updateTeamMemberRole(id, memberId, {
        role: newRole,
      });

      if (!response.error) {
        // Update local state
        setTeamMembers(
          teamMembers.map((member) =>
            member.id === memberId ? { ...member, role: newRole } : member
          )
        );
        toast.success("Role updated successfully");
      } else {
        toast.error(response.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update role";
      toast.error(errorMessage);
    }
  };

  const handleEquipmentDiscountChange = (equipmentId, value, field) => {
    setAssignedEquipment(
      assignedEquipment.map((eq) => {
        if (eq.id === equipmentId) {
          return {
            ...eq,
            [field]: value,
          };
        }
        return eq;
      })
    );
  };

  const handleApplyBulkDiscount = async () => {
    // Validate that at least one discount field is filled
    if (!bulkDiscount && !compoundingDiscount) {
      toast.error("Please enter at least one discount amount");
      return;
    }

    setApplyingDiscount(true);

    try {
      // Use the new bulk API - single call instead of loop!
      const payload = {};

      if (bulkDiscount) {
        payload.discount = parseFloat(bulkDiscount) || 0;
        payload.discount_type = bulkDiscountType;
      }

      if (compoundingDiscount) {
        payload.compounding_discount = parseFloat(compoundingDiscount) || 0;
        payload.compounding_discount_type = compoundingDiscountType;
      }

      const response = await companyApi.bulkUpdateEquipmentDiscount(id, payload);

      if (!response.error) {
        // Update state to reflect changes
        const updatedEquipment = assignedEquipment.map((eq) => ({
          ...eq,
          discount: bulkDiscount || eq.discount || "",
          discountType: bulkDiscount ? bulkDiscountType : eq.discountType,
          compoundingDiscount: compoundingDiscount || eq.compoundingDiscount || "",
          compoundingDiscountType: compoundingDiscount ? compoundingDiscountType : eq.compoundingDiscountType,
        }));

        setAssignedEquipment(updatedEquipment);

        toast.success(response.message || "Discount applied and saved to all items!");

        setBulkDiscount("");
        setBulkDiscountType("%");
        setCompoundingDiscount("");
        setCompoundingDiscountType("%");
        setShowDiscountModal(false);
      } else {
        toast.error(response.message || "Failed to apply discount");
      }
    } catch (error) {
      console.error("Error applying bulk discount:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to apply discount. Please try again.";
      toast.error(errorMessage);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update company details
      const companyResponse = await companyApi.updateCompany(id, {
        company_name: companyData.companyName,
        ad_text: companyData.adText,
        ad_text_destination: companyData.adTextDestination,
      });

      if (companyResponse.error) {
        toast.error(companyResponse.message || "Failed to save company details");
        setSaving(false);
        return;
      }

      // Update equipment discounts
      for (const equipment of assignedEquipment) {
        const equipmentIdToUse = equipment.equipment_id || equipment.id;
        if (equipmentIdToUse) {
          try {
            await companyApi.updateEquipmentDiscount(id, equipmentIdToUse, {
              discount: parseFloat(equipment.discount) || 0,
              discount_type: equipment.discountType,
              compounding_discount: parseFloat(equipment.compoundingDiscount) || 0,
              compounding_discount_type: equipment.compoundingDiscountType,
              base_price: parseFloat(equipment.unitPrice) || 0,
            });
          } catch (equipError) {
            console.error(`Failed to update discount for equipment ${equipmentIdToUse}:`, equipError);
            // Continue with other equipment even if one fails
          }
        }
      }

      toast.success("Company details saved successfully!");
      setSaving(false);

      // Reload to get fresh data
      // Reload to get fresh data
      await loadCompanyDetails(true);
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error(error.message || "Failed to save company details");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#292A2B]">
        <div className="text-center">
          <ClipLoader color="#FDCE06" size={50} />
          <div className="text-[#E5E5E5] font-[Inter] mt-4">
            Loading company details...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/client-management")}
            className="text-[#9CA3AF] hover:text-[#FDCE06] transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-[36px]">
            {companyData.companyName}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Team Section */}
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
              Company Team
            </h3>
            <button
              onClick={() => setShowAddTeamMemberModal(true)}
              className="bg-[#FDCE06] text-[#1F1F20] px-4 py-2 rounded-md font-[Inter] font-medium text-sm hover:bg-[#E5B800] transition-colors"
            >
              Add Team Member
            </button>
          </div>

          {/* Team Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#292A2B]">
                <tr>
                  <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                    Employee Name
                  </th>
                  <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                    Email
                  </th>
                  <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                    Phone
                  </th>
                  <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                    Role
                  </th>
                  <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-center px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-[#9CA3AF] font-[Inter] text-sm px-4 py-8">
                      No team members found. Click "Add Team Member" to add one.
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-[#333333] hover:bg-[#292A2B] transition-colors"
                    >
                      <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                        {member.name}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                        {member.email}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                        {member.phone}
                      </td>
                      <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value, member.role)
                          }
                          disabled={member.role === "Company Owner"}
                          className={`bg-[#292A2B] border border-[#333333] rounded px-2 py-1 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06] ${member.role === "Company Owner"
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                            }`}
                          title={
                            member.role === "Company Owner"
                              ? "Company Owner role cannot be changed"
                              : "Select role"
                          }
                        >
                          <option>Company Owner</option>
                          <option>Engineer</option>
                          <option>Supervisor</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 items-center justify-center">
                          <button className="text-[#FDCE06] font-[Inter] font-medium text-sm hover:underline">
                            Details
                          </button>
                          <button
                            onClick={() => handleDeleteTeamMember(member.id)}
                            className="text-red-400 font-[Inter] font-medium text-sm hover:underline"
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

        <div className="flex flex-row-reverse gap-4 w-full">
          {/* Assigned Equipment Section */}
          <div className="bg-[#1F1F20] border w-[65%] border-[#333333] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
                Assigned Equipment
              </h3>
              <button
                onClick={() => setShowDiscountModal(true)}
                className="bg-[#292A2B] border border-[#FDCE06] text-[#FDCE06] px-4 py-2 rounded-md font-[Inter] font-medium text-sm hover:bg-[#333333] transition-colors"
              >
                Discount on all items
              </button>
            </div>

            {/* Equipment Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#292A2B]">
                  <tr>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Equipment ID
                    </th>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Equipment name
                    </th>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Category name
                    </th>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Base price
                    </th>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Discount
                    </th>
                    <th className="text-[#9CA3AF] font-[Inter] font-bold text-xs text-left px-4 py-3">
                      Compounding discount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignedEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-[#9CA3AF] font-[Inter] text-sm px-4 py-8">
                        No equipment assigned to this company yet.
                      </td>
                    </tr>
                  ) : (
                    assignedEquipment.map((equipment) => (
                      <tr
                        key={equipment.id}
                        className="border-t border-[#333333] hover:bg-[#292A2B] transition-colors"
                      >
                        <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                          {equipment.equipment_id || equipment.id}
                        </td>
                        <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                          {equipment.equipmentName}
                        </td>
                        <td className="text-[#E5E5E5] font-[Inter] text-sm px-4 py-4">
                          {equipment.categoryName}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-[#9CA3AF] text-sm">$</span>
                            <input
                              type="number"
                              value={equipment.unitPrice}
                              onChange={(e) =>
                                handleEquipmentDiscountChange(
                                  equipment.id,
                                  e.target.value,
                                  'unitPrice'
                                )
                              }
                              className="w-24 bg-[#292A2B] border border-[#333333] rounded px-2 py-1 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06]"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={equipment.discount}
                              onChange={(e) =>
                                handleEquipmentDiscountChange(
                                  equipment.id,
                                  e.target.value,
                                  'discount'
                                )
                              }
                              className="w-20 bg-[#292A2B] border border-[#333333] rounded px-2 py-1 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06]"
                              placeholder=""
                            />
                            <div className="flex">
                              <button
                                onClick={() =>
                                  handleEquipmentDiscountChange(
                                    equipment.id,
                                    '%',
                                    'discountType'
                                  )
                                }
                                className={`px-2 py-1 text-xs rounded-l border ${equipment.discountType === '%'
                                  ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                                  : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                                  }`}
                              >
                                %
                              </button>
                              <button
                                onClick={() =>
                                  handleEquipmentDiscountChange(
                                    equipment.id,
                                    '$',
                                    'discountType'
                                  )
                                }
                                className={`px-2 py-1 text-xs rounded-r border-t border-r border-b ${equipment.discountType === '$'
                                  ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                                  : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                                  }`}
                              >
                                $
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={equipment.compoundingDiscount}
                              onChange={(e) =>
                                handleEquipmentDiscountChange(
                                  equipment.id,
                                  e.target.value,
                                  'compoundingDiscount'
                                )
                              }
                              className="w-20 bg-[#292A2B] border border-[#333333] rounded px-2 py-1 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06]"
                              placeholder=""
                            />
                            <div className="flex">
                              <button
                                onClick={() =>
                                  handleEquipmentDiscountChange(
                                    equipment.id,
                                    '%',
                                    'compoundingDiscountType'
                                  )
                                }
                                className={`px-2 py-1 text-xs rounded-l border ${equipment.compoundingDiscountType === '%'
                                  ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                                  : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                                  }`}
                              >
                                %
                              </button>
                              <button
                                onClick={() =>
                                  handleEquipmentDiscountChange(
                                    equipment.id,
                                    '$',
                                    'compoundingDiscountType'
                                  )
                                }
                                className={`px-2 py-1 text-xs rounded-r border-t border-r border-b ${equipment.compoundingDiscountType === '$'
                                  ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                                  : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                                  }`}
                              >
                                $
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AD Text Section */}
          <div className="bg-[#1F1F20] border w-[35%] border-[#333333] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
                AD Text
              </h3>

              {/* Dropdown for selecting destination */}
              <select
                value={companyData.adTextDestination}
                onChange={(e) =>
                  setCompanyData({
                    ...companyData,
                    adTextDestination: e.target.value,
                  })
                }
                className="bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-3 py-1.5 outline-none focus:border-[#FDCE06] font-[Inter] text-xs"
              >
                <option value="Add Text">Add Text</option>
                <option value="To Sticky Note">To Sticky Note</option>
                <option value="To Header">To Header</option>
              </select>
            </div>

            <SimpleRichTextEditor
              value={companyData.adText}
              onChange={(value) =>
                setCompanyData({ ...companyData, adText: value })
              }
              height={200}
            />
          </div>
        </div>
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FDCE06] text-[#1F1F20] px-8 py-3 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <ClipLoader size={16} color="#1F1F20" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Add Team Member Modal */}
      {showAddTeamMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
                Add Team Member
              </h3>
              <button
                onClick={() => setShowAddTeamMemberModal(false)}
                className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newTeamMember.name}
                  onChange={(e) =>
                    setNewTeamMember({ ...newTeamMember, name: e.target.value })
                  }
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newTeamMember.email}
                  onChange={(e) =>
                    setNewTeamMember({
                      ...newTeamMember,
                      email: e.target.value,
                    })
                  }
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newTeamMember.phone}
                  onChange={(e) =>
                    setNewTeamMember({
                      ...newTeamMember,
                      phone: e.target.value,
                    })
                  }
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={newTeamMember.password}
                  onChange={(e) =>
                    setNewTeamMember({
                      ...newTeamMember,
                      password: e.target.value,
                    })
                  }
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Roles
                </label>
                <select
                  value={newTeamMember.roles}
                  onChange={(e) =>
                    setNewTeamMember({
                      ...newTeamMember,
                      roles: e.target.value,
                    })
                  }
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                >
                  <option>Company Owner</option>
                  <option>Engineer</option>
                  <option>Supervisor</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddTeamMemberModal(false)}
                  className="flex-1 bg-[#333333] text-[#E5E5E5] py-2 px-4 rounded-md font-[Inter] font-medium text-sm hover:bg-[#404040] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeamMember}
                  className="flex-1 bg-[#FDCE06] text-[#1F1F20] py-2 px-4 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] transition-colors"
                >
                  Save Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#E5E5E5] font-[Inter] font-semibold text-xl">
                Discount on all items
              </h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Discount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bulkDiscount}
                    onChange={(e) => setBulkDiscount(e.target.value)}
                    className="flex-1 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                    placeholder="Enter discount amount"
                  />
                  <div className="flex">
                    <button
                      onClick={() => setBulkDiscountType('%')}
                      className={`px-3 py-2 text-sm rounded-l border ${bulkDiscountType === '%'
                        ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                        : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                        }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setBulkDiscountType('$')}
                      className={`px-3 py-2 text-sm rounded-r border-t border-r border-b ${bulkDiscountType === '$'
                        ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                        : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                        }`}
                    >
                      $
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-[Inter] text-sm mb-2">
                  Compounding Discount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={compoundingDiscount}
                    onChange={(e) => setCompoundingDiscount(e.target.value)}
                    className="flex-1 bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] px-4 py-2 outline-none focus:border-[#FDCE06]"
                    placeholder="Enter compounding discount"
                  />
                  <div className="flex">
                    <button
                      onClick={() => setCompoundingDiscountType('%')}
                      className={`px-3 py-2 text-sm rounded-l border ${compoundingDiscountType === '%'
                        ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                        : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                        }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setCompoundingDiscountType('$')}
                      className={`px-3 py-2 text-sm rounded-r border-t border-r border-b ${compoundingDiscountType === '$'
                        ? 'bg-[#FDCE06] text-[#1F1F20] border-[#FDCE06]'
                        : 'bg-[#292A2B] text-[#9CA3AF] border-[#333333]'
                        }`}
                    >
                      $
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  disabled={applyingDiscount}
                  className="flex-1 bg-[#333333] text-[#E5E5E5] py-2 px-4 rounded-md font-[Inter] font-medium text-sm hover:bg-[#404040] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyBulkDiscount}
                  disabled={applyingDiscount}
                  className="flex-1 bg-[#FDCE06] text-[#1F1F20] py-2 px-4 rounded-md font-[Inter] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {applyingDiscount ? (
                    <>
                      <ClipLoader size={16} color="#1F1F20" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetails;
