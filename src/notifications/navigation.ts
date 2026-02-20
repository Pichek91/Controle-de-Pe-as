// src/notifications/navigation.ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

/**
 * Envia navegação com segurança para o Expo Router.
 * Aceita somente strings começando com "/".
 */
function pushSafe(route: unknown) {
  if (typeof route !== 'string') return;

  const trimmed = route.trim();

  // Apenas rotas internas
  if (!trimmed.startsWith('/')) return;

  router.push(trimmed as never);
}

/**
 * Registra handlers de abertura de notificação:
 * - App em background → usuário toca na notificação
 * - App fechado → aberto pela notificação
 */
export function attachNotificationOpenHandlers() {
  // Usuário tocou na notificação (background ou foreground)
  const responseSub =
    Notifications.addNotificationResponseReceivedListener(response => {
      const route = response.notification.request.content.data?.route;
      pushSafe(route);
    });

  // App aberto a partir de estado fechado (cold start)
  (async () => {
    const lastResponse =
      await Notifications.getLastNotificationResponseAsync();

    const route =
      lastResponse?.notification.request.content.data?.route;

    pushSafe(route);
  })();

  // Retorna cleanup
  return () => {
    responseSub.remove();
  };
}
