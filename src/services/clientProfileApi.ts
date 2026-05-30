// @ts-nocheck
import { clientFetch } from './apiConfig';

export const clientProfileApi = {
  async getProfile(): Promise<any> {
    return clientFetch('/client/profile');
  },

  async updateProfile(data: any): Promise<any> {
    return clientFetch('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
