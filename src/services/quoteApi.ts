// @ts-nocheck
import { adminFetch } from './apiConfig';

export const quoteApi = {
  async getQuotes(
    page = 1,
    limit = 10,
    filters: Record<string, string> = {}
  ): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.quote_id) params.append('quote_id', filters.quote_id);
    return adminFetch(`/admin/quotes?${params.toString()}`);
  },

  async createQuote(data: any): Promise<any> {
    return adminFetch('/admin/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuote(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQuote(id: string | number): Promise<any> {
    return adminFetch(`/admin/quotes/${id}`, { method: 'DELETE' });
  },
};
