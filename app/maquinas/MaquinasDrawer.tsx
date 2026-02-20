import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import React from 'react';

import CadastroScreen from './screens/CadastroScreen';
import DashboardScreen from './screens/DashboardScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import LocalizadorScreen from './screens/LocalizadorScreen';


const Drawer = createDrawerNavigator();

export default function MaquinasDrawer() {
  const router = useRouter();


function trocarModulo() {
  router.replace('/admin-select');
}


  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#1e293b',
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Estoque"
        component={EstoqueScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Cadastro"
        component={CadastroScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Localizador"
        component={LocalizadorScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />

      {/* TROCAR MÓDULO */}
      <Drawer.Screen
        name="Trocar módulo"
        component={DashboardScreen}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault();
            trocarModulo();
          },
        }}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
