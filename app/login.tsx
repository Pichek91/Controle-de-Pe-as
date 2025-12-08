
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

      const userData = userDoc.data();
      const tipo = String(userData.tipo || userData.role || '');

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
      const code = error?.code as string | undefined;
      const friendly = mapFirebaseAuthError(code);
      Alert.alert('Erro ao logar', friendly);
      console.log('Login error:', code, error?.message);
    } finally {
      setLoading(false);
    }
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
        placeholderTextColor="#aaa"
      />
      <Text style={styles.label}>Senha</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          style={styles.passwordInput}
          placeholder="Digite sua senha"
          placeholderTextColor="#aaa"
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
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f2f5', // fundo moderno claro
  },

logo: {
  width: 250,
  height: 250,
  marginBottom: 20,
  backgroundColor: '#fff', // harmoniza com recorte branco
  borderRadius: 16,
  padding: 10,
  // Sombra para iOS
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 20,
  // Sombra para Android
  elevation: 20,
},

  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    width: '100%',
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  switchText: {
    marginLeft: 10,
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#56a2f3ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButton: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#e9e9e9',
    borderRadius: 8,
  },
});
