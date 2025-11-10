// app/tecnico/index.tsx
import React from 'react';
import 'react-native-gesture-handler'; // <-- DEVE vir antes de tudo
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AdminDrawer from './AdminDrawer';

export default function AdminIndex() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AdminDrawer />
    </GestureHandlerRootView>
  );
}

// Se você ainda usa isso, pode manter
AdminIndex.options = { headerShown: false };