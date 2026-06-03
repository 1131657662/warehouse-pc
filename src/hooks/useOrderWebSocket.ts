import { useEffect, useRef, useState } from 'react';
import { getToken } from '@/utils/token';

const BACKEND_PORT = '3001';

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

const POLL_INTERVAL = 5000;

/**
 * 订阅订单扫码变更。优先 WebSocket，失败降级为 HTTP 轮询。
 * onUpdate 在收到变更或轮询时触发（防抖）。
 */
export function useOrderWebSocket(
  orderId: number | undefined,
  onUpdate: () => void,
  enabled = true,
  debounceMs = 400,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [wsFailed, setWsFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let failed = false;

    const scheduleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onUpdateRef.current();
      }, debounceMs);
    };

    const startPolling = () => {
      if (failed) return; // already polling
      failed = true;
      setWsFailed(true);
      // 立即拉一次，之后每 5 秒轮询
      scheduleUpdate();
      pollTimer = setInterval(() => {
        scheduleUpdate();
      }, POLL_INTERVAL);
    };

    const connect = () => {
      try {
        ws = new WebSocket(getWsUrl());
      } catch {
        // 构造函数失败，直接降级
        startPolling();
        return;
      }

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'subscribe', orderId, token: getToken() }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'scan_update' && Number(msg.orderId) === orderId) {
            scheduleUpdate();
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        if (!closed && !failed) {
          // WebSocket 断开，降级为轮询
          startPolling();
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe' }));
      }
      ws?.close();
    };
  }, [orderId, enabled, debounceMs]);

  return { wsFailed };
}
