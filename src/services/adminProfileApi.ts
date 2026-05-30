// @ts-nocheck
import { adminFetch } from './apiConfig';

export const adminProfileApi = {
  async getProfile(): Promise<any> {
    return adminFetch('/admin/profile');
  },

  async updateProfile(data: any): Promise<any> {
    return adminFetch('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
