import 'react-native-get-random-values';
import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Oculta cabeçalho padrão do Expo Router
      }}
    />
  );
}