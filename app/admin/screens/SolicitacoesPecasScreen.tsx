import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../../../src/config';

type Solicitacao = {
  id: string;
  tecnicoNome: string;
  tecnicoUid: string;
  nome: string; // ✅ corrigido
  marca?: string;
  modelo?: string;
  codigo?: string;
  quantidade: number;
  status?: string;
};

export default function SolicitacoesPecasScreen({ navigation }: any) {
  const [linkDrive, setLinkDrive] = useState('');
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/pecas-solicitadas`);

      // ✅ AGORA PEGA CERTO DO BACK
      setLista(data.lista || []);
      setLinkDrive(data.link || '');
    } catch (e) {
      console.log('ERRO AO BUSCAR:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ SALVAR LINK NO BACK
  const salvarLink = async () => {
    try {
      await axios.post(`${API_BASE}/pecas-solicitadas/link`, {
        link: linkDrive,
      });
    } catch (e) {
      console.log('Erro ao salvar link');
    }
  };

  const abrirDrive = () => {
    if (linkDrive) Linking.openURL(linkDrive);
  };

  const remover = async (id: string) => {
    await axios.delete(`${API_BASE}/pecas-solicitadas/${id}`);
    fetchData();
  };

  const receberPeca = (item: Solicitacao) => {
    navigation.navigate('Cadastrar Peças', {
      prefill: {
        nome: item.nome,
        marca: item.marca,
        modelo: item.modelo,
        codigo: item.codigo,
        quantidade: item.quantidade,
        origemSolicitacaoId: item.id,
        tecnicoUid: item.tecnicoUid,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* LINK DRIVE */}
      <View style={styles.card}>
        <Text style={styles.title}>Vistas Explodidas</Text>

        <TextInput
          placeholder="Cole o link do Google Drive"
          value={linkDrive}
          onChangeText={setLinkDrive}
          style={styles.input}
        />

        <TouchableOpacity style={styles.btn} onPress={salvarLink}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={styles.btnText}>Salvar Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { marginTop: 6 }]} onPress={abrirDrive}>
          <Ionicons name="link" size={18} color="#fff" />
          <Text style={styles.btnText}>Abrir Drive</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <Text style={styles.section}>Peças solicitadas</Text>

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

                <Text style={styles.sub}>
                  Técnico: {item.tecnicoNome || item.tecnicoUid}
                </Text>

                <Text style={styles.sub}>
                  Qtd: {item.quantidade}
                </Text>

                {!!item.codigo && (
                  <Text style={styles.sub}>Código: {item.codigo}</Text>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.okBtn}
                  onPress={() => receberPeca(item)}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => remover(item.id)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },

  card: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },

  title: { fontWeight: '700', fontSize: 16, marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },

  btn: {
    flexDirection: 'row',
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 6,
  },

  btnText: { color: '#fff', fontWeight: '700' },

  section: { fontWeight: '700', marginBottom: 8 },

  item: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },

  nome: { fontWeight: '700' },
  sub: { color: '#666', fontSize: 12 },

  actions: {
    justifyContent: 'center',
    gap: 6,
  },

  okBtn: {
    backgroundColor: '#2bb673',
    padding: 8,
    borderRadius: 6,
  },

  delBtn: {
    backgroundColor: '#e53935',
    padding: 8,
    borderRadius: 6,
  },
});