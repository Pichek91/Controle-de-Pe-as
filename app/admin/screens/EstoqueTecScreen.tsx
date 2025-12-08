
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Se você usa @react-native-firebase/auth, troque a importação conforme sua stack.
import { getAuth } from 'firebase/auth';

// ================================================
// Tipos
// ================================================
type Tecnico = {
  uid: string;                   // usado internamente para as chamadas
  email: string | null;
  role?: 'admin' | 'tecnico' | null;
  displayName?: string | null;   // nome do técnico
};

type PecaCarro = {
  id: string | number;
  nome: string | null;
  marca?: string | null;
  modelo?: string | null;
  codigo: string;
  quantidade: number;
  imagem?: string | null;
};

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

// ================================================
// Navegação local
// ================================================
type EstoqueAdminParamList = {
  EstoqueTecList: undefined;
  TecnicoDetalhe: { tecnico: Tecnico };
  TecnicoEstoqueCarro: { tecnicoId: string; tecnicoEmail?: string | null; tecnicoNome?: string | null };
  TecnicoPendentesDevolucao: { tecnicoId: string; tecnicoEmail?: string | null; tecnicoNome?: string | null };
};

const Stack = createNativeStackNavigator<EstoqueAdminParamList>();

// ================================================
// Helpers de API
// ================================================
const API_BASE_URL = 'https://api.grancoffeepecas.com.br';

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET ${path} falhou (${res.status}) ${body}`);
  }
  return res.json();
}

// ================================================
// Hook: carregar técnicos (GET /admin/users?role=tecnico)
// ================================================
function useTecnicos() {
  const [data, setData] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiGet<{ users: Tecnico[] }>('/admin/users?role=tecnico');
      const users = (resp?.users ?? []).filter(u => !!u.uid);
      setData(users);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao buscar técnicos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ================================================
// Screen: Lista de Técnicos (somente nome e e-mail)
// ================================================
type EstoqueTecListProps = NativeStackScreenProps<EstoqueAdminParamList, 'EstoqueTecList'>;

function EstoqueTecListScreen({ navigation }: EstoqueTecListProps) {
  const { data, loading, error, refresh } = useTecnicos();
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
    navigation.navigate('TecnicoDetalhe', { tecnico });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou e-mail"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading && filtrados.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando técnicos...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Erro: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item, i) => item.uid ?? String(i)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onPressTecnico(item)}>
              <View style={styles.cardLeft}>
                <Ionicons name="person-circle" size={36} color="#4a90e2" />
              </View>
              <View style={styles.cardCenter}>
                <Text style={styles.cardTitle}>{item.displayName ?? item.email ?? '(sem e-mail)'}</Text>
                {/* E-mail sempre visível */}
                {!!item.email && <Text style={styles.cardSubtitle}>{item.email}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>Nenhum técnico encontrado.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ================================================
// Screen: Detalhe do Técnico (somente nome e e-mail)
// ================================================
type TecnicoDetalheProps = NativeStackScreenProps<EstoqueAdminParamList, 'TecnicoDetalhe'>;

function TecnicoDetalheScreen({ navigation, route }: TecnicoDetalheProps) {
  const { tecnico } = route.params;

  const goCarro = () =>
    navigation.navigate('TecnicoEstoqueCarro', {
      tecnicoId: tecnico.uid,
      tecnicoEmail: tecnico.email,
      tecnicoNome: tecnico.displayName ?? tecnico.email ?? null,
    });

  const goPendentes = () =>
    navigation.navigate('TecnicoPendentesDevolucao', {
      tecnicoId: tecnico.uid,
      tecnicoEmail: tecnico.email,
      tecnicoNome: tecnico.displayName ?? tecnico.email ?? null,
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <Ionicons name="person-circle" size={60} color="#4a90e2" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{tecnico.displayName ?? tecnico.email ?? '(sem e-mail)'}</Text>
          {!!tecnico.displayName && !!tecnico.email && <Text style={styles.muted}>{tecnico.email}</Text>}
          {!tecnico.displayName && !!tecnico.email && <Text style={styles.muted}>{tecnico.email}</Text>}
          {/* Não exibimos UID em nenhuma parte da UI */}
        </View>
      </View>

      <View style={styles.btnGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={goCarro}>
          <Ionicons name="car-sport" size={22} color="#fff" />
          <Text style={styles.actionText}>Estoque Carro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff7043' }]} onPress={goPendentes}>
          <Ionicons name="swap-vertical" size={22} color="#fff" />
          <Text style={styles.actionText}>Peças pendentes de devolução</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ================================================
// Screen: Estoque do Carro (GET /estoque-carro?ownerUid=...)
// ================================================
type CarroProps = NativeStackScreenProps<EstoqueAdminParamList, 'TecnicoEstoqueCarro'>;

function TecnicoEstoqueCarroScreen({ route }: CarroProps) {
  const { tecnicoId, tecnicoEmail, tecnicoNome } = route.params;
  const [data, setData] = useState<PecaCarro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiGet<PecaCarro[]>(`/estoque-carro?ownerUid=${encodeURIComponent(tecnicoId)}`);
      setData(resp || []);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar estoque do carro');
    } finally {
      setLoading(false);
    }
  }, [tecnicoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const titulo = tecnicoNome ?? tecnicoEmail ?? 'Técnico';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Estoque no carro — {titulo}</Text>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando peças...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Erro: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {item.codigo} · {item.nome ?? 'Peça'}
                </Text>
                {!!item.marca && !!item.modelo && (
                  <Text style={styles.itemSub}>
                    {item.marca} · {item.modelo}
                  </Text>
                )}
              </View>
              <Text style={styles.itemQty}>
                <Ionicons name="cube" size={16} color="#666" /> {item.quantidade}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>Sem peças no carro para este técnico.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        />
      )}
    </SafeAreaView>
  );
}

// ================================================
// Screen: Pendentes de Devolução (GET /returns/my?technicianUid=...)
// ================================================
type PendentesProps = NativeStackScreenProps<EstoqueAdminParamList, 'TecnicoPendentesDevolucao'>;

function TecnicoPendentesDevolucaoScreen({ route }: PendentesProps) {
  const { tecnicoId, tecnicoEmail, tecnicoNome } = route.params;
  const [data, setData] = useState<ItemPendencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiGet<{ items: ItemPendencia[] }>(`/returns/my?technicianUid=${encodeURIComponent(tecnicoId)}`);
      setData(resp?.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar pendências de devolução');
    } finally {
      setLoading(false);
    }
  }, [tecnicoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const titulo = tecnicoNome ?? tecnicoEmail ?? 'Técnico';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Pendentes de devolução — {titulo}</Text>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando peças...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Erro: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {item.part.codigo} · {item.part.nome ?? 'Peça'}
                </Text>
                <Text style={styles.itemSub}>Solicitação #{item.id} · Qtd: {item.qty}</Text>
                {!!item.part.marca && !!item.part.modelo && (
                  <Text style={styles.itemSub}>
                    {item.part.marca} · {item.part.modelo}
                  </Text>
                )}
              </View>
              <Text style={[styles.itemQty, { color: '#ff7043' }]}>
                <Ionicons name="alert-circle" size={16} color="#ff7043" /> pendente
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>Sem peças pendentes de devolução para este técnico.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        />
      )}
    </SafeAreaView>
  );
}

// ================================================
// Stack "embrulhado" como default export da tela
// ================================================
export default function EstoqueTecScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="EstoqueTecList"
        component={EstoqueTecListScreen}
        options={{ title: 'Estoque Técnicos' }}
      />
      <Stack.Screen
        name="TecnicoDetalhe"
        component={TecnicoDetalheScreen}
        options={({ route }) => ({
          title: route.params.tecnico.displayName ?? route.params.tecnico.email ?? 'Técnico',
        })}
      />
      <Stack.Screen
        name="TecnicoEstoqueCarro"
        component={TecnicoEstoqueCarroScreen}
        options={({ route }) => ({
          title: `Carro · ${route.params.tecnicoNome ?? route.params.tecnicoEmail ?? 'Técnico'}`,
        })}
      />
      <Stack.Screen
        name="TecnicoPendentesDevolucao"
        component={TecnicoPendentesDevolucaoScreen}
        options={({ route }) => ({
          title: `Pendentes · ${route.params.tecnicoNome ?? route.params.tecnicoEmail ?? 'Técnico'}`,
        })}
      />
    </Stack.Navigator>
  );
}

// ================================================
// Estilos
// ================================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: '#666', marginTop: 6 },
  error: { color: '#c62828', fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#4a90e2', borderRadius: 8, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '600' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  searchInput: { flex: 1, marginLeft: 8 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, backgroundColor: '#f9f9f9',
    borderWidth: 1, borderColor: '#eee', marginBottom: 8,
  },
  cardLeft: { width: 44, alignItems: 'center', justifyContent: 'center' },
  cardCenter: { flex: 1 },
  cardTitle: { fontWeight: '700', fontSize: 16, color: '#333' },
  cardSubtitle: { color: '#666', fontSize: 13 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, backgroundColor: '#f4f8ff',
    borderWidth: 1, borderColor: '#e1ecff', marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#2b3a67' },

  btnGrid: { gap: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 10, backgroundColor: '#2bb673',
    gap: 8,
  },
  actionText: { color: '#fff', fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#333' },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#eee', marginBottom: 8,
  },
  itemTitle: { fontWeight: '600', color: '#333' },
  itemSub: { color: '#777', fontSize: 12 },
  itemQty: { color: '#333', fontWeight: '700' },
});
