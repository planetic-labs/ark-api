import { apiRequest } from './client';

export interface Permission {
  id: string;
  key: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  is_system: boolean;
  is_default: boolean;
  permissions: string[];
}

export const rolesApi = {
  list: async (): Promise<Role[]> => {
    return apiRequest<Role[]>('/users/roles/list');
  },

  create: async (name: string, permissions: string[]): Promise<Role> => {
    return apiRequest<Role>('/users/roles/create', {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    });
  },

  update: async (id: string, name: string, permissions: string[]): Promise<Role> => {
    return apiRequest<Role>(`/users/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, permissions }),
    });
  },

  makeDefault: async (id: string): Promise<Role> => {
    return apiRequest<Role>(`/users/roles/${id}/default`, {
      method: 'POST',
    });
  },

  listPermissions: async (): Promise<Permission[]> => {
    return apiRequest<Permission[]>('/users/permissions/list');
  },
};
