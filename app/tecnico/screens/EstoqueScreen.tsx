import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE, ENDPOINTS } from '../../../src/config'; // << ajuste o path se necessário

// === NOVO === pegar email/uid do técnico logado
import { useAuthUser } from '../../../src/hooks/useAuthUser';

type Peca = {
  id: string | number;
  nome?: string;
  codigo?: string;
  marca?: string;
  modelo?: string;
  quantidade?: number;
  imagem?: string | null;
};

export default function EstoqueScreen() {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // busca e filtros
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState(''); // valor selecionado
  const [filterType, setFilterType] = useState<'marca' | 'modelo' | ''>(''); // campo escolhido
  const [filterPanelOpen, setFilterPanelOpen] = useState(false); // abre/fecha painel
  const [boxListOpen, setBoxListOpen] = useState(false); // abre/fecha BoxList

  // === NOVO === estado do modal de solicitação
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const [qtySolicitar, setQtySolicitar] = useState<number>(1);
  const [sending, setSending] = useState(false);

  // === NOVO === usuário logado
  const { user } = useAuthUser();
  const technicianEmail = user?.email ?? 'tecnico@sem-email';
  const technicianUid = (user as any)?.uid ?? (user as any)?.id ?? null;

  // trata URL da imagem (relativa → absoluta)
  const getImageUri = (img?: string | null) => {
    if (!img) return undefined as unknown as string;
    return img.startsWith('http') ? img : `${API_BASE}${img}`;
  };

  async function fetchPecas() {
    try {
      const response = await axios.get(ENDPOINTS.pecas, { timeout: 10000 });
      setPecas(response.data ?? []);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      Alert.alert('Erro', 'Não foi possível carregar as peças.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPecas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPecas();
  };

  // opções (memo)
  const marcas = useMemo(
    () => Array.from(new Set(pecas.map((p) => p.marca).filter(Boolean))) as string[],
    [pecas]
  );
  const modelos = useMemo(
    () => Array.from(new Set(pecas.map((p) => p.modelo).filter(Boolean))) as string[],
    [pecas]
  );

  // aplica busca + filtro
  const filteredPecas = useMemo(() => {
    const s = search.trim().toLowerCase();
    return pecas.filter((p) => {
      const searchMatch =
        (p?.nome ?? '').toLowerCase().includes(s) ||
        (p?.codigo ?? '').toLowerCase().includes(s);
      if (!filterValue) return searchMatch;
      if (filterType === 'marca') return searchMatch && p?.marca === filterValue;
      if (filterType === 'modelo') return searchMatch && p?.modelo === filterValue;
      return searchMatch;
    });
  }, [pecas, search, filterType, filterValue]);

  // === NOVO === abrir modal de solicitação ao tocar numa peça (se tiver estoque)
  const onPressPeca = (item: Peca) => {
    const estoque = Number(item.quantidade || 0);
    if (estoque <= 0) {
      Alert.alert('Sem estoque', 'Esta peça está sem saldo no estoque geral.');
      return;
    }
    setPecaSelecionada(item);
    setQtySolicitar(1);
    setSolicitarOpen(true);
  };

  // item da lista (somente visualização + clique para solicitar)
  const renderItem = ({ item }: { item: Peca }) => {
    const imgUri = getImageUri(item.imagem);
    return (
      <TouchableOpacity style={styles.card} onPress={() => onPressPeca(item)}>
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image" size={24} color="#9e9e9e" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.nome}</Text>
          <Text style={styles.subtitle}>Código: {item.codigo ?? '-'}</Text>
          <Text style={styles.subtitle}>Marca: {item.marca ?? '-'}</Text>
        </View>
        <View style={styles.qtyBox}>
          <Text style={styles.qtyLabel}>Qtd.</Text>
          <Text style={styles.qtyValue}>{item.quantidade ?? 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // abre BoxList conforme tipo
  const openBoxList = () => {
    if (!filterType) {
      Alert.alert('Filtro', 'Escolha “Marca” ou “Modelo” antes.');
      return;
    }
    setBoxListOpen(true);
  };

  const boxOptions =
    filterType === 'marca' ? marcas : filterType === 'modelo' ? modelos : [];

  // === NOVO === enviar solicitação de separação
  const solicitarSeparacao = async () => {
    if (!pecaSelecionada?.id) return;
    const estoque = Number(pecaSelecionada.quantidade || 0);
    const qty = Number(qtySolicitar || 0);

    if (qty <= 0) {
      Alert.alert('Quantidade inválida', 'Escolha pelo menos 1 unidade.');
      return;
    }
    if (qty > estoque) {
      Alert.alert('Quantidade indisponível', `Máximo disponível: ${estoque}.`);
      return;
    }

    try {
      setSending(true);

      // 1) Cria a solicitação no backend (e baixa do estoque geral)
      //    Exemplo de contrato:
      //    POST /separation-requests
      //    body: { partId, qty, technicianEmail, technicianUid? }
      const { data } = await axios.post(
        `${API_BASE}/separation-requests`,
        {
          partId: pecaSelecionada.id,
          qty,
          technicianEmail,
          technicianUid, // opcional: facilita rastreio
        },
        { timeout: 15000 }
      );

      // 2) (Opcional) cria notificação para os admins responsáveis pela separação
      //    Você pode ter um "userUid" de admin, um grupo, ou deixar o backend decidir.
      // await axios.post(`${API_BASE}/notifications`, {
      //   userUid: 'ADMIN_UID_OU_GRUPO',
      //   title: 'Nova solicitação de separação',
      //   body: `${technicianEmail} solicitou ${qty}x ${pecaSelecionada.nome} (${pecaSelecionada.codigo})`,
      //   type: 'separation_request',
      //   payload: { partId: String(pecaSelecionada.id), qty, technicianEmail },
      // }, { timeout: 10000 });

      // 3) Feedback e atualização
      Alert.alert(
        'Solicitado',
        'Pedido enviado para separação. Aguarde o administrador preparar a peça.'
      );
      setSolicitarOpen(false);
      setPecaSelecionada(null);
      setQtySolicitar(1);

      // Recarrega a lista para refletir a baixa do estoque geral
      await fetchPecas();
    } catch (err: any) {
      console.log('ERRO solicitar separação =>', err?.response?.status, err?.response?.data);
      const msg =
        err?.response?.data?.error ||
        'Não foi possível enviar a solicitação. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Busca + botão de filtro (fixo) */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por nome ou código"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#080808ff"
          selectionColor="#4CAF50"
          cursorColor="#4CAF50"
          underlineColorAndroid="transparent"
        />
        <TouchableOpacity
          onPress={() => setFilterPanelOpen((prev) => !prev)}
          accessibilityLabel="Abrir filtros"
          style={{ padding: 6 }}
        >
          <Ionicons
            name={filterPanelOpen ? 'filter' : 'filter-outline'}
            size={28}
            color="#4CAF50"
          />
        </TouchableOpacity>
      </View>

      {/* Painel de filtros */}
      {filterPanelOpen && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Filtrar por:</Text>
          <View style={styles.filterTypeRow}>
            <TouchableOpacity
              style={[styles.pill, filterType === 'marca' && styles.pillActive, { marginRight: 8 }]}
              onPress={() => setFilterType('marca')}
            >
              <Text style={[styles.pillText, filterType === 'marca' && styles.pillTextActive]}>
                Marca
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, filterType === 'modelo' && styles.pillActive]}
              onPress={() => setFilterType('modelo')}
            >
              <Text style={[styles.pillText, filterType === 'modelo' && styles.pillTextActive]}>
                Modelo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.boxListBtn, !filterType && { opacity: 0.5 }]}
              onPress={openBoxList}
              disabled={!filterType}
            >
              <Ionicons name="chevron-down" size={18} color="#2e7d32" />
              <Text style={styles.boxListBtnText}>
                {filterValue ? 'Trocar opção' : 'Escolher opção'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Resumo do filtro ativo */}
          {!!(!!filterType && !!filterValue) && (
            <View style={styles.activeFilter}>
              <Ionicons name="funnel" size={16} color="#1b5e20" />
              <Text style={styles.activeFilterText}>
                {filterType ? (filterType === 'marca' ? 'Marca' : 'Modelo') : 'Filtro'}
                {filterValue ? `: ${filterValue}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setFilterType('');
                  setFilterValue('');
                }}
              >
                <Ionicons name="close-circle" size={18} color="#2e7d32" />
              </TouchableOpacity>
            </View>
          )}

          {/* Ações */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#e0e0e0' }]}
              onPress={() => {
                setFilterType('');
                setFilterValue('');
                // Mantém o painel aberto para novo filtro
              }}
            >
              <Text style={[styles.actionText, { color: '#333' }]}>Limpar filtro</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                // Pode fechar o painel se preferir:
                // setFilterPanelOpen(false);
              }}
            >
              <Text style={[styles.actionText, { color: '#fff' }]}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredPecas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#777' }}>Nenhuma peça encontrada.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* --- BoxList (Modal) para escolher a opção do filtro --- */}
      <Modal
        visible={boxListOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBoxListOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setBoxListOpen(false)} />
          <View style={styles.boxListContainer}>
            <View style={styles.boxListHeader}>
              <Text style={styles.boxListTitle}>
                {filterType === 'marca'
                  ? 'Escolher Marca'
                  : filterType === 'modelo'
                  ? 'Escolher Modelo'
                  : 'Escolha um filtro'}
              </Text>
              <TouchableOpacity onPress={() => setBoxListOpen(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={{ maxHeight: 360 }}>
              <FlatList
                data={boxOptions}
                keyExtractor={(v) => v}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const selected = item === filterValue;
                  return (
                    <TouchableOpacity
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      onPress={() => {
                        setFilterValue(item);
                        setBoxListOpen(false);
                      }}
                    >
                      <Text
                        style={[styles.optionRowText, selected && styles.optionRowTextSelected]}
                      >
                        {item}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={18} color="#2e7d32" />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#777' }}>
                      {filterType ? 'Sem opções disponíveis.' : 'Escolha Marca ou Modelo.'}
                    </Text>
                  </View>
                }
              />
            </View>

            <TouchableOpacity style={styles.boxListFooterBtn} onPress={() => setBoxListOpen(false)}>
              <Text style={styles.boxListFooterText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === NOVO === Modal de solicitação de separação */}
      <Modal
        visible={solicitarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSolicitarOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setSolicitarOpen(false)} />
          <View style={styles.boxListContainer}>
            <View style={styles.boxListHeader}>
              <Text style={styles.boxListTitle}>Solicitar separação</Text>
              <TouchableOpacity onPress={() => setSolicitarOpen(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {!!pecaSelecionada && (
              <View style={{ gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#222' }}>
                  {pecaSelecionada.nome}
                </Text>
                <Text style={{ color: '#555' }}>
                  Código: {pecaSelecionada.codigo ?? '-'} • Marca: {pecaSelecionada.marca ?? '-'}
                </Text>
                <Text style={{ color: '#1b5e20', fontWeight: '700' }}>
                  Disponível: {Number(pecaSelecionada.quantidade || 0)}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '600', marginRight: 8 }}>Quantidade:</Text>
              <TouchableOpacity
                onPress={() => setQtySolicitar((q) => Math.max(1, q - 1))}
                style={{
                  padding: 8,
                  borderWidth: 1,
                  borderColor: '#c8e6c9',
                  borderRadius: 8,
                  backgroundColor: '#f1f8e9',
                  marginRight: 8,
                }}
              >
                <Ionicons name="remove" size={16} color="#2e7d32" />
              </TouchableOpacity>
              <TextInput
                style={{
                  width: 64,
                  textAlign: 'center',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  paddingVertical: 6,
                }}
                keyboardType="number-pad"
                value={String(qtySolicitar)}
                onChangeText={(t) => {
                  const n = Number(t.replace(/\D/g, '')) || 0;
                  setQtySolicitar(n);
                }}
              />
              <TouchableOpacity
                onPress={() =>
                  setQtySolicitar((q) =>
                    Math.min(Number(pecaSelecionada?.quantidade || 0), (q || 0) + 1)
                  )
                }
                style={{
                  padding: 8,
                  borderWidth: 1,
                  borderColor: '#c8e6c9',
                  borderRadius: 8,
                  backgroundColor: '#f1f8e9',
                  marginLeft: 8,
                }}
              >
                <Ionicons name="add" size={16} color="#2e7d32" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: sending ? '#9CCC65' : '#4CAF50',
                paddingVertical: 12,
                alignItems: 'center',
                borderRadius: 8,
              }}
              onPress={solicitarSeparacao}
              disabled={sending}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {sending ? 'Enviando...' : 'Solicitar separação'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* === FIM modal solicitação === */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  // busca
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  searchInput: { flex: 1, padding: 10 },
  // painel de filtro
  filterPanel: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  filterTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f1f8e9',
  },
  pillActive: { backgroundColor: '#e8f5e9', borderColor: '#4CAF50' },
  pillText: { color: '#2e7d32', fontWeight: '600' },
  pillTextActive: { color: '#1b5e20' },
  // botão que abre a BoxList (fica à direita)
  boxListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f1f8e9',
    marginLeft: 'auto', // empurra para a direita
  },
  boxListBtnText: {
    marginLeft: 6,
    color: '#2e7d32',
    fontWeight: '600',
  },
  // resumo do filtro ativo
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    borderColor: '#c8e6c9',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
  },
  activeFilterText: { color: '#1b5e20', fontWeight: '600', marginHorizontal: 6 },
  // ações
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: { fontWeight: '700' },
  // cards
  card: {
    flexDirection: 'row',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    width: 72,
    height: 72,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555' },
  // quantidade
  qtyBox: {
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginLeft: 8,
  },
  qtyLabel: { fontSize: 12, color: '#2e7d32' },
  qtyValue: { fontSize: 18, fontWeight: '700', color: '#2e7d32' },
  // Modal / BoxList
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  boxListContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '20%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  boxListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  boxListTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRowSelected: {
    backgroundColor: '#e8f5e9',
  },
  optionRowText: { fontSize: 15, color: '#333' },
  optionRowTextSelected: { color: '#1b5e20', fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  boxListFooterBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  boxListFooterText: { fontWeight: '600', color: '#333' },
});