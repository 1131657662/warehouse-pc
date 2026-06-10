import { useEffect, useRef } from 'react';
import { getToken } from '@/utils/token';

const BACKEND_PORT = '3001';
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function getWsUrl(): string {
  const envWs = process.env.WS_URL;
  if (envWs) return envWs;
  const hostname = window.location.hostname;
  if (process.env.NODE_ENV === 'development') {
    return `ws://${hostname}:${BACKEND_PORT}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function useInventoryWebSocket(
  onUpdate: () => void,
  enabled = true,
  customerId?: number,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return undefined;

    let ws: WebSocket | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay = INITIAL_RECONNECT_DELAY;
    let closed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const scheduleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onUpdateRef.current();
      }, 400);
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimer) return;
      const delay = reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      if (closed) return;

      try {
        const socket = new WebSocket(getWsUrl());
        ws = socket;

        socket.onopen = () => {
          if (closed || socket !== ws) return;
          reconnectDelay = INITIAL_RECONNECT_DELAY;
          socket.send(
            JSON.stringify({
              type: 'subscribe_inventory',
              token: getToken(),
              customerId,
            }),
          );
        };

        socket.onmessage = (event) => {
          if (closed || socket !== ws) return;
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === 'inventory_update') scheduleUpdate();
          } catch {
            /* ignore malformed push */
          }
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onclose = () => {
          if (socket === ws) ws = null;
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      closed = true;
      clearReconnectTimer();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe' }));
      }
      ws?.close();
    };
  }, [customerId, enabled]);
}
