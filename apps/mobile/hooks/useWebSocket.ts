import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { API_URL } from '../constants/Config';
import { api } from '../services/api';

// Convert http:// to ws://
const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://').replace('/api/v1', '/ws');

export function useWebSocket() {
  const { accessToken, logout } = useAuthStore((state) => ({
    accessToken: state.accessToken,
    logout: state.logout
  }));
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    if (!accessToken) return;

    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;
      
      console.log('Attempting WS connection...');
      const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted) return;
        console.log('WS Connected');
        setIsConnected(true);
      };

      ws.onmessage = (e) => {
        if (!isComponentMounted) return;
        try {
          const message = JSON.parse(e.data);
          setLastMessage(message);
        } catch (err) {
          console.error('WS Parse Error', err);
        }
      };

      ws.onclose = (e) => {
        if (!isComponentMounted) return;
        console.log('WS Closed', e.code, e.reason);
        setIsConnected(false);
        
        // If it's an auth error, try to refresh the token by calling a protected endpoint
        if (e.code === 4003) {
          console.log('WS Auth error, triggering token refresh...');
          api.users.me().catch(() => {
            logout();
          });
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        if (!isComponentMounted) return;
        console.error('WS Error');
      };
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [accessToken]);

  return { isConnected, lastMessage };
}
