import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CustomDrawerContent from '../../components/CustomDrawerContent';
import { useNotificationsBadge } from '../../src/hooks/useNotificationsBadge';

function NotificationBadge({ count }: { count?: number }) {
  if (!count) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

function HeaderBell() {
  const { count } = useNotificationsBadge();

  return (
    <TouchableOpacity
      onPress={() => router.push('/admin/notificacoes')}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Notificações"
    >
      <View style={{ justifyContent: 'center' }}>
        <Ionicons
          name="notifications-outline"
          size={24}
          color="#0a0a0aff"
        />

        <View style={styles.badgeContainer}>
          <NotificationBadge count={count} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  return (
    <Drawer
      initialRouteName="estoque"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} />
      )}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0dc50dbe',
        },
        headerTintColor: '#0a0a0aff',
        headerTitleAlign: 'center',
        drawerActiveTintColor: '#0dc50dbe',
        drawerLabelStyle: {
          fontSize: 16,
        },
        headerRight: () => <HeaderBell />,
      }}
    >
      <Drawer.Screen
        name="estoque"
        options={{
          title: 'Estoque de Peças',
          headerTitle: 'Estoque de Peças',
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
        name="cadastrar"
        options={{
          title: 'Cadastrar Peças',
          headerTitle: 'Cadastro de Peças',
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
        name="separacao"
        options={{
          title: 'Separação de Pedido de Peças',
          headerTitle: 'Separação de Pedidos',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="clipboard"
              size={size}
              color={color}
            />
          ),
        }}
      />

<Drawer.Screen
  name="recebimentos"
  options={{
    title: 'Enviar Notificação',
    headerTitle: 'Enviar Notificação',
    drawerIcon: ({ color, size }) => (
      <Ionicons
        name="notifications-outline"
        size={size}
        color={color}
      />
    ),
  }}
/>

      <Drawer.Screen
        name="recon"
        options={{
          title: 'Recon',
          headerTitle: 'Reconstrução',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="construct-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="pecas-recon"
        options={{
          title: 'Peças para Recon',
          headerTitle: 'Peças para Recon',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="pedido"
        options={{
          title: 'Pedido de Peças',
          headerTitle: 'Pedido de Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="clipboard"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="treinamentos"
        options={{
          title: 'Treinamentos',
          headerTitle: 'Treinamentos',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="today"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="estoque-tec"
        options={{
          title: 'Estoque Técnicos',
          headerTitle: 'Estoque Técnicos',
          drawerIcon: () => (
            <AntDesign
              name="cluster"
              size={24}
              color="black"
            />
          ),
        }}
      />

      <Drawer.Screen
        name="solicitacoes"
        options={{
          title: 'Solicitações de Peças',
          headerTitle: 'Solicitações de Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="alert-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="usuarios"
        options={{
          title: 'Usuários',
          headerTitle: 'Usuários',
          drawerIcon: () => (
            <FontAwesome5
              name="users-cog"
              size={24}
              color="black"
            />
          ),
        }}
      />

      <Drawer.Screen
        name="logout"
        options={{
          title: 'Logout',
          headerTitle: 'Sair do Sistema',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="log-out-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Rotas que existem, mas não aparecem no menu */}

      <Drawer.Screen
        name="notificacoes"
        options={{
          title: 'Notificações',
          headerTitle: 'Notificações',
          drawerItemStyle: {
            display: 'none',
          },
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