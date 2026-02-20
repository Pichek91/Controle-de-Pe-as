import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { attachNotificationOpenHandlers } from './navigation';

/**
 * Handler global de notificações (foreground)
 * Compatível com versões novas do expo-notifications
 */
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => {
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

/**
 * Inicializa push notifications
 * Retorna função de cleanup
 */
export async function initPushSetup(): Promise<() => void> {
  // Canal Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Permissões
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permissão de notificação negada');
    return () => {};
  }

  // Expo Push Token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  console.log('📲 Expo Push Token:', token);

  // Navegação ao tocar na notificação
  const detachNavigation = attachNotificationOpenHandlers();

  // Listener foreground (opcional)
  const foregroundSub =
    Notifications.addNotificationReceivedListener(() => {});

  // Cleanup
  return () => {
    foregroundSub.remove();
    detachNavigation?.();
  };
}
