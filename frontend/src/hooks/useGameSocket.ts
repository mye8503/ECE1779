import { useEffect, useRef, useCallback } from 'react';

interface UseGameSocketProps {
  gameId: number | null;
  token: string | null;
  onPriceUpdate: (data: any) => void;
  onGameStart: () => void;
  onGameEnd: () => void;
  onTransactionConfirm: (data: any) => void;
  onError: (error: string) => void;
}

export const useGameSocket = ({
  gameId,
  token,
  onPriceUpdate,
  onGameStart,
  onGameEnd,
  onTransactionConfirm,
  onError
}: UseGameSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const connectWebSocket = useCallback(() => {
    if (!gameId || !token || isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3000/ws?gameId=${gameId}&token=${token}`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          switch (data.type) {
            case 'tick':
              // Price update broadcast
              onPriceUpdate(data);
              break;
            case 'game_start':
              onGameStart();
              break;
            case 'game_end':
              onGameEnd();
              break;
            case 'transaction':
              // Transaction confirmation from server
              onTransactionConfirm(data);
              break;
            case 'error':
              onError(data.message || 'Unknown error from server');
              break;
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        onError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnectingRef.current = false;
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      isConnectingRef.current = false;
      onError('Failed to create WebSocket connection');
    }
  }, [gameId, token, onPriceUpdate, onGameStart, onGameEnd, onTransactionConfirm, onError]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      onError('WebSocket not connected');
    }
  }, [onError]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage,
    disconnect: () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  };
};
