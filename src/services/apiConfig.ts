// Shared API config for LongTermHire frontend
export const BASE_URL = 'https://baas.mytechpassport.com/v1/api/longtermhire';

export const getAdminHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
});

export const getClientHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('clientToken') || ''}`,
});

export async function adminFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getAdminHeaders(), ...(options.headers || {}) },
  });
  return res.json();
}

export async function clientFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getClientHeaders(), ...(options.headers || {}) },
  });
  return res.json();
}
