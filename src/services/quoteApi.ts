// @ts-nocheck
import api from "./api";

/**
 * V2 Quote Management API
 * Handles quote creation, retrieval, and management
 */
export const quoteApi = {
  /**
   * Get all quotes with pagination and filters
   */
  getQuotes: async (page = 1, limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.company_id && { company_id: filters.company_id }),
        ...(filters.client_user_id && { client_user_id: filters.client_user_id }),
        ...(filters.status && { status: filters.status }),
        ...(filters.quote_id && { quote_id: filters.quote_id }),
      });

      const response = await api.get(
        `/v1/api/longtermhire/super_admin/quotes?${params}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get single quote by ID
   */
  getQuote: async (quoteId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/quotes/${quoteId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create new quote
   */
  createQuote: async (quoteData) => {
    try {
      const response = await api.post(
        "/v1/api/longtermhire/super_admin/quotes",
        quoteData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update quote
   */
  updateQuote: async (quoteId, quoteData) => {
    try {
      const response = await api.put(
        `/v1/api/longtermhire/super_admin/quotes/${quoteId}`,
        quoteData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete quote
   */
  deleteQuote: async (quoteId) => {
    try {
      const response = await api.delete(
        `/v1/api/longtermhire/super_admin/quotes/${quoteId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get all quotes for a specific company
   */
  getCompanyQuotes: async (companyId) => {
    try {
      const response = await api.get(
        `/v1/api/longtermhire/super_admin/quotes/company/${companyId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
