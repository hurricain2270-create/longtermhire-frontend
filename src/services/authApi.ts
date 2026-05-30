// @ts-nocheck
import { BASE_URL, adminFetch } from './apiConfig';

export const authApi = {
  async login(email: string, password: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error || !res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    if (data.data?.token) {
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userRole', data.data.role || 'super_admin');
      localStorage.setItem('userId', String(data.data.id || ''));
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await adminFetch('/admin/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  },
};
