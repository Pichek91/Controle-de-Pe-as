// app/_layout.tsx

import Constants, {
  ExecutionEnvironment,
} from 'expo-constants';

import {
  Stack,
  useRootNavigationState,
  useRouter,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { StatusBar } from 'expo-status-bar';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

import {
  MD3LightTheme as DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

// =====================================================
// TEMA
// =====================================================

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

// =====================================================
// SPLASH NATIVA
// =====================================================

SplashScreen.preventAutoHideAsync().catch(
  () => {}
);

// =====================================================
// LAYOUT PRINCIPAL
// =====================================================

export default function Layout() {
  const router = useRouter();

  const rootState =
    useRootNavigationState();

  const [showCustomSplash, setShowCustomSplash] =
    useState(true);

  /*
   * Evita executar a inicialização principal
   * mais de uma vez caso o estado do Router mude.
   */
  const initializedRef =
    useRef(false);

  const isExpoGo =
    Constants.executionEnvironment ===
    ExecutionEnvironment.StoreClient;

  // ===================================================
  // LISTENER DE NOTIFICAÇÕES
  // ===================================================

  useEffect(() => {
    if (isExpoGo) {
      console.log(
        'Expo Go: navegação por push remoto desativada.'
      );

      return;
    }

    let active = true;

    let unsubscribe:
      | (() => void)
      | undefined;

    const configurar =
      async () => {
        try {
          const {
            setupNotificationNavigation,
          } = await import(
            '../src/notifications/linking'
          );

          if (!active) {
            return;
          }

          unsubscribe =
            setupNotificationNavigation();
        } catch (error) {
          console.warn(
            'Falha ao configurar navegação das notificações:',
            error
          );
        }
      };

    void configurar();

    return () => {
      active = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isExpoGo]);

  // ===================================================
  // INICIALIZAÇÃO DO APP
  // ===================================================

  useEffect(() => {
    /*
     * Espera o Expo Router criar sua árvore.
     */
    if (!rootState?.key) {
      return;
    }

    /*
     * Garante apenas uma inicialização.
     */
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    let active = true;

    let splashTimer:
      | ReturnType<typeof setTimeout>
      | undefined;

    const iniciarApp =
      async () => {
        try {
          // ===========================================
          // VERIFICA SE O APP ABRIU POR PUSH
          // ===========================================

          let initialNotificationRoute:
            | string
            | null = null;

          if (!isExpoGo) {
            try {
              const {
                getInitialNotificationRoute,
              } = await import(
                '../src/notifications/linking'
              );

              initialNotificationRoute =
                await getInitialNotificationRoute();

              if (
                initialNotificationRoute
              ) {
                console.log(
                  'App aberto por push:',
                  initialNotificationRoute
                );
              }
            } catch (error) {
              console.warn(
                'Falha ao verificar abertura por push:',
                error
              );
            }
          }

          // ===========================================
          // REGISTRO DE PUSH
          // ===========================================

          if (!isExpoGo) {
            try {
              const {
                registerForPushNotificationsAsync,
              } = await import(
                '../src/notifications/notifications'
              );

              const expoToken =
                await registerForPushNotificationsAsync();

              console.log(
                'Expo Push Token:',
                expoToken
              );
            } catch (pushError) {
              /*
               * Push não pode impedir
               * o aplicativo de abrir.
               */
              console.warn(
                'Falha ao registrar push durante a inicialização:',
                pushError
              );
            }
          } else {
            console.log(
              'Expo Go: registro de push remoto ignorado.'
            );
          }

          if (!active) {
            return;
          }

          // ===========================================
          // ESCONDE SPLASH NATIVA
          // ===========================================

          await SplashScreen.hideAsync();

          /*
           * A splash React Native continua por cima
           * enquanto o Stack já está montado.
           */

          // ===========================================
          // FINALIZA SPLASH PERSONALIZADA
          // ===========================================

          splashTimer =
            setTimeout(() => {
              if (!active) {
                return;
              }

              setShowCustomSplash(false);

              /*
               * Se o aplicativo foi aberto tocando
               * em uma push, respeitamos a rota dela.
               *
               * Caso contrário, abertura normal:
               * vai para o login.
               */
              if (
                initialNotificationRoute
              ) {
                router.replace(
                  initialNotificationRoute as any
                );
              } else {
                router.replace('/login');
              }
            }, 2000);
        } catch (error) {
          console.error(
            'Erro durante inicialização:',
            error
          );

          try {
            await SplashScreen.hideAsync();
          } catch {}

          if (!active) {
            return;
          }

          setShowCustomSplash(false);

          router.replace('/login');
        }
      };

    void iniciarApp();

    return () => {
      active = false;

      if (splashTimer) {
        clearTimeout(
          splashTimer
        );
      }
    };
  }, [
    rootState?.key,
    router,
    isExpoGo,
  ]);

  // ===================================================
  // INTERFACE
  // ===================================================

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={customTheme}
      >
        <View
          style={styles.appContainer}
        >
          <StatusBar
            style="dark"
            hidden={showCustomSplash}
          />

          {/*
           * O Stack permanece montado inclusive
           * enquanto a splash está aparecendo.
           */}
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />

          {/*
           * Splash personalizada fica apenas
           * sobreposta ao aplicativo.
           */}
          {showCustomSplash && (
            <View
              style={
                styles.splashOverlay
              }
            >
              <Image
                source={require(
                  '../assets/images/splash.png'
                )}
                style={
                  styles.splashImage
                }
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({
    appContainer: {
      flex: 1,
    },

    splashOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,

      backgroundColor:
        '#ffffff',

      zIndex: 9999,
      elevation: 9999,
    },

    splashImage: {
      width: '100%',
      height: '100%',
    },
  });