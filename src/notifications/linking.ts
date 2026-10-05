// src/notifications/linking.ts

import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';

import { API_BASE } from '../config';

/**
 * Processa uma notificação que foi aberta pelo usuário.
 */
async function openFromNotification(
  notification: Notifications.Notification
) {
  const data = notification?.request?.content?.data as
    | {
        route?: string;
        notificationId?: string | number;
      }
    | undefined;

  const route = data?.route;
  const notificationId = data?.notificationId;

  /**
   * Abre a rota enviada pelo backend.
   */
  if (route) {
    const normalizedRoute = String(route).startsWith('/')
      ? String(route)
      : `/${route}`;

    router.navigate(normalizedRoute as any);
  }

  /**
   * Obtém o UID real do usuário atualmente autenticado.
   *
   * Não usamos mais o antigo usuário compartilhado "ADMIN".
   */
  const userUid = getAuth().currentUser?.uid;

  if (!userUid) {
    return;
  }

  /**
   * Se o backend enviou o ID da notificação,
   * marca essa notificação como lida.
   */
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

  /**
   * Atualiza/consulta a quantidade de notificações não lidas.
   *
   * O header também possui sua própria atualização periódica.
   */
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
    // Não impede a navegação caso a consulta do contador falhe.
  }
}

/**
 * Configura a navegação através das notificações push.
 *
 * Trata:
 * 1. Push tocado enquanto o app está aberto/em segundo plano.
 * 2. Push que abriu o aplicativo quando ele estava fechado.
 */
export function setupNotificationNavigation() {
  /**
   * App já estava executando.
   */
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void openFromNotification(
          response.notification
        );
      }
    );

  /**
   * App foi iniciado através de uma notificação.
   */
  void Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response?.notification) {
        return openFromNotification(
          response.notification
        );
      }
    })
    .catch((error) => {
      console.warn(
        'Não foi possível processar a notificação que abriu o app:',
        error
      );
    });

  /**
   * Permite remover o listener caso necessário.
   */
  return () => {
    subscription.remove();
  };
}