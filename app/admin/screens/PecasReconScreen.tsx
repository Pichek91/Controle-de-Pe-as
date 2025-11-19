import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { API_BASE } from '../../../src/config';

type ReconItem = {
  id: number;
  part_id: number;
  qty: number;
  status: 'ready_for_pickup' | 'picked_up';
  must_return: 0 | 1;
  recon_status?: 'pending' | 'received' | 'restored' | 'discarded' | null;
  recon_received_at?: string | null;
  recon_processed_at?: string | null;
  returned_at?: string | null;
  handover_at?: string | null;           // << NOVO: técnico entregou?
  technicianEmail: string;
  technicianUid?: string | null;
  created_at: string;
  part: {
    id: number;
    nome: string;
    codigo: string;
    marca?: string | null;
    modelo?: string | null;
  };
};

export default function PecasReconScreen() {
  const [items, setItems] = useState<ReconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchRecon = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setError(null);
      const { data } = await axios.get(`${API_BASE}/recon-items`, { timeout: 12000, signal: ctrl.signal as any });
      const onlyToConfirm = (data?.items ?? []).filter(
      (x: ReconItem) => (x.recon_status ?? 'pending') !== 'received');
      setItems(onlyToConfirm);

    } catch (e: any) {
      if (e?.name !== 'CanceledError' && e?.message !== 'canceled') {
        console.log('ERRO GET /recon-items =>', e?.response?.status, e?.response?.data, e?.message);
        setError('Falha ao carregar peças para recon. Puxe para atualizar e tente novamente.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecon();
    return () => abortRef.current?.abort();
  }, [fetchRecon]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecon();
  }, [fetchRecon]);

  const confirmarEntrega = async (id: number) => {
    try {
      setBusyId(id);
      await axios.post(`${API_BASE}/recon-items/${id}/confirm-receipt`, { notes: null }, { timeout: 12000 });
      // remove da lista local (agora vai para ReconScreen/Lab)
      setItems(prev => prev.filter(x => x.id !== id));
      Alert.alert('OK', 'Entrega confirmada. Item enviado para o Recon.');
    } catch (e: any) {
      console.log('ERRO confirm-receipt =>', e?.response?.status, e?.response?.data, e?.message);
      const msg = e?.response?.data?.error ?? 'Não foi possível confirmar a entrega.';
      Alert.alert('Erro', msg === 'NO_TECH_HANDOVER'
        ? 'O técnico ainda não registrou a devolução.'
        : msg
      );
      // recarrega silencioso
      fetchRecon();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Carregando peças para recon…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Peças para Recon</Text>
        <Text style={styles.headerSub}>
          {items.length ? `${items.length} pendente(s) de retorno` : 'Nenhuma peça pendente de retorno'}
        </Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Sem peças marcadas para retorno no momento.</Text>
        }
        renderItem={({ item }) => {
          const devolvida = !!item.handover_at; // técnico já entregou
          return (
            <View style={styles.card}>
              <Text style={styles.partName}>{item.part.nome}</Text>

              <Text style={styles.line}><Text style={styles.label}>Código: </Text>{item.part.codigo}</Text>
              <Text style={styles.line}><Text style={styles.label}>Quantidade: </Text>{item.qty}</Text>
              <Text style={styles.line}><Text style={styles.label}>Técnico: </Text>{item.technicianEmail}</Text>

              <Text style={styles.meta}>
                Solicitada em {new Date(item.created_at).toLocaleString()}
                {item.status === 'picked_up' ? ' • Já retirada' : ' • Aguardando retirada'}
              </Text>

              {/* Ação condicional */}
              {devolvida ? (
                <TouchableOpacity
                  onPress={() => confirmarEntrega(item.id)}
                  disabled={busyId === item.id}
                  style={[styles.btn, styles.btnConfirm, busyId === item.id && { opacity: 0.7 }]}
                >
                  <Text style={styles.btnLabel}>{busyId === item.id ? 'Confirmando…' : 'Confirmar entrega'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.badgeWaiting}>
                  <Text style={styles.badgeText}>Aguardando devolução do técnico…</Text>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 10, backgroundColor: '#0E141A' },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9FB0C7' },

  header: { marginBottom: 8 },
  headerTitle: { color: '#E6EDF7', fontWeight: '800', fontSize: 20 },
  headerSub: { marginTop: 2, color: '#9FB0C7', fontSize: 13 },

  errorText: { backgroundColor: '#3B1F22', borderColor: '#6C2F35', borderWidth: 1, color: '#FFB4B4', padding: 10, borderRadius: 8, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 24, color: '#9FB0C7' },

  card: { backgroundColor: '#111923', borderWidth: 1, borderColor: '#233042', borderRadius: 12, padding: 12, marginVertical: 8 },
  partName: { color: '#E6EDF7', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  line: { color: '#C8D4E6', fontSize: 14, marginTop: 2 },
  label: { color: '#9FB0C7', fontWeight: '700' },
  meta: { color: '#7893B0', fontSize: 12, marginTop: 6 },

  btn: { marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  btnConfirm: { backgroundColor: '#1565c0' },
  btnLabel: { color: '#fff', fontWeight: '800' },

  badgeWaiting: {
    marginTop: 10,
    borderWidth: 1, borderColor: '#35506C',
    backgroundColor: '#0F1720',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center'
  },
  badgeText: { color: '#AFC4DE', fontWeight: '700' },
});