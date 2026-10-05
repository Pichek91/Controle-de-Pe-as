import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { API_BASE } from '../../config';
import { useAuth } from '../../hooks/useAuth';

type ReturnItem = {
  id: number;
  qty: number;
  status: 'picked_up';
  must_return: 0 | 1;
  recon_status?: 'pending' | 'received' | 'restored' | 'discarded' | null;
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

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DevolucaoScreen() {
  const { uid, token } = useAuth();

  const [items, setItems] = useState<ReturnItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const hdrs = useMemo(() => authHeaders(token), [token]);

  const fetchList = useCallback(async (): Promise<ReturnItem[]> => {
    if (!uid) return [];

    const url =
      `${API_BASE}/returns/my?technicianUid=${encodeURIComponent(uid)}`;

    const res = await fetch(url, {
      headers: hdrs,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');

      let err: any = {};

      try {
        err = JSON.parse(txt);
      } catch {}

      throw new Error(err?.error ?? `HTTP ${res.status}`);
    }

    const json = await res.json();

    return json?.items ?? [];
  }, [uid, hdrs]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) {
          setInitialLoading(true);
        }

        const list = await fetchList();

        setItems(list);
      } catch (e: any) {
        console.warn('[Devolução] load error:', e?.message);

        if (!opts?.silent) {
          Alert.alert(
            'Erro',
            'Falha ao carregar itens para devolução.'
          );
        }
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [fetchList]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ silent: true });
  }, [load]);

  const devolverAgora = async (id: number) => {
    if (!uid) {
      Alert.alert(
        'Erro',
        'Não foi possível identificar o técnico logado.'
      );
      return;
    }

    setBusyId(id);

    try {
      const res = await fetch(
        `${API_BASE}/returns/${id}/hand-over`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...hdrs,
          },
          body: JSON.stringify({
            technicianUid: uid,
          }),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => '');

        let err: any = {};

        try {
          err = JSON.parse(txt);
        } catch {}

        Alert.alert(
          'Erro',
          err?.error ?? 'Falha ao registrar devolução.'
        );

        await load({ silent: true });
        return;
      }

      setItems((prev) =>
        prev.filter((item) => item.id !== id)
      );

      Alert.alert(
        'Sucesso',
        'Devolução registrada. Obrigado!'
      );
    } catch (e: any) {
      console.warn('[Devolução] hand-over erro:', e);

      Alert.alert(
        'Erro',
        'Não foi possível registrar a devolução.'
      );
    } finally {
      setBusyId(null);
    }
  };

  if (initialLoading) {
    return (
      <ActivityIndicator
        size="large"
        color="#2e7d32"
        style={{ marginTop: 24 }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>
              {item.part.nome}{' '}
              <Text style={styles.muted}>
                (cód. {item.part.codigo})
              </Text>
            </Text>

            <Text style={styles.text}>
              Qtd:{' '}
              <Text style={styles.strong}>
                {item.qty}
              </Text>
            </Text>

            <Text style={styles.textSmall}>
              Retirada em{' '}
              {new Date(item.created_at).toLocaleString()}
              {' • '}
              Deve retornar ao Recon
            </Text>

            <TouchableOpacity
              onPress={() => devolverAgora(item.id)}
              disabled={busyId === item.id}
              style={[
                styles.btn,
                busyId === item.id && styles.btnDisabled,
              ]}
            >
              <Text style={styles.btnLabel}>
                {busyId === item.id
                  ? 'Enviando…'
                  : 'Devolver agora'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhuma peça pendente de devolução.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fafafa',
  },

  listContent: {
    paddingBottom: 24,
  },

  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b5e20',
  },

  muted: {
    color: '#666',
  },

  text: {
    fontSize: 14,
    marginTop: 4,
    color: '#222',
  },

  strong: {
    fontWeight: '700',
  },

  textSmall: {
    marginTop: 6,
    color: '#777',
    fontSize: 12,
  },

  btn: {
    marginTop: 12,
    backgroundColor: '#1565c0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },

  btnDisabled: {
    opacity: 0.7,
  },

  btnLabel: {
    color: '#fff',
    fontWeight: '700',
  },

  empty: {
    textAlign: 'center',
    marginTop: 24,
    color: '#777',
  },
});