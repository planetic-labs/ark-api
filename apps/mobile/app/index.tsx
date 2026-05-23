import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';

export default function IndexRedirect() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}