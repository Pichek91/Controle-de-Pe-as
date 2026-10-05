import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tecnico = {
  uid: string;
  email: string | null;
  role?: 'admin' | 'tecnico' | null;
  displayName?: string | null;
};

const API_BASE_URL =
  'https://api.grancoffeepecas.com.br';

async function getIdToken(): Promise<string | undefined> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return undefined;

    return await user.getIdToken(true);
  } catch {
    return undefined;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getIdToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');

    throw new Error(
      `GET ${path} falhou (${res.status}) ${body}`
    );
  }

  return res.json();
}

function useTecnicos() {
  const [data, setData] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await apiGet<{ users: Tecnico[] }>(
        '/admin/users?role=tecnico&limit=100'
      );

      const users = (resp?.users ?? []).filter(
        (u) => !!u.uid
      );

      setData(users);
    } catch (e: any) {
      setError(
        e?.message ?? 'Erro ao buscar técnicos'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export default function ListaTecnicosScreen() {
  const { data, loading, error, refresh } =
    useTecnicos();

  const [query, setQuery] = useState('');

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return data;

    return data.filter(
      (t) =>
        t.displayName?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    );
  }, [data, query]);

  const onPressTecnico = (tecnico: Tecnico) => {
    router.push({
      pathname: '/admin/estoque-tec/tecnico',
      params: {
        tecnicoId: tecnico.uid,
        tecnicoEmail: tecnico.email ?? '',
        tecnicoNome:
          tecnico.displayName ??
          tecnico.email ??
          '',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou e-mail"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color="#999"
            />
          </TouchableOpacity>
        )}
      </View>

      {loading && filtrados.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>
            Carregando técnicos...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            Erro: {error}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refresh}
          >
            <Text style={styles.retryText}>
              Tentar novamente
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item, i) =>
            item.uid ?? String(i)
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                onPressTecnico(item)
              }
            >
              <View style={styles.cardLeft}>
                <Ionicons
                  name="person-circle"
                  size={36}
                  color="#4a90e2"
                />
              </View>

              <View style={styles.cardCenter}>
                <Text style={styles.cardTitle}>
                  {item.displayName ??
                    item.email ??
                    '(sem e-mail)'}
                </Text>

                {!!item.email && (
                  <Text
                    style={styles.cardSubtitle}
                  >
                    {item.email}
                  </Text>
                )}
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>
                Nenhum técnico encontrado.
              </Text>
            </View>
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

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },

  cardLeft: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardCenter: {
    flex: 1,
  },

  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
  },

  cardSubtitle: {
    color: '#666',
    fontSize: 13,
  },
});