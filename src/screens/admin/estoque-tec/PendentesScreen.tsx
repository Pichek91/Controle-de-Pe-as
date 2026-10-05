import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiGet } from './api';

type ItemPendencia = {
  id: string | number;
  qty: number;
  status: string;
  must_return: number;
  recon_status: string;
  returned_at: string | null;
  technicianEmail: string | null;
  technicianUid: string | null;
  created_at: string;

  part: {
    id: number;
    nome: string | null;
    codigo: string;
    marca?: string | null;
    modelo?: string | null;
  };
};

export default function PendentesScreen() {
  const params = useLocalSearchParams<{
    tecnicoId: string;
    tecnicoEmail?: string;
    tecnicoNome?: string;
  }>();

  const tecnicoId = params.tecnicoId;
  const tecnicoEmail = params.tecnicoEmail ?? '';
  const tecnicoNome = params.tecnicoNome ?? '';

  const [data, setData] = useState<ItemPendencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  const fetchData = useCallback(async () => {
    if (!tecnicoId) return;

    setLoading(true);
    setError(null);

    try {
      const resp = await apiGet<{
        items: ItemPendencia[];
      }>(
        `/returns/my?technicianUid=${encodeURIComponent(
          tecnicoId
        )}`
      );

      setData(resp?.items ?? []);
    } catch (e: any) {
      setError(
        e?.message ??
          'Erro ao carregar pendências de devolução'
      );
    } finally {
      setLoading(false);
    }
  }, [tecnicoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const titulo =
    tecnicoNome || tecnicoEmail || 'Técnico';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>
        Pendentes de devolução — {titulo}
      </Text>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />

          <Text style={styles.muted}>
            Carregando peças...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            Erro: {error}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={fetchData}
          >
            <Text style={styles.retryText}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) =>
            String(item.id ?? i)
          }
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>
                  {item.part.codigo} ·{' '}
                  {item.part.nome ?? 'Peça'}
                </Text>

                <Text style={styles.itemSub}>
                  Solicitação #{item.id} · Qtd:{' '}
                  {item.qty}
                </Text>

                {!!item.part.marca &&
                  !!item.part.modelo && (
                    <Text style={styles.itemSub}>
                      {item.part.marca} ·{' '}
                      {item.part.modelo}
                    </Text>
                  )}
              </View>

              <Text style={styles.pendingText}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color="#ff7043"
                />{' '}
                pendente
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>
                Sem peças pendentes de devolução
                para este técnico.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  muted: {
    color: '#666',
    marginTop: 6,
  },

  error: {
    color: '#c62828',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },

  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    marginTop: 8,
  },

  retryText: {
    color: '#fff',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },

  itemContent: {
    flex: 1,
  },

  itemTitle: {
    fontWeight: '600',
    color: '#333',
  },

  itemSub: {
    color: '#777',
    fontSize: 12,
  },

  pendingText: {
    color: '#ff7043',
    fontWeight: '700',
  },
});
