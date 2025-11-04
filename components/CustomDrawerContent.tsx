// CustomDrawerContent.tsx — sem o item de “Notificações”
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthUser } from '../src/hooks/useAuthUser';

type CustomProps = DrawerContentComponentProps & { unreadCount?: number };

export default function CustomDrawerContent(props: CustomProps) {
  const { user } = useAuthUser();
  const email = user?.email ?? 'Usuário';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 8) }]}
      >
        {/* Apenas os itens registrados no Drawer.Navigator */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text numberOfLines={1} style={styles.email}>{email}</Text>
        <Image source={require('../assets/images/icon.png')} style={styles.footerImage} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 0 },
  bottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E3E3',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  email: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 8 },
  footerImage: { width: '100%', height: 60, opacity: 0.95 },
});