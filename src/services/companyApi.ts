// @ts-nocheck
import api from "./api";

/**
 * V2 Company Management API
 * Handles company and team member operations
 */
export const companyApi = {
  /**
   * Create a new company
   */
  createCompany: async (companyData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/company/create",
        companyData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get company by ID with members
   */
  getCompany: async (companyId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/company/${companyId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update company details
   */
  updateCompany: async (companyId, companyData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/company/${companyId}`,
        companyData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Add team member to company
   */
  addTeamMember: async (companyId, memberData) => {
    try {
      const response = await api.post(
        `/v1/api/longtermhire/super_admin/company/${companyId}/member`,
        memberData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Remove team member from company
   */
  removeTeamMember: async (companyId, memberId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/company/${companyId}/member/${memberId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update team member role
   */
  updateTeamMemberRole: async (companyId, memberId, roleData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/company/${companyId}/member/${memberId}/role`,
        roleData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get company equipment with pricing
   */
  getCompanyEquipment: async (companyId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/company/${companyId}/equipment`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update equipment discount for company
   */
  updateEquipmentDiscount: async (companyId, equipmentId, discountData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/company/${companyId}/equipment/${equipmentId}/discount`,
        discountData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * BULK: Apply discount to all equipment for a company (Single API call)
   */
  bulkUpdateEquipmentDiscount: async (companyId, discountData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/company/${companyId}/equipment/bulk-discount`,
        discountData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
