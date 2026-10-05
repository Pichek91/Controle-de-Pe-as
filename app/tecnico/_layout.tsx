import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CustomDrawerContent from '../../components/CustomDrawerContent';
import { useNotificationsBadge } from '../../src/hooks/useNotificationsBadge';

function BellButton() {
  const { count } = useNotificationsBadge();

  return (
    <TouchableOpacity
      onPress={() =>
        router.push('/tecnico/notificacoes')
      }
      style={{ marginRight: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Notificações"
    >
      <View>
        <Ionicons
          name="notifications-outline"
          size={22}
          color="#0a0a0aff"
        />

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
            <Text
              style={{
                color: '#fff',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TecnicoLayout() {
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
        headerRight: () => <BellButton />,
      }}
    >
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
        name="cadastro"
        options={{
          title: 'Cadastrar Peça',
          drawerLabel: 'Cadastrar Peça',
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
        name="carro"
        options={{
          title: 'Estoque Carro',
          drawerLabel: 'Estoque Carro',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="car-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="retiradas"
        options={{
          title: 'Retiradas',
          drawerLabel: 'Retiradas',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="exit-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="devolucao"
        options={{
          title: 'Devolução',
          drawerLabel: 'Devolução',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="return-down-back-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="pedido-pecas"
        options={{
          title: 'Pedido de Peças',
          drawerLabel: 'Pedido de Peças',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="cart-outline"
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
          drawerLabel: 'Treinamentos',
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="school-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="logout"
        options={{
          title: 'Sair',
          drawerLabel: 'Sair',
          drawerIcon: ({ color, size }) => (
            <AntDesign
              name="logout"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="notificacoes"
        options={{
          title: 'Notificações',
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