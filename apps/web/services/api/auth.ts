import { apiRequest } from './client';

export interface IdentifyResponse {
  next: 'enter_code' | 'enter_password' | 'setup_profile';
  error?: string;
}

export interface VerifyCodeResponse {
  access_token?: string;
  refresh_token?: string;
  setup_token?: string;
  user?: any;
  next: 'setup_profile' | 'approved' | 'pending_approval' | 'home';
}

export const authApi = {
  identify: async (email: string): Promise<IdentifyResponse> => {
    return apiRequest<IdentifyResponse>('/auth/identify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyCode: async (email: string, code: string): Promise<VerifyCodeResponse> => {
    return apiRequest<VerifyCodeResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  setup: async (setupToken: string, name: string, avatarUrl?: string): Promise<any> => {
    return apiRequest<any>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ setup_token: setupToken, name, avatar_url: avatarUrl }),
    });
  },

  refresh: async (refreshToken: string): Promise<any> => {
    return apiRequest<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  logout: async (): Promise<any> => {
    return apiRequest<any>('/auth/logout', {
      method: 'POST',
    });
  },
};
