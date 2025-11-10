// src/hooks/useNotificationsBadge.ts
import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { onBadgeRefresh } from '../badgeBus';
import { API_BASE } from '../config';
import { useAuth } from './useAuth';

function headers(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getCountForKey(key: string, token?: string | null): Promise<number> {
  const url = `${API_BASE}/notifications/unread-count?userUid=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Number(data?.count ?? 0);
}

export function useNotificationsBadge() {
  const { uid, email, token } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      if (!uid && !email) { setCount(0); return; }
      // ✅ soma UID + EMAIL (se existirem)
      const [cUid, cEmail] = await Promise.all([
        uid ? getCountForKey(uid, token).catch(() => 0) : Promise.resolve(0),
        email ? getCountForKey(email, token).catch(() => 0) : Promise.resolve(0),
      ]);
      setCount(cUid + cEmail);
    } catch {
      setCount(0);
    }
  }, [uid, email, token]);

  // inicial/quando auth muda
  useEffect(() => { refresh(); }, [refresh]);

  // foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // polling leve
  useEffect(() => {
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  // 🔔 dispara refresh imediato quando alguém apagar/alterar na tela
  useEffect(() => onBadgeRefresh(() => { refresh(); }), [refresh]);

  return { count, refresh };
}