// src/notifications/handlers.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Handler para notificações recebidas com app aberto (foreground)
 */
export function attachForegroundMessageHandler() {
  const subscription =
    Notifications.addNotificationReceivedListener(notification => {
      console.log(
        '🔔 Notificação recebida (foreground):',
        notification.request.content.title,
        notification.request.content.body
      );
    });

  return () => subscription.remove();
}

/**
 * Handler para quando o usuário toca na notificação
 * (app fechado ou em background)
 */
export function attachNotificationResponseHandler(
  callback: (data: any) => void
) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(response => {
      callback(response.notification.request.content.data);
    });

  return () => subscription.remove();
}

/**
 * Configuração necessária (especialmente Android)
 */
export async function configureNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50'
    });
  }
}
