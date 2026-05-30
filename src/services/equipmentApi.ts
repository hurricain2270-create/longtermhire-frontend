// @ts-nocheck
import { BASE_URL, adminFetch } from './apiConfig';

export const equipmentApi = {
  async getEquipment(page = 1, limit = 200, filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.categoryId) params.append('category_id', filters.categoryId);
    if (filters.categoryName) params.append('category_name', filters.categoryName);
    if (filters.equipmentId) params.append('equipment_id', filters.equipmentId);
    if (filters.equipmentName) params.append('equipment_name', filters.equipmentName);
    return adminFetch(`/admin/equipment?${params.toString()}`);
  },

  async getEquipmentById(id: string | number): Promise<any> {
    return adminFetch(`/admin/equipment/${id}`);
  },

  async addEquipment(data: any): Promise<any> {
    return adminFetch('/admin/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEquipment(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteEquipment(id: string | number): Promise<any> {
    return adminFetch(`/admin/equipment/${id}`, { method: 'DELETE' });
  },

  async updateEquipmentAvailability(id: string | number, availability: boolean): Promise<any> {
    return adminFetch(`/admin/equipment/${id}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ availability: availability ? 1 : 0 }),
    });
  },

  async uploadFile(file: File): Promise<any> {
    const token = localStorage.getItem('authToken') || localStorage.getItem('clientToken') || '';
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/upload/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },
};
