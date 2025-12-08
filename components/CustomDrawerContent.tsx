
import { Ionicons } from '@expo/vector-icons';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AlertButton,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthUser } from '../src/hooks/useAuthUser';

type CustomProps = DrawerContentComponentProps & { unreadCount?: number };

const API_BASE = 'https://api.grancoffeepecas.com.br';

export default function CustomDrawerContent(props: CustomProps) {
  const { user, refreshUser } = useAuthUser();
  const displayName = user?.displayName ?? 'Usuário';

  // Se existe foto (API ou Firebase)
  const hasPhoto = !!(user?.photoUrl || user?.photoURL);

  // URL para exibir com cache-busting (apenas na imagem renderizada)
  const photoUrlForRender = user?.photoUrl
    ? `${user.photoUrl}?t=${Date.now()}`
    : user?.photoURL ?? null;

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const appVersion =
    Constants.expoConfig?.version ??
    // @ts-ignore
    Constants.manifest2?.extra?.expoClient?.version ??
    '0.0.0';
  const buildNumber = (Constants.nativeBuildVersion as string | undefined) ?? '';

  /** Menu do botão de editar: Câmera, Galeria, (Remover se houver), Cancelar SEMPRE */
  const choosePhotoAction = () => {
    const options: AlertButton[] = [
      { text: 'Tirar foto', onPress: pickFromCamera },
      { text: 'Escolher da galeria', onPress: pickFromLibrary },
    ];

    // Remover só se já houver foto
    if (hasPhoto) {
      options.push({
        text: 'Remover foto',
        style: 'destructive',
        onPress: removePhoto,
      });
    }

    // Cancelar sempre presente
    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Atualizar foto', 'Escolha uma opção:', options);
  };

  /** Tirar foto com a câmera */
  const pickFromCamera = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) {
      Alert.alert('Permissão necessária', 'Habilite acesso à câmera para tirar uma foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  /** Escolher da galeria */
  const pickFromLibrary = async () => {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPerm.granted) {
      Alert.alert('Permissão necessária', 'Habilite acesso à galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  /** Upload para API */
  const uploadPhoto = async (uri: string) => {
    if (!user?.token) {
      Alert.alert('Sessão inválida', 'Faça login novamente.');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('imagem', {
        uri,
        name: 'profile.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${API_BASE}/profile/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      // Trate texto puro para evitar erro de parse quando o servidor retorna HTML
      const text = await response.text();
      if (!response.ok) throw new Error(`Erro ${response.status}: ${text}`);

      await refreshUser();
      Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  /** Remover foto */
  const removePhoto = async () => {
    if (!user?.token) {
      Alert.alert('Sessão inválida', 'Faça login novamente.');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/profile/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const text = await resp.text();
      if (!resp.ok) throw new Error(`Erro ${resp.status}: ${text}`);

      await refreshUser();
      Alert.alert('Sucesso', 'Foto removida com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 8) }]}
      >
        {/* Avatar + Nome */}
        <View style={styles.avatarContainer}>
          <Image
            source={
              photoUrlForRender
                ? { uri: photoUrlForRender }
                : require('../assets/images/avatar-placeholder.png')
            }
            style={styles.avatar}
          />
        {/* Botão editar (abre menu com opções) */}
          <TouchableOpacity style={styles.editIcon} onPress={choosePhotoAction}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Nome do usuário */}
        <Text style={styles.displayName}>{displayName}</Text>

        {/* Itens do Drawer */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Rodapé apenas com versão */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.versionText}>
          v{appVersion}{buildNumber ? ` (${buildNumber})` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 0 },

  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E3E3E3',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    transform: [{ translateX: 22 }],
    backgroundColor: '#007AFF',
    borderRadius: 14,
    padding: 6,
    elevation: 2,
  },

  displayName: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },

  bottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E3E3',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  versionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
