// @ts-nocheck
import { adminFetch } from './apiConfig';

export const dashboardApi = {
  async getStats(): Promise<any> {
    return adminFetch('/admin/dashboard/stats');
  },

  async clearLogs(): Promise<any> {
    return adminFetch('/admin/dashboard/clear-logs', { method: 'POST' });
  },

  async markMessagesAsRead(messageIds: number[]): Promise<any> {
    return adminFetch('/chat/messages/read', {
      method: 'PUT',
      body: JSON.stringify({ message_ids: messageIds }),
    });
  },
};
