// @ts-nocheck
import { adminFetch } from './apiConfig';

export const settingsApi = {
  async getSettings(): Promise<any> {
    return adminFetch('/admin/settings');
  },

  async updateSettings(data: any): Promise<any> {
    return adminFetch('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
