// src/notifications/useUnreadBadgeRealtime.ts

import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect } from 'react';

import { API_BASE } from '../config';

/**
 * Mantém o contador de notificações não lidas atualizado
 * enquanto o aplicativo está em foreground.
 *
 * O UID deve ser o UID real do usuário autenticado no Firebase.
 */
export function useUnreadBadgeRealtimeAdmin(
  userUid?: string,
  onCount?: (count: number) => void
) {
  const refreshCount = useCallback(async () => {
    if (!userUid) {
      onCount?.(0);
      return;
    }

    try {
      const { data } = await axios.get(
        `${API_BASE}/notifications/unread-count`,
        {
          params: {
            userUid,
          },
          timeout: 10000,
        }
      );

      onCount?.(
        Number(data?.count ?? 0)
      );
    } catch {
      // Mantém o valor atual caso a API esteja
      // temporariamente indisponível.
    }
  }, [userUid, onCount]);

  useEffect(() => {
    // Atualiza ao montar ou quando o usuário mudar.
    void refreshCount();

    // Quando um novo push chega com o aplicativo aberto,
    // atualiza imediatamente o contador.
    const subscription =
      Notifications.addNotificationReceivedListener(
        () => {
          void refreshCount();
        }
      );

    return () => {
      subscription.remove();
    };
  }, [refreshCount]);

  return {
    refreshCount,
  };
}