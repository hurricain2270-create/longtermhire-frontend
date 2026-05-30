// @ts-nocheck
import { BASE_URL, adminFetch, clientFetch } from './apiConfig';

// Determine which token to use based on who is calling
const autoFetch = (path: string, options: RequestInit = {}) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('authToken');
  const token = clientToken || adminToken || '';
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }).then((r) => r.json());
};

export const chatApi = {
  async setOnline(): Promise<any> {
    return autoFetch('/chat/online', { method: 'POST' });
  },

  async setOffline(): Promise<any> {
    return autoFetch('/chat/offline', { method: 'POST' });
  },

  async getAdminStatus(): Promise<any> {
    return autoFetch('/chat/admin-status');
  },

  async getConversations(): Promise<any> {
    return autoFetch('/chat/conversations');
  },

  async getMessages(conversationId: number, page = 1): Promise<any> {
    return autoFetch(`/chat/messages/${conversationId}?page=${page}&limit=20`);
  },

  async sendMessage(toUserId: number, message: string, attachmentData?: any): Promise<any> {
    return autoFetch('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId, message, ...attachmentData }),
    });
  },

  async sendEquipmentRequest(data: {
    equipment_id: number;
    equipment_name: string;
    message: string;
  }): Promise<any> {
    return autoFetch('/chat/equipment-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async markMessagesAsRead(messageIds: number[]): Promise<any> {
    return autoFetch('/chat/messages/read', {
      method: 'PUT',
      body: JSON.stringify({ message_ids: messageIds }),
    });
  },

  async getUnreadCount(): Promise<any> {
    return autoFetch('/chat/unread-count');
  },

  // Admin: get all client conversations
  async getAllConversations(): Promise<any> {
    return adminFetch('/chat/admin/conversations');
  },

  // Admin: get messages for a specific conversation
  async getAdminMessages(conversationId: number, page = 1): Promise<any> {
    return adminFetch(`/chat/admin/messages/${conversationId}?page=${page}&limit=20`);
  },

  // Admin: send message to client
  async sendAdminMessage(toUserId: number, message: string, attachmentData?: any): Promise<any> {
    return adminFetch('/chat/admin/send', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId, message, ...attachmentData }),
    });
  },
};
