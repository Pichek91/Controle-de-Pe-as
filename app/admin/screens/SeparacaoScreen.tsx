import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE } from '../../../src/config'; // << ajuste o path se necessário

type ReqItem = {
  id: number;
  qty: number;
  status: 'pending' | 'ready_for_pickup' | 'picked_up' | 'rejected';
  technicianEmail: string;
  technicianUid?: string | null;
  created_at: string;
  must_return?: 0 | 1; // (pode vir da API)
  part: { id: number; nome: string; codigo: string; marca?: string; modelo?: string };
};

export default function SeparacaoScreen() {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/separation-requests`, {
        params: { status: 'pending' },
        timeout: 10000,
      });
      setItems(data?.requests ?? []);
    } catch (e: any) {
      console.log('ERRO /separation-requests?status=pending =>', e?.response?.status, e?.response?.data, e?.message);
      Alert.alert('Erro', 'Falha ao carregar pedidos pendentes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10000); // polling a cada 10s
    return () => clearInterval(t);
  }, [fetchData]);

  // -------- Aprovar (sem retorno) ----------
  const approve = async (id: number) => {
    try {
      setBusy(id);
      await axios.post(
        `${API_BASE}/separation-requests/${id}/approve`,
        { approvedBy: 'admin@empresa', mustReturn: false },
        { timeout: 10000 }
      );
      setItems((prev) => prev.filter((r) => r.id !== id));
      Alert.alert('OK', 'Solicitação aprovada: peça pronta para retirada.');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Falha ao aprovar.';
      console.log('ERRO approve =>', e?.response?.status, e?.response?.data);
      Alert.alert('Erro', msg === 'ALREADY_PROCESSED' ? 'Solicitação já processada.' : msg);
      fetchData();
    } finally {
      setBusy(null);
    }
  };

  // -------- Aprovar (RETORNA) ----------
  // Apenas aprova com mustReturn=true e remove da lista local; NÃO navega.
  const approveReturn = async (id: number) => {
    try {
      setBusy(id);
      await axios.post(
        `${API_BASE}/separation-requests/${id}/approve`,
        { approvedBy: 'admin@empresa', mustReturn: true }, // << seta must_return=1
        { timeout: 10000 }
      );
      setItems((prev) => prev.filter((r) => r.id !== id));
      Alert.alert('OK', 'Aprovada para retorno: aparecerá em Peças para Recon.');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Falha ao aprovar (retorno).';
      console.log('ERRO approve (return) =>', e?.response?.status, e?.response?.data);
      Alert.alert('Erro', msg === 'ALREADY_PROCESSED' ? 'Solicitação já processada.' : msg);
      fetchData();
    } finally {
      setBusy(null);
    }
  };

  // -------- Rejeitar ----------
  const reject = async (id: number) => {
    Alert.alert('Confirmar', 'Deseja rejeitar e devolver a peça ao estoque?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(id);
            await axios.post(
              `${API_BASE}/separation-requests/${id}/reject`,
              { rejectedBy: 'admin@empresa' },
              { timeout: 10000 }
            );
            setItems((prev) => prev.filter((r) => r.id !== id));
            Alert.alert('Rejeitada', 'Solicitação rejeitada e estoque restaurado.');
          } catch (e: any) {
            const msg = e?.response?.data?.error ?? 'Falha ao rejeitar.';
            console.log('ERRO reject =>', e?.response?.status, e?.response?.data);
            Alert.alert('Erro', msg === 'ALREADY_PROCESSED' ? 'Solicitação já processada.' : msg);
            fetchData();
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 24 }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="cube-outline" size={18} color="#2e7d32" />
              <Text style={styles.title}>
                {item.part.nome}{' '}
                <Text style={styles.muted}>(cód. {item.part.codigo})</Text>
              </Text>
            </View>

            <Text style={styles.text}>
              Qtd: <Text style={styles.textStrong}>{item.qty}</Text>
            </Text>
            <Text style={styles.text}>
              Solicitante: <Text style={styles.textStrong}>{item.technicianEmail}</Text>
            </Text>
            <Text style={styles.createdAt}>
              Criada em {new Date(item.created_at).toLocaleString()}
            </Text>

            <View style={styles.actions}>
              {/* Aprovar normal */}
              <TouchableOpacity
                onPress={() => approve(item.id)}
                disabled={busy === item.id}
                style={[styles.btn, styles.btnApprove, busy === item.id && styles.btnDisabled]}
              >
                <Text style={styles.btnLabel}>
                  {busy === item.id ? 'Aprovando...' : 'Aprovar'}
                </Text>
              </TouchableOpacity>

              {/* Aprovar (Retorna) -> NÃO navega */}
              <TouchableOpacity
                onPress={() => approveReturn(item.id)}
                disabled={busy === item.id}
                style={[styles.btn, styles.btnReturn, busy === item.id && styles.btnDisabled]}
              >
                <Text style={styles.btnLabel}>
                  {busy === item.id ? 'Aprovando...' : 'Aprovar (Retorna)'}
                </Text>
              </TouchableOpacity>

              {/* Rejeitar */}
              <TouchableOpacity
                onPress={() => reject(item.id)}
                disabled={busy === item.id}
                style={[styles.btn, styles.btnReject, busy === item.id && styles.btnDisabled]}
              >
                <Text style={styles.btnLabel}>Rejeitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma solicitação pendente.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fafafa' },

  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { marginLeft: 6, fontSize: 16, fontWeight: '700', color: '#1b5e20' },
  muted: { color: '#666', fontWeight: '400' },

  text: { fontSize: 14, color: '#333', marginTop: 4 },
  textStrong: { fontWeight: '700', color: '#111' },
  createdAt: { marginTop: 6, color: '#777', fontSize: 12 },

  // Ações com wrap (3 botões)
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  btnApprove: { backgroundColor: '#2e7d32' },
  btnReturn: { backgroundColor: '#1565c0' }, // azul p/ diferenciar RETORNO
  btnReject: { backgroundColor: '#c62828' },
  btnDisabled: { opacity: 0.7 },
  btnLabel: { color: '#fff', fontWeight: '700' },

  empty: { textAlign: 'center', marginTop: 24, color: '#777' },
});
