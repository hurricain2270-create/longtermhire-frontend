// @ts-nocheck
import api from "./api";

export const clientApi = {
  // Get all clients with pagination and search
  getClients: async (page = 1, limit = 10, searchData = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchData.clientId && { clientId: searchData.clientId }),
        ...(searchData.clientName && { clientName: searchData.clientName }),
        ...(searchData.companyName && { companyName: searchData.companyName }),
      });

      const response = await api.get(
        `/v1/api/longtermhire/super_admin/clients?${params}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Invite new client
  inviteClient: async (clientData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/invite-client",
        clientData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update client
  updateClient: async (clientId, clientData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/clients/${clientId}`,
        clientData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete client
  deleteClient: async (clientId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/clients/${clientId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get client equipment assignments
  getClientEquipment: async (clientUserId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/client-equipment/${clientUserId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get client pricing assignment
  getClientPricing: async (clientUserId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/client-pricing/${clientUserId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Assign equipment to client (V2 - with discount support)
  assignEquipment: async (clientUserId, equipmentAssignments) => {
    try {
      // Support both old format (array of IDs) and new format (array of objects with discounts)
      const isNewFormat = Array.isArray(equipmentAssignments) &&
        equipmentAssignments.length > 0 &&
        typeof equipmentAssignments[0] === 'object' &&
        'equipment_id' in equipmentAssignments[0];

      const payload = isNewFormat
        ? { client_user_id: clientUserId, equipment_assignments: equipmentAssignments }
        : { client_user_id: clientUserId, equipment_ids: equipmentAssignments };

      const response = await api.post(
        "/v1/api/longtermhire/super_admin/assign-equipment",
        payload
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Assign pricing to client (only for pricing packages, not custom discounts)
  assignPricing: async (clientUserId, pricingPackageId) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/assign-pricing",
        {
          client_user_id: clientUserId,
          pricing_package_id: pricingPackageId,
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Assign custom discount to specific equipment for a client
  assignEquipmentDiscount: async (clientUserId, equipmentId, discountData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/assign-equipment-discount",
        {
          client_user_id: clientUserId,
          equipment_id: equipmentId,
          discount_type: discountData.discountType,
          discount_value: discountData.discountValue,
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Remove custom discount from specific equipment for a client
  removeEquipmentDiscount: async (clientUserId, equipmentId) => {
    try {
      const response = await api.delete(
        "/v1/api/longtermhire/super_admin/remove-equipment-discount",
        {
          data: {
            client_user_id: clientUserId,
            equipment_id: equipmentId,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all equipment-specific custom discounts for a client
  getClientEquipmentDiscounts: async (clientUserId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/client-equipment-discounts/${clientUserId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Remove pricing package assignment from client
  removePricing: async (clientUserId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/remove-pricing/${clientUserId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
