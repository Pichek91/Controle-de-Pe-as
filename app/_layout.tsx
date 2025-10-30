import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4CAF50', // Verde principal
    accent: '#FFC107',  // Amarelo para destaque
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    onSurface: '#000000',
    error: '#D32F2F'
  },
  roundness: 8 // Bordas mais arredondadas
};

export default function Layout() {
  return (
    <PaperProvider theme={customTheme}>
      <Stack
        screenOptions={{
          headerShown: false, // Oculta cabeçalho padrão do Expo Router
        }}
      />
    </PaperProvider>
  );
}