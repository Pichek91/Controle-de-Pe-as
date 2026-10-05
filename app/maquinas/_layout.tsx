import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import React from 'react';

import CustomDrawerContent from '../../components/CustomDrawerContent';

export default function MaquinasLayout() {
  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} />
      )}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#1e293b',
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="stats-chart-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          drawerLabel: 'Estoque',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="cube-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="inventario"
        options={{
          title: 'Inventário',
          drawerLabel: 'Inventário',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="clipboard-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="cadastro"
        options={{
          title: 'Cadastro',
          drawerLabel: 'Cadastro',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="add-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="localizador"
        options={{
          title: 'Localizador',
          drawerLabel: 'Localizador',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="search-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="index"
        options={{
          drawerItemStyle: {
            display: 'none',
          },
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
