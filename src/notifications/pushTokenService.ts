
// src/notifications/pushTokenService.ts
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { API_BASE } from '../config';

/**
 * Registra o token de push do device no backend para um dado userUid.
 * Aqui usamos o Expo Push Token, retornado por registerForPushNotificationsAsync().
 * Se você guarda esse token globalmente, pode passá-lo; caso contrário, tentamos ler do Expo.
 */
export async function registerDeviceToken(userUid: string, expoPushToken?: string) {
  let token = expoPushToken;
  if (!token) {
    // tenta buscar o token atual salvo no Expo (se foi obtido antes)
    const pushToken = await Notifications.getExpoPushTokenAsync();
    token = pushToken.data;
  }
  if (!token) return null;

  await axios.post(
    `${API_BASE}/device-token`,
    { userUid, token, platform: 'expo' },
    { timeout: 10000 }
  );
  return token;
}

/**
 * Remove o token atual do device no backend.
 * Para Expo: não existe "getToken" universal; você precisa guardar o token quando gerou.
 * Se você o tiver, passe via parâmetro (preferível).
 */
export async function removeDeviceToken(expoPushToken?: string) {
  const token = expoPushToken;
  if (!token) return;

  await axios.delete(`${API_BASE}/device-token`, {
    data: { token },
    timeout: 10000,
  });
}
