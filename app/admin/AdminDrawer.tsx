// AdminDrawer.tsx — apenas sininho no header; Notificações ocultas no Drawer
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { createDrawerNavigator } from '@react-navigation/drawer';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import CadastrarScreen from './screens/CadastrarScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import LogoutScreen from './screens/LogoutScreen';
import PecasReconScreen from './screens/PecasReconScreen';
import PedidoScreen from './screens/PedidoScreen';
import RecebimentosScreen from './screens/RecebimentosScreen';
import ReconScreen from './screens/ReconScreen';
import SeparacaoScreen from './screens/SeparacaoScreen';
// IMPORTANTE: use a tela real de notificações
import NotificacoesScreen from './screens/NotificacoesScreen';

import { API_BASE } from '../../src/config';
import CadastroUsuario from './screens/CadastroUsuario';
import TreinamentoScreen from './screens/TreinamentoScreen';

const Drawer = createDrawerNavigator();
const ADMIN_UID = 'ADMIN'; // mesmo valor do .env (ADMIN_UID)

function NotificationBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function HeaderBell({ count, onPress }: { count?: number; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6 }} activeOpacity={0.7}>
      <View style={{ justifyContent: 'center' }}>
        <Ionicons name="notifications-outline" size={24} color="#0a0a0aff" />
        <View style={styles.badgeContainer}>
          <NotificationBadge count={count} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Hook simples de polling para unread-count do canal ADMIN */
function useUnreadCount(userUid?: string, pollMs = 15000) {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      if (!userUid) {
        setCount(0);
        return;
      }
      const { data } = await axios.get(`${API_BASE}/notifications/unread-count`, {
        params: { userUid },
        timeout: 10000,
      });
      if (typeof data?.count === 'number') setCount(data.count);
    } catch {
      // Silenciar erro no header
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    fetchCount();
    if (pollMs > 0) timer = setInterval(fetchCount, pollMs);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pollMs, userUid]);

  return count;
}

export default function AdminDrawer() {
  // Sempre contar do canal ADMIN (badge do sininho)
  const unreadCount = useUnreadCount(ADMIN_UID, 15000);

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: '#0dc50dbe' },
      headerTintColor: '#0a0a0aff',
      headerTitleAlign: 'center' as const,
      drawerActiveTintColor: '#0dc50dbe',
      drawerLabelStyle: { fontSize: 16 },
    }),
    []
  );

  return (
    <Drawer.Navigator
      initialRouteName="Estoque de Peças"
      screenOptions={screenOptions}
      // Passamos unreadCount pro CustomDrawerContent só se você quiser usar em outra parte
      drawerContent={(props) => <CustomDrawerContent {...props} unreadCount={unreadCount} />}
    >
      <Drawer.Screen
        name="Estoque de Peças"
        component={EstoqueScreen}
        options={({ navigation }) => ({
          headerTitle: 'Estoque de Peças',
          drawerIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Cadastrar Peças"
        component={CadastrarScreen}
        options={({ navigation }) => ({
          headerTitle: 'Cadastro de Peças',
          drawerIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Separação de Pedido de Peças"
        component={SeparacaoScreen}
        options={({ navigation }) => ({
          headerTitle: 'Separação de Pedidos',
          drawerIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Recebimentos de Peças"
        component={RecebimentosScreen}
        options={({ navigation }) => ({
          headerTitle: 'Recebimentos',
          drawerIcon: ({ color, size }) => <Ionicons name="download-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Recon"
        component={ReconScreen}
        options={({ navigation }) => ({
          headerTitle: 'Reconstrução',
          drawerIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Peças para Recon"
        component={PecasReconScreen}
        options={({ navigation }) => ({
          headerTitle: 'Peças para Recon',
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}

      />
      <Drawer.Screen
        name="Pedido de Peças"
        component={PedidoScreen}
        options={({ navigation }) => ({
          headerTitle: 'Pedido de Peças',
          drawerIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />
      <Drawer.Screen
        name="Treinamentos"
        component={TreinamentoScreen}
        options={({ navigation }) => ({
          headerTitle: 'Treinamentos',
          drawerIcon: ({ color, size }) => <Ionicons name="today" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Usuarios"
        component={CadastroUsuario}
        options={({ navigation }) => ({
          headerTitle: 'Usuarios',
          drawerIcon: ({ color, size }) => <FontAwesome5 name="users-cog" size={24} color="black" />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      <Drawer.Screen
        name="Logout"
        component={LogoutScreen}
        options={({ navigation }) => ({
          headerTitle: 'Sair do Sistema',
          drawerIcon: ({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />,
          headerRight: () => <HeaderBell count={unreadCount} onPress={() => navigation.navigate('Notificações')} />,
        })}
      />

      {/** ✅ Tela de Notificações registrada, porém OCULTA do Drawer */}
      <Drawer.Screen
        name="Notificações"
        component={NotificacoesScreen}
        options={{
          drawerItemStyle: { display: 'none' }, // esconde do menu lateral
          headerTitle: 'Notificações',
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    right: -2,
    top: -2,
  },
  badge: {
    backgroundColor: '#e11',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});