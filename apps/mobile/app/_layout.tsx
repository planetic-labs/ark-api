import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

const queryClient = new QueryClient();

export default function RootLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    console.log("RootLayout: accessToken changed ->", !!accessToken);
  }, [accessToken]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack 
          key={accessToken ? 'app-root-auth' : 'app-root-guest'}
          screenOptions={{ headerShown: false }}
        >
          {!accessToken ? (
            <Stack.Screen 
              name="(auth)/login" 
              options={{ 
                title: 'Login',
                animation: 'fade'
              }} 
            />
          ) : (
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
          )}
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
