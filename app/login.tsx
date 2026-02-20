// controle-pecas/app/login.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

import { getStoredExpoPushToken } from '../src/notifications/notifications';
import { registerDeviceToken } from '../src/notifications/pushTokenService';

function mapFirebaseAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha inválidos.';
    case 'auth/invalid-email':
      return 'E-mail em formato inválido.';
    case 'auth/user-disabled':
      return 'Usuário desativado. Entre em contato com o administrador.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão e tente novamente.';
    default:
      return 'Não foi possível realizar o login. Tente novamente.';
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvarDados, setSalvarDados] = useState(false);
  const [loading, setLoading] = useState(false);

  const [supportsBiometry, setSupportsBiometry] = useState(false);
  const [autoBiometry, setAutoBiometry] = useState(false);
  const SECURE_KEY_AUTO_BIOMETRY = 'use_biometry_auto_login';

  const router = useRouter();

  useEffect(() => {
    const carregarDadosSalvos = async () => {
      const dados = await AsyncStorage.getItem('loginData');
      if (dados) {
        const { email, senha } = JSON.parse(dados);
        setEmail(email);
        setSenha(senha);
        setSalvarDados(true);
      }
    };
    carregarDadosSalvos();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setSupportsBiometry(Boolean(hasHardware && enrolled));
      } catch {
        setSupportsBiometry(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(SECURE_KEY_AUTO_BIOMETRY);
        const flag = stored === '1';
        setAutoBiometry(flag);

        if (flag && supportsBiometry) {
          await handleBiometricLogin();
        }
      } catch {}
    })();
  }, [supportsBiometry]);

  const handleLogin = async () => {
    const emailSan = email.trim().toLowerCase();
    const senhaSan = senha.trim();

    if (!emailSan || !senhaSan) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailSan, senhaSan);
      const uid = userCredential.user.uid;

      // 🔔 Expo Push
      try {
        const expoPushToken = await getStoredExpoPushToken();
        if (typeof expoPushToken === 'string') {
          await registerDeviceToken(uid, expoPushToken);
        }
      } catch (e) {
        console.log('[ExpoPush] Registro do token após login falhou:', (e as any)?.message ?? String(e));
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Usuário não encontrado na base de dados.');
        return;
      }

      const userData = userDoc.data();
      const tipo = String(userData.tipo ?? userData.role ?? '');

      if (salvarDados) {
        await AsyncStorage.setItem('loginData', JSON.stringify({ email: emailSan, senha: senhaSan }));
        await SecureStore.setItemAsync('secureLoginData', JSON.stringify({ email: emailSan, senha: senhaSan }));
      } else {
        await AsyncStorage.removeItem('loginData');
        await SecureStore.deleteItemAsync('secureLoginData');
      }

      if (tipo === 'admin') {
        router.replace('/admin-select' as any);
      } else if (tipo === 'tecnico') {
        router.replace('/tecnico');
      } else {
        Alert.alert('Erro', 'Tipo de usuário inválido.');
      }

    } catch (error: any) {
      const code = error?.code as string | undefined;
      const friendly = mapFirebaseAuthError(code);
      Alert.alert('Erro ao logar', friendly);
      console.log('Login error:', code, error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Biometria indisponível', 'Este dispositivo não possui sensor biométrico.');
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Biometria não configurada', 'Cadastre sua biometria nas configurações do aparelho.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Entrar com biometria',
        fallbackLabel: 'Usar senha',
        cancelLabel: 'Cancelar',
        requireConfirmation: false,
      });

      if (!result.success) {
        Alert.alert('Falhou', 'Não foi possível autenticar com biometria.');
        return;
      }

      const json = await SecureStore.getItemAsync('secureLoginData');
      if (!json) {
        Alert.alert('Sem dados', 'Faça login com e-mail e senha uma vez e ative "Salvar dados de login" para habilitar a biometria.');
        return;
      }

      const { email: savedEmail, senha: savedSenha } = JSON.parse(json) as { email: string; senha: string };

      const userCredential = await signInWithEmailAndPassword(auth, savedEmail, savedSenha);
      const uid = userCredential.user.uid;

      // 🔔 Expo Push
      try {
        const expoPushToken = await getStoredExpoPushToken();
        if (typeof expoPushToken === 'string') {
          await registerDeviceToken(uid, expoPushToken);
        }
      } catch (e) {
        console.log('[ExpoPush] Registro do token pós-bio falhou:', (e as any)?.message ?? String(e));
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Usuário não encontrado na base de dados.');
        return;
      }

      const userData = userDoc.data();
      const tipo = String(userData.tipo ?? userData.role ?? '');

      if (tipo === 'admin') router.replace('/admin-select' as any);
      else if (tipo === 'tecnico') router.replace('/tecnico');
      else Alert.alert('Erro', 'Tipo de usuário inválido.');

    } catch (e: any) {
      console.log('Biometric login error:', e?.message ?? String(e));
      Alert.alert('Erro', 'Não foi possível autenticar com biometria.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoBiometry = async (value: boolean) => {
    setAutoBiometry(value);
    try {
      await SecureStore.setItemAsync(SECURE_KEY_AUTO_BIOMETRY, value ? '1' : '0');
    } catch {}
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholder="Digite seu e-mail"
        placeholderTextColor="#8a8a8a"
        selectionColor="#007bff"
      />

      <Text style={styles.label}>Senha</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          style={styles.passwordInput}
          placeholder="Digite sua senha"
          placeholderTextColor="#8a8a8a"
          selectionColor="#007bff"
        />
        <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} hitSlop={8}>
          <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={24} color="#555" />
        </TouchableOpacity>
      </View>

      <View style={styles.switchContainer}>
        <Switch value={salvarDados} onValueChange={setSalvarDados} />
        <Text style={styles.switchText}>Salvar dados de login</Text>
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <View style={styles.loadingButton}>
            <ActivityIndicator color="#007bff" />
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.button, styles.flexGrow]} onPress={handleLogin}>
                <Text style={styles.buttonText}>Entrar</Text>
              </TouchableOpacity>

              {supportsBiometry && (
                <TouchableOpacity
                  style={styles.biometricIconButton}
                  onPress={handleBiometricLogin}
                  accessibilityLabel="Entrar com biometria"
                >
                  <MaterialCommunityIcons name="fingerprint" size={28} color="#1F2937" />
                </TouchableOpacity>
              )}
            </View>

            {supportsBiometry && (
              <View style={[styles.switchContainer, { marginTop: 10 }]}>
                <Switch value={autoBiometry} onValueChange={toggleAutoBiometry} />
                <Text style={styles.switchTextWrap}>Usar biometria nos próximos logins.</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f2f5' },
  logo: {
    width: 250, height: 250, marginBottom: 20, backgroundColor: '#fff', borderRadius: 16, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20,
  },
  label: { alignSelf: 'flex-start', fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, width: '100%', backgroundColor: '#fff', color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, marginBottom: 20, width: '100%', backgroundColor: '#fff',
  },
  passwordInput: { flex: 1, paddingVertical: 10, color: '#000' },

  switchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start', width: '100%' },
  switchText: { marginLeft: 10, color: '#333' },
  switchTextWrap: {
    marginLeft: 10,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
    minWidth: 0,
    width: '0%',
  },

  buttonContainer: { width: '100%', marginTop: 8 },
  button: { backgroundColor: '#56a2f3ff', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingButton: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#e9e9e9', borderRadius: 8 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flexGrow: { flex: 1 },

  biometricIconButton: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
