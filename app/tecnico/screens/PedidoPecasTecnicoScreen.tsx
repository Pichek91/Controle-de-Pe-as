import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../../../src/config';

type Pedido = {
  id: string;
  nome: string;
  marca?: string;
  modelo?: string;
  codigo?: string;
  quantidade: number;
  status: 'pendente' | 'atendido';
  foto?: string;
};

export default function PedidoPecasTecnicoScreen() {
  const [linkDrive, setLinkDrive] = useState('');
  const [lista, setLista] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
  });

  const [foto, setFoto] = useState<string | null>(null);

  const user = getAuth().currentUser;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 🔹 pega pedidos do técnico
      const { data } = await axios.get(`${API_BASE}/pedidos/${user?.uid}`);
      setLista(data || []);

      // 🔹 pega link do admin
      const { data: linkData } = await axios.get(`${API_BASE}/link-vistas`);
      setLinkDrive(linkData.link || '');
    } catch (e: any) {
      console.log('ERRO FETCH =>', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const escolherFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.5,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const enviarPedido = async () => {
    if (!form.nome || !form.quantidade) {
      console.log('Preencha nome e quantidade');
      return;
    }

    try {
      const body = new FormData();

      body.append('nome', form.nome);
      body.append('marca', form.marca);
      body.append('modelo', form.modelo);
      body.append('codigo', form.codigo);
      body.append('quantidade', form.quantidade);
      body.append('tecnicoUid', user?.uid || '');
      body.append('tecnicoEmail', user?.email || '');

      if (foto) {
        body.append('foto', {
          uri: foto,
          name: 'foto.jpg',
          type: 'image/jpeg',
        } as any);
      }

      await axios.post(`${API_BASE}/pedidos`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // limpar
      setForm({ nome: '', marca: '', modelo: '', codigo: '', quantidade: '' });
      setFoto(null);

      fetchData();
    } catch (e: any) {
      console.log('ERRO ENVIAR =>', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
    }
  };

  const cancelarPedido = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/pedidos/${id}`);
      fetchData();
    } catch (e: any) {
      console.log('ERRO CANCELAR =>', {
        status: e?.response?.status,
        data: e?.response?.data,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* LINK */}
      {!!linkDrive && (
        <TouchableOpacity
          style={styles.linkBox}
          onPress={() => Linking.openURL(linkDrive)}
        >
          <Ionicons name="link" size={18} />
          <Text style={{ marginLeft: 6 }}>Abrir vistas explodidas</Text>
        </TouchableOpacity>
      )}

      {/* FORM */}
      <Text style={styles.title}>Solicitar Peça</Text>

      <TextInput placeholder="Nome da peça" style={styles.input} value={form.nome} onChangeText={(t) => setForm({ ...form, nome: t })} />
      <TextInput placeholder="Marca" style={styles.input} value={form.marca} onChangeText={(t) => setForm({ ...form, marca: t })} />
      <TextInput placeholder="Modelo" style={styles.input} value={form.modelo} onChangeText={(t) => setForm({ ...form, modelo: t })} />
      <TextInput placeholder="Código" style={styles.input} value={form.codigo} onChangeText={(t) => setForm({ ...form, codigo: t })} />
      <TextInput placeholder="Quantidade" keyboardType="numeric" style={styles.input} value={form.quantidade} onChangeText={(t) => setForm({ ...form, quantidade: t })} />

      <TouchableOpacity style={styles.fotoBtn} onPress={escolherFoto}>
        <Text>Selecionar foto</Text>
      </TouchableOpacity>

      {foto && <Image source={{ uri: foto }} style={{ height: 80, marginVertical: 8 }} />}

      <TouchableOpacity style={styles.btn} onPress={enviarPedido}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar Pedido</Text>
      </TouchableOpacity>

      {/* LISTA */}
      <Text style={styles.section}>Meus pedidos</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.sub}>Qtd: {item.quantidade}</Text>

                <Text
                  style={{
                    color: item.status === 'atendido' ? 'green' : '#ff7043',
                    fontWeight: '700',
                  }}
                >
                  {item.status === 'atendido'
                    ? 'Disponível no estoque ✅'
                    : 'Aguardando'}
                </Text>
              </View>

              {item.status !== 'atendido' && (
                <TouchableOpacity onPress={() => cancelarPedido(item.id)}>
                  <Ionicons name="trash" size={20} color="red" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },

  linkBox: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#eef6ff',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },

  title: { fontWeight: '700', marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },

  fotoBtn: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },

  btn: {
    backgroundColor: '#2bb673',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },

  section: { fontWeight: '700', marginTop: 10 },

  item: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 8,
  },

  nome: { fontWeight: '700' },
  sub: { color: '#666', fontSize: 12 },
});