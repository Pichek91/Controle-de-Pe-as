
// src/notifications/notifications.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = '@expoPushToken';

// Comportamento quando a notificação chega em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Simulador não recebe push.');
      return null;
    }

    // 1) Permissões
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Permissão de notificações negada.');
      return null;
    }

    // 2) Obter Expo Push Token
    // Dica: se estiver usando EAS, configure "projectId" p/ melhor compat no Android 13+
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      // projectId: 'SEU-PROJECT-ID-EAS', // opcional
    });

    // 3) Canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 4) Persistir
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEY, token);
      return token;
    }
    return null;
  } catch (e) {
    console.warn('Falha ao registrar push Expo:', e);
    return null;
  }
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export async function clearStoredExpoPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
``
