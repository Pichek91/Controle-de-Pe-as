// app/_layout.tsx
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  // Navegação ao tocar em uma notificação.
  // Expo Go Android não suporta push remoto via expo-notifications.
  useEffect(() => {
    if (isExpoGo) {
      console.log('ℹ️ Expo Go: navegação por push remoto desativada.');
      return;
    }

    let active = true;

    (async () => {
      try {
        const { setupNotificationNavigation } = await import(
          '../src/notifications/linking'
        );

        if (active) {
          setupNotificationNavigation();
        }
      } catch (error) {
        console.warn(
          'Falha ao configurar navegação das notificações:',
          error
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [isExpoGo]);

  useEffect(() => {
    if (!rootState?.key) return;

    let splashTimer: ReturnType<typeof setTimeout>;
    let active = true;

    (async () => {
      try {
        // No Expo Go não carregamos expo-notifications.
        // Em Development Build/APK o funcionamento original é preservado.
        if (!isExpoGo) {
          const { registerForPushNotificationsAsync } = await import(
            '../src/notifications/notifications'
          );

          const expoToken =
            await registerForPushNotificationsAsync();

          console.log('📲 Expo Push Token:', expoToken);
        } else {
          console.log(
            'ℹ️ Expo Go: registro de push remoto ignorado.'
          );
        }

        // (PARTE B) — quando integrarmos FCM por usuário (token do Firebase):
        // - Após login, chamaremos registerDeviceToken(uid)
        // - Em onTokenRefresh, atualizaremos no back
        // - Em logout, chamaremos removeDeviceToken()
        //
        // Exemplo (DESCOMENTE DEPOIS DA PARTE B):
        //
        // const unsubAuth = auth().onAuthStateChanged(async (user) => {
        //   if (user?.uid) {
        //     await registerDeviceToken(user.uid);
        //
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
        //     await removeDeviceToken().catch(() => {});
        //   }
        // });

        if (!active) return;

        // Splash control
        splashTimer = setTimeout(async () => {
          await SplashScreen.hideAsync();

          if (active) {
            router.replace('/login');
          }
        }, 2000);
      } catch (err) {
        console.error('Erro durante inicialização:', err);

        await SplashScreen.hideAsync();

        if (active) {
          router.replace('/login');
        }
      }
    })();

    return () => {
      active = false;

      if (splashTimer) {
        clearTimeout(splashTimer);
      }

      // if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, [rootState?.key, router, isExpoGo]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={customTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}