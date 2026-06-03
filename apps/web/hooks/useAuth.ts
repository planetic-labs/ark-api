import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export function useAuth() {
  const router = useRouter();
  const { setAccessToken, setUser, logout: clearStore } = useAuthStore();

  const identifyMutation = useMutation({
    mutationFn: (email: string) => authApi.identify(email),
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      // Call our Next.js Route Handler /api/auth/verify
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.access_token) {
        setAccessToken(data.access_token);
      }
      if (data.user) {
        setUser(data.user);
      }
    },
  });

  const setupMutation = useMutation({
    mutationFn: async ({ setupToken, name, avatarUrl }: { setupToken: string; name: string; avatarUrl?: string }) => {
      const result = await authApi.setup(setupToken, name, avatarUrl);
      return result;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        setAccessToken(data.access_token);
      }
      if (data.user) {
        setUser(data.user);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      clearStore();
      router.push(ROUTES.auth.index);
    },
  });

  return {
    identify: identifyMutation.mutateAsync,
    isIdentifying: identifyMutation.isPending,
    identifyError: identifyMutation.error,

    verifyCode: verifyCodeMutation.mutateAsync,
    isVerifying: verifyCodeMutation.isPending,
    verifyError: verifyCodeMutation.error,

    setup: setupMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    setupError: setupMutation.error,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
