import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiRequest } from '@/services/api/client';
import { User } from '@ark/shared-types';

export function useSession() {
  const { accessToken, setAccessToken, user, setUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    async function initSession() {
      // 1. If we already have an accessToken and user, we are good
      if (accessToken && user) {
        setIsLoading(false);
        return;
      }

      // 2. If we have an accessToken but no user, fetch user profile
      if (accessToken && !user) {
        try {
          const profile = await apiRequest<User>('/users/me', {}, accessToken);
          setUser(profile);
          setIsLoading(false);
          return;
        } catch (e) {
          // Token might be invalid/expired, proceed to refresh
        }
      }

      // Avoid multiple simultaneous refresh requests
      if (refreshAttemptedRef.current) {
        setIsLoading(false);
        return;
      }
      refreshAttemptedRef.current = true;

      // 3. Try to refresh the token using Route Handler
      try {
        const refreshResponse = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.access_token) {
            setAccessToken(data.access_token);
            const profile = await apiRequest<User>('/users/me', {}, data.access_token);
            setUser(profile);
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, [accessToken, user, setAccessToken, setUser, logout]);

  return {
    isAuthenticated: !!accessToken && !!user,
    user,
    isLoading,
  };
}
