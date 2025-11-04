// controle-pecas/app/tecnico/AdminDrawer.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import CadastroScreen from './cadastro';
import EstoqueCarroScreen from './screens/EstoqueCarroScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import LogoutScreen from './screens/LogoutScreen';
import RetiradasScreen from './screens/RetiradasScreen'; // ⬅️ Use PascalCase e o mesmo nome do export

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="estoque" // ⬅️ chave interna estável
      screenOptions={{
        headerStyle: { backgroundColor: '#0dc50dbe' },
        headerTintColor: '#0a0a0aff',
        headerTitleAlign: 'center',
        drawerActiveTintColor: '#0dc50dbe',
        drawerLabelStyle: { fontSize: 16 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="estoque" // ⬅️ chave interna
        component={EstoqueScreen}
        options={{
          title: 'Estoque de Peças Filial', // label no Drawer
          headerTitle: 'Estoque de Peças Filial', // título no header
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
            <Drawer.Screen
        name="cadastro"
        component={CadastroScreen}
        options={{
          title: 'Cadastrar Peças',
          headerTitle: 'Cadastrar Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="carro"
        component={EstoqueCarroScreen}
        options={{
          title: 'Estoque do Carro',
          headerTitle: 'Estoque do Carro',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="retiradas"
        component={RetiradasScreen}
        options={{
          title: 'Peças à Retirar',
          headerTitle: 'Retiradas',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="logout"
        component={LogoutScreen}
        options={{
          title: 'Logout',
          headerTitle: 'Sair do Sistema',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}