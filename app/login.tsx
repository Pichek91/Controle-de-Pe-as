import React, { useState, useEffect } from 'react';
import {View,Text,TextInput,Button,Alert,Image,TouchableOpacity,Switch,} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvarDados, setSalvarDados] = useState(false);
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
    console.log('Tentando logar com:', email);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      console.log('Login bem-sucedido:', userCredential);

      const uid = userCredential.user.uid;
      console.log('UID do usuário:', uid);

      const userDoc = await getDoc(doc(db, 'users', uid));
      console.log('Documento do usuário:', userDoc.exists() ? userDoc.data() : 'Documento não encontrado');

      if (!userDoc.exists()) {
        Alert.alert('Erro', 'Usuário não encontrado na base de dados');
        return;
      }

      const tipo = String(userDoc.data().tipo || '');
      console.log('Tipo de usuário:', tipo);

      if (salvarDados) {
        await AsyncStorage.setItem('loginData', JSON.stringify({ email, senha }));
      } else {
        await AsyncStorage.removeItem('loginData');
      }

      if (tipo === 'admin') {
        console.log('Redirecionando para /admin');
        router.replace('/admin');
      } else if (tipo === 'tecnico') {
        console.log('Redirecionando para /tecnico');
        router.replace('/tecnico');
      } else {
        console.warn('Tipo de usuário inválido:', tipo);
        Alert.alert('Erro', 'Tipo de usuário inválido');
      }
    } catch (error) {
      console.error('Erro ao tentar logar:', error);
      if (error instanceof Error) {
        Alert.alert('Erro ao logar', error.message);
      } else {
        Alert.alert('Erro ao logar', 'Erro desconhecido');
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Image
        source={require('../assets/images/logo.png')}
        style={{ width: 150, height: 150, marginBottom: 30 }}
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
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', borderBottomWidth: 1, marginBottom: 20 }}>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          style={{ flex: 1 }}
        />
        <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
          <Ionicons name={mostrarSenha ? 'eye-off' : 'eye'} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Switch value={salvarDados} onValueChange={setSalvarDados} />
        <Text style={{ marginLeft: 10 }}>Salvar dados de login</Text>
      </View>
      <Button title="Entrar" onPress={handleLogin} />
    </View>
  );
}