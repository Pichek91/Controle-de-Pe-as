import React from 'react';
import AdminDrawer from './AdminDrawer';

export default function AdminIndex() {
  return <AdminDrawer />;
}

// Oculta o cabeçalho padrão do Expo Router
AdminIndex.options = {
  headerShown: false,
};