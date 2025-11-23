// @ts-nocheck
import api from "./api";

export const contentApi = {
  // Get all content with pagination and search
  getContent: async (page = 1, limit = 10, searchData = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchData.contentId && { contentId: searchData.contentId }),
        ...(searchData.equipmentId && { equipmentId: searchData.equipmentId }),
        ...(searchData.equipmentName && {
          equipmentName: searchData.equipmentName,
        }),
      });

      const response = await api.get(
        `/v1/api/longtermhire/super_admin/content?${params}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add content
  addContent: async (contentData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/content",
        contentData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update content
  updateContent: async (contentId, contentData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/content/${contentId}`,
        contentData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add/Update content (legacy method)
  saveContent: async (contentData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/content",
        contentData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get content by ID
  getContentById: async (contentId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/content/${contentId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get content by equipment ID
  getContentByEquipment: async (equipmentId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/content/${equipmentId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete content
  deleteContent: async (contentId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/content/${contentId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add single image to content
  addImage: async (contentId, imageData) => {
    try {
      const response = await api.post(
        `/v1/api/longtermhire/super_admin/content/${contentId}/images`,
        imageData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Remove image from content
  removeImage: async (contentId, imageId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/content/${contentId}/images/${imageId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Set main image for content
  setMainImage: async (contentId, imageId) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/content/${contentId}/images/${imageId}/main`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Reorder images for content
  reorderImages: async (contentId, imageOrder) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/content/${contentId}/images/reorder`,
        { imageOrder }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
