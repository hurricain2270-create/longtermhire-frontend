// @ts-nocheck
import { adminFetch } from './apiConfig';

export const pricingApi = {
  async getPricingPackages(
    page = 1,
    limit = 200,
    filters: Record<string, string> = {}
  ): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.packageId) params.append('package_id', filters.packageId);
    if (filters.name) params.append('name', filters.name);
    return adminFetch(`/admin/pricing?${params.toString()}`);
  },

  async addPricingPackage(data: any): Promise<any> {
    return adminFetch('/admin/pricing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePricingPackage(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/pricing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePricingPackage(id: string | number): Promise<any> {
    return adminFetch(`/admin/pricing/${id}`, { method: 'DELETE' });
  },
};
