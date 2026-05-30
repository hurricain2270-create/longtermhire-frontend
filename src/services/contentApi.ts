// @ts-nocheck
import { adminFetch } from './apiConfig';

export const contentApi = {
  async getContent(page = 1, limit = 200, filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.contentId) params.append('content_id', filters.contentId);
    if (filters.name) params.append('name', filters.name);
    return adminFetch(`/admin/content?${params.toString()}`);
  },

  async addContent(data: any): Promise<any> {
    return adminFetch('/admin/content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateContent(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteContent(id: string | number): Promise<any> {
    return adminFetch(`/admin/content/${id}`, { method: 'DELETE' });
  },
};
