// @ts-nocheck
import { adminFetch } from './apiConfig';

export const companyApi = {
  async getCompany(id: string | number): Promise<any> {
    return adminFetch(`/admin/companies/${id}`);
  },

  async getCompanyEquipment(id: string | number): Promise<any> {
    return adminFetch(`/admin/companies/${id}/equipment`);
  },

  async updateCompany(id: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addTeamMember(companyId: string | number, data: any): Promise<any> {
    return adminFetch(`/admin/companies/${companyId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeTeamMember(companyId: string | number, memberId: string | number): Promise<any> {
    return adminFetch(`/admin/companies/${companyId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async updateTeamMemberRole(
    companyId: string | number,
    memberId: string | number,
    data: any
  ): Promise<any> {
    return adminFetch(`/admin/companies/${companyId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateEquipmentDiscount(
    companyId: string | number,
    equipmentId: string | number,
    data: any
  ): Promise<any> {
    return adminFetch(`/admin/companies/${companyId}/equipment/${equipmentId}/discount`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async bulkUpdateEquipmentDiscount(companyId: string | number, payload: any): Promise<any> {
    return adminFetch(`/admin/companies/${companyId}/equipment/bulk-discount`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
