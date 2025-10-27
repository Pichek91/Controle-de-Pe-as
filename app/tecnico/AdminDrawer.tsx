import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import LogoutScreen from './screens/LogoutScreen';
import Ionicons from '@expo/vector-icons/Ionicons';

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          headerTitle: 'Sair do Sistema',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}