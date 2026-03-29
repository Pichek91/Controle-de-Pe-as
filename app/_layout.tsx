
// app/_layout.tsx
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ====== EXISTENTE (mantido): registro via Expo Notifications ======
import {
    registerForPushNotificationsAsync,
} from '../src/notifications/notifications';

// ====== NOVO: listeners de navegação via push (background/cold start) ======
import { setupNotificationNavigation } from '../src/notifications/linking';

// (PARTE B) Quando integrar FCM por usuário, vamos usar estes serviços:
// import { registerDeviceToken, removeDeviceToken } from '../src/notifications/pushTokenService';
// import auth from '@react-native-firebase/auth';
// import messaging from '@react-native-firebase/messaging';
// import axios from 'axios';
// import { API_BASE } from '../src/config';
// import { Platform } from 'react-native';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',
    accent: '#FFC107',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    onSurface: '#000000',
    error: '#D32F2F',
  },
  roundness: 8,
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const router = useRouter();
  const rootState = useRootNavigationState();

  // 🔗 NOVO: ativa a navegação a partir do push (app fechado/segundo plano)
  useEffect(() => {
    setupNotificationNavigation();
  }, []);

  useEffect(() => {
    if (!rootState?.key) return;

    let splashTimer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        // ====== EXISTENTE (mantido): registro via Expo Notifications ======
        const expoToken = await registerForPushNotificationsAsync();
        console.log('📲 Expo Push Token:', expoToken);

        // (PARTE B) — quando integrarmos FCM por usuário (token do Firebase):
        // - Após login, chamaremos registerDeviceToken(uid)
        // - Em onTokenRefresh, atualizaremos no back
        // - Em logout, chamaremos removeDeviceToken()
        //
        // Exemplo (DESCOMENTE DEPOIS DA PARTE B):
        //
        // const unsubAuth = auth().onAuthStateChanged(async (user) => {
        //   if (user?.uid) {
        //     // registra token FCM do device no backend
        //     await registerDeviceToken(user.uid);
        //     // atualiza quando o FCM renovar o token
        //     messaging().onTokenRefresh(async (newToken) => {
        //       try {
        //         await axios.post(`${API_BASE}/device-token`, {
        //           userUid: user.uid,
        //           token: newToken,
        //           platform: Platform.OS,
        //         }, { timeout: 10000 });
        //       } catch (e) {
        //         console.warn('Falha ao atualizar token no back:', e);
        //       }
        //     });
        //   } else {
        //     // remove token do backend no logout
        //     await removeDeviceToken().catch(() => {});
        //   }
        // });

        // Splash control (mantido)
        splashTimer = setTimeout(async () => {
          await SplashScreen.hideAsync();
          router.replace('/login');
        }, 2000);
      } catch (err) {
        console.error(err);
        await SplashScreen.hideAsync();
        router.replace('/login');
      }
    })();

    return () => {
      if (splashTimer) clearTimeout(splashTimer);
      // if (typeof unsubAuth === 'function') unsubAuth(); // (PARTE B) descomente quando integrar auth
    };
  }, [rootState?.key, router]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={customTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
