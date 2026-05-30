// @ts-nocheck
import { clientFetch } from './apiConfig';

export const clientEquipmentApi = {
  async getEquipment(categories?: string[]): Promise<any> {
    let path = '/client/equipment';
    if (categories && categories.length > 0) {
      const params = new URLSearchParams();
      categories.forEach((c) => params.append('category', c));
      path += `?${params.toString()}`;
    }
    return clientFetch(path);
  },
};
