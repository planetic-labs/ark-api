import { API_URL } from '../constants/Config';
import { useAuthStore } from '../stores/useAuthStore';

async function request<T>(
  path: string,
  options: RequestInit = {},
  manualToken?: string
): Promise<T> {
  const { accessToken: storeToken, refreshToken, setAuth, logout } = useAuthStore.getState();
  const accessToken = manualToken || storeToken;
  
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle Token Expiration (401)
  const isAuthPath = path.startsWith('/auth');
  if (response.status === 401 && refreshToken && !manualToken && !isAuthPath) {
    try {
      // Attempt to refresh
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        // Update store with new tokens (keep current user)
        const { user } = useAuthStore.getState();
        if (user) {
          setAuth(user, tokens.access_token, tokens.refresh_token);
          
          // Retry the original request with new token
          headers.set('Authorization', `Bearer ${tokens.access_token}`);
          response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
          });
        }
      } else {
        // Refresh failed, logout
        logout();
      }
    } catch (e) {
      logout();
    }
  }

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = response.statusText || `Error ${response.status}`;
    try {
      const errorJson = JSON.parse(text);
      if (Array.isArray(errorJson.detail)) {
        // Handle FastAPI validation error list
        errorMessage = errorJson.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join('\n');
      } else {
        errorMessage = errorJson.detail || errorMessage;
      }
    } catch (e) {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  auth: {
    identify: (email: string) => 
      request<any>('/auth/identify', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    verifyCode: (email: string, code: string) => 
      request<any>('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }),
    setup: (setupToken: string, firstName: string, lastName: string, avatarUrl?: string) =>
      request<any>('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ setup_token: setupToken, first_name: firstName, last_name: lastName, avatar_url: avatarUrl }),
      }),
    refresh: (refreshToken: string) =>
      request<any>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    logout: () =>
      request<any>('/auth/logout', {
        method: 'POST',
      }),
  },

  users: {
    me: (token?: string) => request<any>('/users/me', {}, token),
    listAll: () => request<any[]>('/users/'),
    create: (userData: { email: string; full_name?: string; role: string }) => 
      request<any>('/users/', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
  },
  messaging: {
    listChats: () => request<any[]>('/messaging/chats'),
    getMessages: (chatId: string) => request<any[]>(`/messaging/chats/${chatId}/messages`),
    sendMessage: (chatId: string, content: string) => 
      request<any>('/messaging/messages', {
        method: 'POST',
        body: JSON.stringify({ chat_id: chatId, content }),
      }),
    createChat: (otherUserId: string, name?: string) =>
      request<any>('/messaging/chats', {
        method: 'POST',
        body: JSON.stringify({ 
          member_ids: [otherUserId], 
          is_group: false,
          name: name
        }),
      }),
  },
};
