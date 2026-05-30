// @ts-nocheck
import { adminFetch } from './apiConfig';

export const clientApi = {
  async getClients(page = 1, limit = 200, filters: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.companyId) params.append('company_id', filters.companyId);
    if (filters.companyName) params.append('company_name', filters.companyName);
    if (filters.email) params.append('email', filters.email);
    return adminFetch(`/admin/clients?${params.toString()}`);
  },

  async inviteClient(data: any): Promise<any> {
    return adminFetch('/admin/clients/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string | number): Promise<any> {
    return adminFetch(`/admin/clients/${id}`, { method: 'DELETE' });
  },

  async assignEquipment(clientUserId: string | number, equipmentIds: number[]): Promise<any> {
    return adminFetch(`/admin/clients/${clientUserId}/equipment`, {
      method: 'POST',
      body: JSON.stringify({ equipment_ids: equipmentIds }),
    });
  },

  async getClientAssignments(clientUserId: string | number): Promise<any> {
    return adminFetch(`/admin/clients/${clientUserId}/equipment`);
  },
};
