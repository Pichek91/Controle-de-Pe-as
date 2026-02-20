
// src/notifications/useUnreadBadgeRealtime.ts
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { API_BASE } from '../config';

/**
 * Hook para atualizar badge do ADM em tempo real (foreground).
 * Se você tiver um estado global do badge, passe um callback onCount.
 */
export function useUnreadBadgeRealtimeAdmin(onCount?: (n: number) => void) {
  async function refreshCount() {
    const userUid = 'ADMIN';
    try {
      const { data } = await axios.get(`${API_BASE}/notifications/unread-count`, {
        params: { userUid },
        timeout: 10000,
      });
      if (typeof onCount === 'function') onCount(Number(data?.count ?? 0));
    } catch {}
  }

  useEffect(() => {
    // Atualiza ao montar
    refreshCount();

    // Atualiza quando uma notificação chega com o app em FOREGROUND
    const sub = Notifications.addNotificationReceivedListener(async (_notif) => {
      await refreshCount();
    });

    return () => {
      sub?.remove?.();
    };
  }, []);
}
