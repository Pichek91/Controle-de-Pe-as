
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import { MD3LightTheme as DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50',   // Verde principal
    accent: '#FFC107',    // Amarelo para destaque
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    onSurface: '#000000',
    error: '#D32F2F',
  },
  roundness: 8, // Bordas mais arredondadas
};

// Impede o fechamento automático do splash nativo
SplashScreen.preventAutoHideAsync().catch(() => {
  // Se já foi chamado, apenas ignora o erro
});

export default function Layout() {
  const router = useRouter();
  const rootState = useRootNavigationState(); // indica quando o navigator está pronto

  useEffect(() => {
    // Só executa quando o navegador raiz estiver montado (evita o erro "navigate before mounting")
    if (!rootState?.key) return;

    const t = setTimeout(async () => {
      try {
        // Fecha o splash após ~3s; a UI RN ficará visível
        await SplashScreen.hideAsync();

        // Agora que o Root Layout está pronto, podemos navegar com segurança
        router.replace('/login');
      } catch {
        // Ignora erros silenciosamente
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [rootState?.key, router]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={customTheme}>
        {/* StatusBar opcional para controlar tema da barra */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false, // Oculta cabeçalho padrão do Expo Router
          }}
        />
      </PaperProvider>
    </SafeAreaProvider>
  )};
