// src/notifications/pushTokenService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; // opcional, se você salvar o token aqui
import { Platform } from 'react-native';
import { API_BASE } from '../config';

// Opcional: se você usa RN Firebase Auth nativo
// import auth from '@react-native-firebase/auth';

// Opcional: se você usa Firebase Web SDK
// import { getAuth } from 'firebase/auth';

const STORAGE_KEY = 'expo_push_token'; // mesma chave usada no seu notifications.ts (se aplicável)

type RegisterTokenPayload = {
  userUid: string;
  token: string;
  platform: 'ios' | 'android';
  app?: string;
};

/**
 * Registra o token de push do device no backend para um dado userUid.
 * IMPORTANTE: este método NÃO tenta gerar token via Expo; apenas registra o token RECEBIDO.
 * De preferência, passe sempre o token por parâmetro (obtido via getStoredExpoPushToken()).
 *
 * Se você realmente quiser um fallback para ler token local, sem chamar API do Expo,
 * ative o bloco comentado que lê do AsyncStorage/SecureStore.
 */
export async function registerDeviceToken(userUid: string, expoPushToken?: string): Promise<boolean> {
  try {
    let token = expoPushToken;

    // ⚠️ Fallback opcional (sem chamar APIs do Expo):
    if (!token) {
      token = (await AsyncStorage.getItem(STORAGE_KEY)) || (await SecureStore.getItemAsync(STORAGE_KEY)) || undefined;
    }

    if (!token) {
      console.log('[Push] Nenhum Expo Push Token disponível para registrar.');
      return false;
    }

    // Opcional: Bearer se seu backend valida ID Token do Firebase
    // const currentUser = auth().currentUser; // RN Firebase
    // const bearer = await currentUser?.getIdToken?.();

    // const bearer = await getAuth().currentUser?.getIdToken?.(); // Firebase Web SDK

    const payload: RegisterTokenPayload = {
      userUid,
      token,
      platform: (Platform.OS as 'ios' | 'android'),
      app: 'controle-pecas',
    };

    const res = await axios.post(`${API_BASE}/device-token`, payload, {
      timeout: 10000,
      // headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
    });

    if (res.status >= 200 && res.status < 300) {
      return true;
    }

    console.log('[Push] Falha ao registrar token. Status:', res.status, res.data);
    return false;
  } catch (e: any) {
    const msg = e?.response?.data || e?.message || String(e);
    console.log('[Push] Erro ao registrar token no backend:', msg);
    return false;
  }
}

/**
 * Remove o token atual do device no backend.
 * Idealmente você passa explicitamente o token salvo.
 * Se não passar, pode tentar ler do AsyncStorage/SecureStore (sem chamar APIs do Expo).
 */
export async function removeDeviceToken(expoPushToken?: string): Promise<boolean> {
  try {
    let token = expoPushToken;

    if (!token) {
      token = (await AsyncStorage.getItem(STORAGE_KEY)) || (await SecureStore.getItemAsync(STORAGE_KEY)) || undefined;
    }

    if (!token) {
      console.log('[Push] Nenhum token disponível para remoção.');
      return false;
    }

    const res = await axios.delete(`${API_BASE}/device-token`, {
      data: { token },
      timeout: 10000,
    });

    if (res.status >= 200 && res.status < 300) {
      return true;
    }

    console.log('[Push] Falha ao remover token. Status:', res.status, res.data);
    return false;
  } catch (e: any) {
    const msg = e?.response?.data || e?.message || String(e);
    console.log('[Push] Erro ao remover token no backend:', msg);
    return false;
  }
}