// src/notifications/linking.ts

import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';

import { API_BASE } from '../config';

// =====================================================
// TIPOS
// =====================================================

type NotificationData = {
  route?: string;
  notificationId?: string | number;
};

// =====================================================
// UTILITÁRIOS
// =====================================================

function getNotificationData(
  notification: Notifications.Notification
): NotificationData {
  return (
    notification?.request?.content?.data ?? {}
  ) as NotificationData;
}

/**
 * Normaliza uma rota recebida pelo backend.
 *
 * Exemplo:
 * tecnico/retiradas
 *
 * vira:
 * /tecnico/retiradas
 */
function normalizeRoute(
  route?: string
): string | null {
  if (!route) {
    return null;
  }

  const value = String(route).trim();

  if (!value) {
    return null;
  }

  return value.startsWith('/')
    ? value
    : `/${value}`;
}

// =====================================================
// MARCAR NOTIFICAÇÃO COMO LIDA
// =====================================================

async function markNotificationAsRead(
  notificationId?: string | number
) {
  const userUid =
    getAuth().currentUser?.uid;

  if (!userUid) {
    return;
  }

  if (notificationId) {
    try {
      await axios.post(
        `${API_BASE}/notifications/${notificationId}/read`,
        {
          userUid,
        },
        {
          timeout: 10000,
        }
      );
    } catch (error) {
      console.warn(
        'Não foi possível marcar a notificação como lida:',
        error
      );
    }
  }

  try {
    await axios.get(
      `${API_BASE}/notifications/unread-count`,
      {
        params: {
          userUid,
        },
        timeout: 10000,
      }
    );
  } catch {
    // Falha no contador não impede a navegação.
  }
}

// =====================================================
// PROCESSAR CLIQUE COM APP JÁ ABERTO
// =====================================================

async function openFromNotification(
  notification: Notifications.Notification
) {
  const data =
    getNotificationData(notification);

  const route =
    normalizeRoute(data.route);

  /*
   * Aqui o aplicativo já está executando,
   * então podemos navegar imediatamente.
   */
  if (route) {
    router.navigate(route as any);
  }

  await markNotificationAsRead(
    data.notificationId
  );
}

// =====================================================
// VERIFICAR SE O APP FOI ABERTO POR PUSH
// =====================================================

export async function getInitialNotificationRoute():
  Promise<string | null> {
  try {
    const response =
      await Notifications.getLastNotificationResponseAsync();

    if (!response?.notification) {
      return null;
    }

    const data =
      getNotificationData(
        response.notification
      );

    const route =
      normalizeRoute(data.route);

    /*
     * Marca como lida, mas NÃO navega daqui.
     *
     * O _layout.tsx decidirá a rota inicial
     * somente depois que o Router estiver pronto.
     */
    await markNotificationAsRead(
      data.notificationId
    );

    /*
     * Limpa a resposta para evitar que a mesma
     * notificação seja reutilizada em uma próxima
     * inicialização do aplicativo.
     */
    try {
      await Notifications.clearLastNotificationResponseAsync();
    } catch {
      // Não impede a abertura da rota.
    }

    return route;
  } catch (error) {
    console.warn(
      'Não foi possível verificar a notificação que abriu o app:',
      error
    );

    return null;
  }
}

// =====================================================
// LISTENER PARA APP JÁ EXECUTANDO
// =====================================================

export function setupNotificationNavigation() {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void openFromNotification(
          response.notification
        );
      }
    );

  return () => {
    subscription.remove();
  };
}