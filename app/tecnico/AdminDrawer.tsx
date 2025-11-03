// controle-pecas/app/tecnico/AdminDrawer.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import CustomDrawerContent from '../../components/CustomDrawerContent'; // <— ajuste o caminho conforme sua estrutura
import EstoqueCarroScreen from './screens/EstoqueCarroScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import LogoutScreen from './screens/LogoutScreen';

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Estoque de Peças"
      screenOptions={{
        headerStyle: { backgroundColor: '#0dc50dbe' },
        headerTintColor: '#0a0a0aff',
        headerTitleAlign: 'center',
        drawerActiveTintColor: '#0dc50dbe',
        drawerLabelStyle: { fontSize: 16 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />} // <— AQUI
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
        name="Estoque do Carro"
        component={EstoqueCarroScreen}
        options={{
          headerTitle: 'Estoque do Carro',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
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