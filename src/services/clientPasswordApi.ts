// @ts-nocheck
import { BASE_URL } from './apiConfig';

const noAuthFetch = (path: string, body: any) =>
  fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export const clientPasswordApi = {
  async forgotPassword(email: string): Promise<any> {
    const data = await noAuthFetch('/client/forgot-password', { email });
    if (data.error) throw new Error(data.message || 'Request failed');
    return data;
  },

  async verifyOTP(email: string, otp: string): Promise<any> {
    const data = await noAuthFetch('/client/verify-otp', { email, otp });
    if (data.error) throw new Error(data.message || 'OTP verification failed');
    return data;
  },

  async resendOTP(email: string): Promise<any> {
    const data = await noAuthFetch('/client/resend-otp', { email });
    if (data.error) throw new Error(data.message || 'Resend failed');
    return data;
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<any> {
    const data = await noAuthFetch('/client/reset-password', {
      email,
      otp,
      new_password: newPassword,
    });
    if (data.error) throw new Error(data.message || 'Password reset failed');
    return data;
  },
};
