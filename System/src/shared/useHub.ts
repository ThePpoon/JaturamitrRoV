import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, MatchState, ObsStatus, ServerMessage } from './protocol.ts';

const RETRY_MS = 1000;

export interface Toast {
  level: 'info' | 'error';
  text: string;
  id: number;
}

/**
 * เชื่อมต่อ hub server พร้อมต่อใหม่อัตโนมัติ
 * สำคัญมากสำหรับ overlay: browser source ใน OBS ต้องกลับมาเองได้ถ้า hub รีสตาร์ท
 * โดยไม่ต้องให้คนไปกด Refresh กลางไลฟ์
 */
export function useHub() {
  const [state, setState] = useState<MatchState | null>(null);
  const [obs, setObs] = useState<ObsStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const open = () => {
      if (closedRef.current) return;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        if (msg.type === 'state') setState(msg.state);
        else if (msg.type === 'obs') setObs(msg.status);
        else if (msg.type === 'toast') setToast({ ...msg, id: Date.now() });
      };

      ws.onclose = () => {
        setConnected(false);
        if (closedRef.current) return;
        retryRef.current = setTimeout(open, RETRY_MS);
      };

      ws.onerror = () => ws.close();
    };

    open();

    return () => {
      closedRef.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { state, obs, connected, send, toast };
}

/** ตัวนับเวลาสำหรับ timer และ countdown — คืนค่า Date.now() ที่อัปเดตทุก interval */
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** วินาทีที่เหลือจนถึง endsAt (ไม่ติดลบ) */
export function secondsLeft(endsAt: number | null, now: number) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
