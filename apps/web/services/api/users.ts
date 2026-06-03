import { apiRequest } from './client';
import { User } from '@ark/shared-types';

export interface UserAdminCreateData {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  is_approved?: boolean;
  avatar_url?: string;
}

export interface UserAdminUpdateData {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  roles?: string[];
  personal_permissions?: string[];
  is_active?: boolean;
  is_approved?: boolean;
  status?: string;
}

export interface ServiceClient {
  id: string;
  name: string;
  scopes: string[];
  allowed_origins?: string[];
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface ServiceClientCreateResponse {
  client: ServiceClient;
  token: string;
}

export const usersApi = {
  list: async (): Promise<User[]> => {
    return apiRequest<User[]>('/users');
  },

  get: async (id: string): Promise<User> => {
    return apiRequest<User>(`/users/${id}`);
  },

  create: async (data: UserAdminCreateData): Promise<User> => {
    return apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: UserAdminUpdateData): Promise<User> => {
    return apiRequest<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<User> => {
    return apiRequest<User>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Service Clients
  listServices: async (): Promise<ServiceClient[]> => {
    return apiRequest<ServiceClient[]>('/users/services/list');
  },

  createService: async (name: string, scopes: string[], allowedOrigins?: string[]): Promise<ServiceClientCreateResponse> => {
    return apiRequest<ServiceClientCreateResponse>('/users/services/create', {
      method: 'POST',
      body: JSON.stringify({ name, scopes, allowed_origins: allowedOrigins }),
    });
  },

  revokeService: async (id: string): Promise<ServiceClient> => {
    return apiRequest<ServiceClient>(`/users/services/${id}/revoke`, {
      method: 'POST',
    });
  },

  activateService: async (id: string): Promise<ServiceClient> => {
    return apiRequest<ServiceClient>(`/users/services/${id}/activate`, {
      method: 'POST',
    });
  },
};
