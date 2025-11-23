// @ts-nocheck
import api from "./api";

/**
 * V2 CMS Content API
 * Public endpoint for fetching admin-configured content for client frontend
 */
export const cmsApi = {
  /**
   * Get CMS content and company info from admin profile
   * This is a public endpoint (no authentication required)
   */
  getCMSContent: async () => {
    try {
      const response = await api.get(
        "/v1/api/longtermhire/client/cms-content"
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
