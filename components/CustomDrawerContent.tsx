import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItemList,
} from '@react-navigation/drawer';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthUser } from '../src/hooks/useAuthUser';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuthUser();
  const email = user?.email ?? 'Usuário';
  const insets = useSafeAreaInsets();

  return (
    // Container geral com flex:1 para permitir fixar o rodapé
    <View style={styles.wrapper}>
      {/* A lista fica rolável e respeita o top safe area */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 8) }, // evita ficar por baixo da barra de status
        ]}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Rodapé fixo, fora do ScrollView */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text numberOfLines={1} style={styles.email}>
          {email}
        </Text>

        {/* Ajuste o caminho conforme seu asset real */}
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.footerImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  bottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E3E3',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  footerImage: {
    width: '100%',
    height: 60, // ajuste conforme sua arte
    opacity: 0.95,
  },
});