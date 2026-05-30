// @ts-nocheck
import { useState, useEffect } from 'react';
import { BASE_URL } from '../services/apiConfig';

export function useCompanyLogo(): { companyLogo: string | null; loading: boolean } {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      try {
        // Try admin settings endpoint first (admin context)
        const adminToken = localStorage.getItem('authToken');
        const clientToken = localStorage.getItem('clientToken');
        const token = adminToken || clientToken || '';

        const endpoint = adminToken
          ? `${BASE_URL}/admin/settings`
          : `${BASE_URL}/client/company-settings`;

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!cancelled) {
          const logo =
            data?.data?.company_logo ||
            data?.company_logo ||
            null;
          setCompanyLogo(logo);
        }
      } catch (_) {
        // Silently fail — logo will fall back to default in the component
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLogo();
    return () => { cancelled = true; };
  }, []);

  return { companyLogo, loading };
}
