
// src/notifications/linking.ts
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { API_BASE } from '../config';

async function openFromNotification(notification: Notifications.Notification) {
  const data = notification?.request?.content?.data as any;

  const route = data?.route;
  const notificationId = data?.notificationId;

  // 🚀 CORREÇÃO AQUI
  if (route) {
    const normalized = String(route).startsWith('/')
      ? route
      : `/${route}`;
    router.navigate(normalized as any);
  }

  // Marcar como lida (somente para exemplo)
  const userUid = 'ADMIN';
  if (notificationId) {
    try {
      await axios.post(
        `${API_BASE}/notifications/${notificationId}/read`,
        { userUid },
        { timeout: 10000 }
      );
    } catch {}
  }

  // Atualizar badge
  try {
    await axios.get(`${API_BASE}/notifications/unread-count`, {
      params: { userUid },
      timeout: 10000,
    });
  } catch {}
}

export function setupNotificationNavigation() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    openFromNotification(response.notification);
  });
}
