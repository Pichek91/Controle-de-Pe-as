// app/tecnico/AdminDrawer.tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
// ❌ import { router } from 'expo-router';  // <- vamos trocar por navigation do Drawer
import { useNavigation } from '@react-navigation/native'; // ✅
import CustomDrawerContent from '../../components/CustomDrawerContent';

import CadastroScreen from './cadastro';
import EstoqueCarroScreen from './screens/EstoqueCarroScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import LogoutScreen from './screens/LogoutScreen';
import RetiradasScreen from './screens/RetiradasScreen';

// ✅ importe a tela de notificações
import { useNotificationsBadge } from '../../src/hooks/useNotificationsBadge';
import NotificacoesTecnicoScreen from './notificacoes';

const Drawer = createDrawerNavigator();

function BellButton() {
  const { count } = useNotificationsBadge();
  const navigation = useNavigation<any>(); // para navegar dentro do Drawer

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('notificacoes')} // ✅ abre a screen oculta do próprio Drawer
      style={{ marginRight: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Notificações"
    >
      <View>
        <Ionicons name="notifications-outline" size={22} color="#0a0a0aff" />
        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              right: -6,
              top: -4,
              backgroundColor: 'red',
              paddingHorizontal: 6,
              height: 18,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="estoque"
      screenOptions={{
        headerStyle: { backgroundColor: '#0dc50dbe' },
        headerTintColor: '#0a0a0aff',
        headerTitleAlign: 'center',
        drawerActiveTintColor: '#0dc50dbe',
        drawerLabelStyle: { fontSize: 16 },
        headerRight: () => <BellButton />,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="estoque"
        component={EstoqueScreen}
        options={{
          title: 'Estoque de Peças Filial',
          headerTitle: 'Estoque de Peças Filial',
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
      {/* ✅ Screen OCULTA para Notificações (não aparece no menu) */}
      <Drawer.Screen
        name="notificacoes"
        component={NotificacoesTecnicoScreen}
        options={{
          title: 'Notificações',
          headerTitle: 'Notificações',
          drawerItemStyle: { display: 'none' }, // <- oculta do Drawer
          drawerIcon: () => null,
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