// @ts-nocheck
import { BASE_URL, clientFetch } from './apiConfig';

export const clientAuthApi = {
  async login(email: string, password: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error || !res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    if (data.data?.token) {
      localStorage.setItem('clientToken', data.data.token);
      localStorage.setItem('clientUserId', String(data.data.id || ''));
      localStorage.setItem('clientEmail', email);
      if (data.data.profile) {
        localStorage.setItem('clientProfile', JSON.stringify(data.data.profile));
      }
      if (data.data.company_roles) {
        localStorage.setItem('clientCompanyRoles', JSON.stringify(data.data.company_roles));
      }
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await clientFetch('/client/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUserId');
    localStorage.removeItem('clientEmail');
    localStorage.removeItem('clientProfile');
    localStorage.removeItem('clientCompanyRoles');
    window.location.href = '/client/login';
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('clientToken');
  },

  getClientInfo(): { email: string; profile: any; role: string; id: number } {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem('clientProfile') || '{}'); } catch (_) {}
    let companyRoles: any[] = [];
    try { companyRoles = JSON.parse(localStorage.getItem('clientCompanyRoles') || '[]'); } catch (_) {}
    return {
      email: localStorage.getItem('clientEmail') || '',
      profile,
      role: companyRoles[0]?.role || 'member',
      id: Number(localStorage.getItem('clientUserId') || 0),
    };
  },

  async getCompanySettings(): Promise<any> {
    const data = await clientFetch('/client/company-settings');
    if (data.error) throw new Error(data.message || 'Failed to fetch company settings');
    return data.data || data;
  },
};
