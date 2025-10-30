import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import EstoqueScreen from './screens/EstoqueScreen';
import CadastrarScreen from './screens/CadastrarScreen';
import RecebimentosScreen from './screens/RecebimentosScreen';
import ReconScreen from './screens/ReconScreen';
import PecasReconScreen from './screens/PecasReconScreen';
import LogoutScreen from './screens/LogoutScreen';

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Estoque de Peças"
      screenOptions={{
        headerStyle: { backgroundColor: '#0dc50dbe' },
        headerTintColor: '#0a0a0aff',
        headerTitleAlign: 'center', // Centraliza o título
        drawerActiveTintColor: '#0dc50dbe',
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen
        name="Estoque de Peças"
        component={EstoqueScreen}
        options={{
          headerTitle: 'Estoque de Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Cadastrar Peças"
        component={CadastrarScreen}
        options={{
          headerTitle: 'Cadastro de Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Recebimentos de Peças"
        component={RecebimentosScreen}
        options={{
          headerTitle: 'Recebimentos',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Recon"
        component={ReconScreen}
        options={{
          headerTitle: 'Reconstrução',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Peças para Recon"
        component={PecasReconScreen}
        options={{
          headerTitle: 'Peças para Recon',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
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