
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
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

export default function Layout() {
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
  );
}
