// @ts-nocheck
import api from "./api";

export const equipmentApi = {
  // Get all equipment with pagination and search
  getEquipment: async (page = 1, limit = 10, searchData = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchData.categoryId && { categoryId: searchData.categoryId }),
        ...(searchData.categoryName && {
          categoryName: searchData.categoryName,
        }),
        ...(searchData.equipmentId && { equipmentId: searchData.equipmentId }),
        ...(searchData.equipmentName && {
          equipmentName: searchData.equipmentName,
        }),
      });

      const response = await api.get(
        `/v1/api/longtermhire/super_admin/equipment?${params}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add new equipment
  addEquipment: async (equipmentData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/equipment",
        equipmentData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update equipment
  updateEquipment: async (equipmentId, equipmentData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/equipment/${equipmentId}`,
        equipmentData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update equipment availability
  updateAvailability: async (equipmentId, availability) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/equipment/${equipmentId}/availability`,
        {
          availability,
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update equipment availability (alias for compatibility)
  updateEquipmentAvailability: async (equipmentId, availability) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/equipment/${equipmentId}/availability`,
        {
          availability,
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get equipment by ID
  getEquipmentById: async (equipmentId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/equipment/${equipmentId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete equipment
  deleteEquipment: async (equipmentId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/equipment/${equipmentId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Upload file
  uploadFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/lambda/s3/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
