import { useAuthStore } from '@/stores/useAuthStore';

export class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.detail || data?.message || `API Error with status ${status}`);
    this.name = 'ApiError';
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const accessToken = token ?? useAuthStore.getState().accessToken;
  const baseUrl = typeof window === 'undefined'
    ? 'http://127.0.0.1:8000/api/v1'
    : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');
  
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && !path.includes('/auth/refresh') && !token) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token) {
            useAuthStore.getState().setAccessToken(data.access_token);
            isRefreshing = false;
            onRefreshed(data.access_token);
          } else {
            isRefreshing = false;
            useAuthStore.getState().logout();
          }
        } else {
          isRefreshing = false;
          useAuthStore.getState().logout();
        }
      } catch (err) {
        isRefreshing = false;
        useAuthStore.getState().logout();
      }
    }

    return new Promise<T>((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        resolve(
          apiRequest<T>(path, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          })
        );
      });
      
      setTimeout(() => {
        if (!useAuthStore.getState().accessToken) {
          reject(new ApiError(401, { detail: 'Unauthorized' }));
        }
      }, 5000);
    });
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: response.statusText };
    }
    throw new ApiError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
