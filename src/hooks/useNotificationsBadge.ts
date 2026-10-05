// src/hooks/useNotificationsBadge.ts

import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  AppStateStatus,
} from 'react-native';

import { onBadgeRefresh } from '../badgeBus';
import { API_BASE } from '../config';
import { useAuth } from './useAuth';

function headers(
  token?: string | null
): Record<string, string> {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

/**
 * Consulta a quantidade de notificações
 * não lidas de um usuário pelo Firebase UID.
 */
async function getUnreadCount(
  userUid: string,
  token?: string | null
): Promise<number> {
  const url =
    `${API_BASE}/notifications/unread-count` +
    `?userUid=${encodeURIComponent(userUid)}`;

  const response = await fetch(url, {
    headers: headers(token),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return Number(data?.count ?? 0);
}

export function useNotificationsBadge() {
  const { uid, token } = useAuth();

  const [count, setCount] = useState(0);

  /**
   * Atualiza a quantidade de notificações
   * não lidas do usuário autenticado.
   */
  const refresh = useCallback(async () => {
    if (!uid) {
      setCount(0);
      return;
    }

    try {
      const unreadCount =
        await getUnreadCount(uid, token);

      setCount(unreadCount);
    } catch (error) {
      console.warn(
        '[NotificationsBadge] refresh error:',
        error
      );

      setCount(0);
    }
  }, [uid, token]);

  /**
   * Carrega inicialmente e atualiza
   * quando o usuário autenticado muda.
   */
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Atualiza quando o aplicativo
   * volta para primeiro plano.
   */
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (state: AppStateStatus) => {
          if (state === 'active') {
            void refresh();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  /**
   * Polling de segurança.
   *
   * O badge normalmente será atualizado
   * imediatamente pelo badgeBus. O polling
   * garante sincronização caso algum evento
   * seja perdido.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  /**
   * Atualização imediata disparada por
   * ações como marcar como lida ou apagar.
   */
  useEffect(() => {
    return onBadgeRefresh(() => {
      void refresh();
    });
  }, [refresh]);

  return {
    count,
    refresh,
  };
}