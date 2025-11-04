import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';

// --- mapeia códigos do Firebase para mensagens amigáveis ---
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

  const handleLogin = async () => {
    // validação simples
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
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Usuário não encontrado na base de dados.');
        return;
      }

      const tipo = String(userDoc.data().tipo || '');

      if (salvarDados) {
        await AsyncStorage.setItem('loginData', JSON.stringify({ email: emailSan, senha: senhaSan }));
      } else {
        await AsyncStorage.removeItem('loginData');
      }

      if (tipo === 'admin') {
        router.replace('/admin');
      } else if (tipo === 'tecnico') {
        router.replace('/tecnico');
      } else {
        Alert.alert('Erro', 'Tipo de usuário inválido.');
      }
    } catch (error: any) {
      // pega code e mostra mensagem amigável
      const code = error?.code as string | undefined;
      const friendly = mapFirebaseAuthError(code);
      Alert.alert('Erro ao logar', friendly);
      console.log('Login error:', code, error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Image
        source={require('../assets/images/logo.png')}
        style={{ width: 350, height: 350, marginBottom: 5 }}
        resizeMode="contain"
      />
      <Text>Email:</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderBottomWidth: 1, marginBottom: 10, width: '100%' }}
      />
      <Text>Senha:</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          borderBottomWidth: 1,
          marginBottom: 20,
        }}
      >
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          style={{ flex: 1, paddingVertical: 8 }}
        />
        <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} hitSlop={8}>
          <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={24} color="gray" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Switch value={salvarDados} onValueChange={setSalvarDados} />
        <Text style={{ marginLeft: 10 }}>Salvar dados de login</Text>
      </View>

      <View style={{ width: '100%', marginTop: 8 }}>
        {loading ? (
          <View style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: '#e9e9e9', borderRadius: 4 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <Button title="Entrar" onPress={handleLogin} />
        )}
        <Image
        source={require('../assets/images/icon.png')}
        style={{ width: 100, height: 100, marginBottom:20, alignSelf:'center', marginTop:30 }}
        resizeMode="contain"
      />
      </View>
    </View>
  );
}
