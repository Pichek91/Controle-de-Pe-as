// app/tecnico/EstoqueCarroScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, Chip, Divider, Menu } from 'react-native-paper';
import { auth } from '../../../firebaseConfig';
import { ENDPOINTS /*, API_BASE */ } from '../../../src/config';

type CarroItem = {
  id: number;
  ownerUid: string;
  ownerEmail?: string | null;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  codigo: string;
  quantidade: number;
  estoqueMin: number;
  estoqueMax: number;
  imagem?: string | null;
  created_at?: string;
};

export default function EstoqueCarroScreen() {
  const [items, setItems] = useState<CarroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ====== Busca + Filtro (estilo do print) ======
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filter, setFilter] = useState(''); // valor aplicado
  const [pendingFilter, setPendingFilter] = useState(''); // valor selecionado no painel, antes de aplicar

  const [activeKey, setActiveKey] = useState<'marca' | 'modelo'>('marca'); // chip selecionado
  const [optionsAnchorVisible, setOptionsAnchorVisible] = useState(false); // menu do "Escolher opção"
  const [optionsAnchorEl, setOptionsAnchorEl] = useState<{ x: number; y: number } | null>(null); // para RN-paper ancorar
  const optionList = useMemo(() => {
    if (activeKey === 'marca') {
      return Array.from(new Set(items.map((p) => p.marca).filter(Boolean))) as string[];
    }
    return Array.from(new Set(items.map((p) => p.modelo).filter(Boolean))) as string[];
  }, [items, activeKey]);

  // ====== Modal de detalhe/edição ======
  const [selected, setSelected] = useState<CarroItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<CarroItem>>({});

  // se a API retornar caminho relativo de imagem, prefixe se quiser:
  const getImageUri = (img?: string | null) => {
    if (!img) return undefined as unknown as string;
    return img.startsWith('http') ? img : `${/* API_BASE ?? '' */ ''}${img}`;
  };

  const ownerUid = auth.currentUser?.uid ?? '';

  const fetchEstoque = useCallback(async () => {
    if (!ownerUid) {
      setLoading(false);
      Alert.alert('Atenção', 'Usuário não autenticado.');
      return;
    }
    try {
      const url = `${ENDPOINTS.estoqueCarro}?ownerUid=${encodeURIComponent(ownerUid)}`;
      const { data } = await axios.get<CarroItem[]>(url, { timeout: 12000 });
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.log('Erro ao buscar estoque do carro =>', err?.message);
      Alert.alert('Erro', 'Não foi possível carregar o estoque do carro.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerUid]);

  useEffect(() => {
    fetchEstoque();
  }, [fetchEstoque]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEstoque();
  };

  // ====== Filtragem: busca (nome/código) + filtro aplicado (marca/modelo) ======
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((p) => {
      const searchMatch =
        (p?.nome ?? '').toLowerCase().includes(s) ||
        (p?.codigo ?? '').toLowerCase().includes(s);
      if (!filter) return searchMatch;
      // filtra por marca OU modelo com o valor aplicado
      return (
        searchMatch &&
        ((p?.marca ?? '').toString() === filter || (p?.modelo ?? '').toString() === filter)
      );
    });
  }, [items, search, filter]);

  const openDetail = (item: CarroItem) => {
    setSelected(item);
    setForm({ ...item });
    setEditMode(false);
  };

  const handleChange = (name: keyof CarroItem, value: string) => {
    setForm((f) => ({ ...f, [name]: value as any }));
  };

  const atualizarQuantidade = async (id: number, novaQuantidade: number) => {
    try {
      await axios.put(
        `${ENDPOINTS.estoqueCarro}/${id}`,
        { quantidade: Number.isFinite(novaQuantidade) ? novaQuantidade : 0 },
        { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
      );
      await fetchEstoque();
      setSelected((old) => (old?.id === id ? { ...(old as CarroItem), quantidade: novaQuantidade } : old));
      setForm((f) => ({ ...f, quantidade: novaQuantidade }));
    } catch (err: any) {
      console.log('ERRO atualizarQuantidade =>', err?.response?.status, err?.response?.data);
      Alert.alert('Erro', 'Não foi possível atualizar a quantidade.');
    }
  };

  const salvarEdicao = async () => {
    if (!selected?.id) return;
    try {
      const body: any = {};
      const keys: (keyof CarroItem)[] = ['nome', 'marca', 'modelo', 'codigo', 'estoqueMin', 'estoqueMax', 'quantidade'];
      keys.forEach((k) => {
        if (form[k] !== undefined) {
          const isNum = k === 'quantidade' || k === 'estoqueMin' || k === 'estoqueMax';
          body[k] = isNum ? Number((form[k] as any) ?? 0) : form[k];
        }
      });

      await axios.put(`${ENDPOINTS.estoqueCarro}/${selected.id}`, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      Alert.alert('Sucesso', 'Item atualizado.');
      setEditMode(false);
      setSelected(null);
      fetchEstoque();
    } catch (err: any) {
      console.log('ERRO salvarEdicao =>', err?.response?.status, err?.response?.data);
      Alert.alert('Erro', 'Não foi possível atualizar.');
    }
  };

  const enviarFoto = async (id: number, uri: string) => {
    const data = new FormData();
    data.append('imagem', {
      uri,
      name: `carro_${id}.jpg`,
      type: 'image/jpeg',
    } as any);

    try {
      await axios.put(`${ENDPOINTS.estoqueCarro}/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      Alert.alert('Sucesso', 'Imagem atualizada!');
      await fetchEstoque();
      const atualizado = items.find((p) => p.id === id);
      if (atualizado) setForm((f) => ({ ...f, imagem: atualizado.imagem }));
    } catch (err: any) {
      console.log('ERRO enviarFoto =>', err?.response?.status, err?.response?.data);
      Alert.alert('Erro', 'Falha ao enviar imagem.');
    }
  };

  const escolherDaGaleria = async () => {
    if (!selected?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'É necessário permitir acesso à galeria.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) enviarFoto(selected.id, res.assets[0].uri);
  };

  const tirarFoto = async () => {
    if (!selected?.id) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (!res.canceled) enviarFoto(selected.id, res.assets[0].uri);
  };

  const excluirItem = async () => {
    if (!selected?.id) return;
    Alert.alert('Confirmar', 'Tem certeza que deseja excluir este item do seu carro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ENDPOINTS.estoqueCarro}/${selected.id}`, { timeout: 15000 });
            Alert.alert('Sucesso', 'Item excluído.');
            setSelected(null);
            setForm({});
            fetchEstoque();
          } catch (err: any) {
            console.log('ERRO excluir =>', err?.response?.status, err?.response?.data);
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CarroItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
      <Image source={{ uri: getImageUri(item.imagem) }} style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.nome}</Text>
        <Text style={styles.subtitle}>Código: {item.codigo}</Text>
        <Text style={styles.subtitle}>Marca: {item.marca ?? '-'}</Text>
        <Text style={styles.subtitle}>Qtd: {item.quantidade}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      {/* ======= BARRA DE BUSCA (com ícone de filtro) ======= */}
      <View style={styles.searchBarRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="Pesquisar por nome ou código"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#080808ff"
          selectionColor="#4CAF50"
          cursorColor="#4CAF50"
          underlineColorAndroid="transparent"
        />
        <TouchableOpacity onPress={() => setShowFilterPanel((v) => !v)} style={styles.filterIconBtn}>
          <Ionicons name="filter" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* ======= PAINEL DE FILTRO (estilo do print) ======= */}
      {showFilterPanel && (
        <Card mode="elevated" style={styles.filterCard}>
          <Card.Content>
            <Text style={styles.filterTitleStrong}>Filtrar por:</Text>

            {/* Chips "Marca" e "Modelo" */}
            <View style={styles.chipsRow}>
              <Chip
                mode="outlined"
                selected={activeKey === 'marca'}
                onPress={() => {
                  setActiveKey('marca');
                  setPendingFilter(''); // limpa seleção pendente ao trocar de chave
                }}
                style={[styles.chip, activeKey === 'marca' && styles.chipSelected]}
                selectedColor={activeKey === 'marca' ? '#2e7d32' : undefined}
                icon={activeKey === 'marca' ? 'check' : undefined}
              >
                Marca
              </Chip>

              <Chip
                mode="outlined"
                selected={activeKey === 'modelo'}
                onPress={() => {
                  setActiveKey('modelo');
                  setPendingFilter('');
                }}
                style={[styles.chip, activeKey === 'modelo' && styles.chipSelected]}
                selectedColor={activeKey === 'modelo' ? '#2e7d32' : undefined}
                icon={activeKey === 'modelo' ? 'check' : undefined}
              >
                Modelo
              </Chip>

              {/* Botão seletor "Escolher opção" que abre menu */}
              <Menu
                visible={optionsAnchorVisible}
                onDismiss={() => setOptionsAnchorVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="chevron-down"
                    onPress={(e) => {
                      // @ts-ignore - RN não usa target como web; apenas abrimos o menu
                      setOptionsAnchorEl({ x: 0, y: 0 });
                      setOptionsAnchorVisible(true);
                    }}
                    style={styles.selectBtn}
                    textColor="#7A7F85"
                  >
                    {pendingFilter ? pendingFilter : 'Escolher opção'}
                  </Button>
                }
              >
                {optionList.length === 0 && (
                  <>
                    <Menu.Item title="(sem opções)" disabled />
                    <Divider />
                  </>
                )}
                {optionList.map((opt, idx) => (
                  <Menu.Item
                    key={`${opt}-${idx}`}
                    title={opt}
                    onPress={() => {
                      setPendingFilter(opt);
                      setOptionsAnchorVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </View>

            {/* Ações "Limpar filtro" e "Aplicar" */}
            <View style={styles.filterActionsRow}>
              <Button
                mode="contained-tonal"
                onPress={() => {
                  setFilter('');
                  setPendingFilter('');
                  setShowFilterPanel(false);
                }}
                style={[styles.actionBtn, { backgroundColor: '#E0E0E0' }]}
                textColor="#333"
              >
                Limpar filtro
              </Button>

              <Button
                mode="contained"
                onPress={() => {
                  // aplica o valor pendente (se houver), fecha o painel
                  setFilter(pendingFilter || '');
                  setShowFilterPanel(false);
                }}
                style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                textColor="#fff"
              >
                Aplicar
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingTop: 8 }}
      />

      {/* ======= MODAL DE DETALHE/EDIÇÃO ======= */}
      <Modal visible={!!selected} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          {selected && (
            <>
              <Image source={{ uri: getImageUri(form.imagem as any) }} style={styles.modalImage} />

              {/* VISUALIZAÇÃO */}
              {!editMode && (
                <>
                  <Text style={styles.title}>{selected.nome}</Text>
                  <Text>Código: {selected.codigo}</Text>
                  <Text>Marca: {selected.marca ?? '-'}</Text>
                  <Text>Modelo: {selected.modelo ?? '-'}</Text>
                  <Text>Quantidade: {selected.quantidade}</Text>
                  <Text>Estoque Min: {selected.estoqueMin}</Text>
                  <Text>Estoque Max: {selected.estoqueMax}</Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 16 }}>
                    <Button mode="contained" onPress={() => atualizarQuantidade(selected.id, Math.max(0, selected.quantidade - 1))}>
                      -1
                    </Button>
                    <Button mode="contained" onPress={() => atualizarQuantidade(selected.id, selected.quantidade + 1)}>
                      +1
                    </Button>
                    <Button mode="outlined" onPress={() => setEditMode(true)}>Editar</Button>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 10 }}>
                    <Button mode="outlined" icon="camera" onPress={tirarFoto}>Tirar Foto</Button>
                    <Button mode="outlined" icon="image" onPress={escolherDaGaleria}>Escolher Foto</Button>
                  </View>

                  <Button
                    mode="contained"
                    style={[styles.button, { backgroundColor: '#D32F2F' }]}
                    textColor="#fff"
                    onPress={excluirItem}
                  >
                    Excluir
                  </Button>
                </>
              )}

              {/* EDIÇÃO */}
              {editMode && (
                <>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput style={styles.input} value={String(form.nome ?? '')} onChangeText={(t) => handleChange('nome', t)} />

                  <Text style={styles.label}>Marca</Text>
                  <TextInput style={styles.input} value={String(form.marca ?? '')} onChangeText={(t) => handleChange('marca', t)} />

                  <Text style={styles.label}>Modelo</Text>
                  <TextInput style={styles.input} value={String(form.modelo ?? '')} onChangeText={(t) => handleChange('modelo', t)} />

                  <Text style={styles.label}>Código</Text>
                  <TextInput style={styles.input} value={String(form.codigo ?? '')} onChangeText={(t) => handleChange('codigo', t)} />

                  <Text style={styles.label}>Quantidade</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.quantidade ?? '')}
                    keyboardType="numeric"
                    onChangeText={(t) => handleChange('quantidade', t)}
                  />

                  <Text style={styles.label}>Estoque Mínimo</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.estoqueMin ?? '')}
                    keyboardType="numeric"
                    onChangeText={(t) => handleChange('estoqueMin', t)}
                  />

                  <Text style={styles.label}>Estoque Máximo</Text>
                  <TextInput
                    style={styles.input}
                    value={String(form.estoqueMax ?? '')}
                    keyboardType="numeric"
                    onChangeText={(t) => handleChange('estoqueMax', t)}
                  />

                  <Button mode="contained" style={styles.button} onPress={salvarEdicao}>
                    Salvar
                  </Button>
                </>
              )}

              <Button mode="outlined" style={styles.button} onPress={() => setSelected(null)}>
                Voltar
              </Button>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },

  // barra de busca + ícone filtro
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  filterIconBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },

  // card/painel de filtro
  filterCard: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  filterTitleStrong: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#E8F5E9', // verde clarinho
  },
  chipSelected: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
  },
  selectBtn: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8E9',
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },

  // listagem
  card: {
    flexDirection: 'row',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: { width: 80, height: 80, marginRight: 10, borderRadius: 8, backgroundColor: '#f2f2f2' },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555' },

  // modal
  modalContainer: { padding: 20, alignItems: 'center' },
  modalImage: { width: '100%', height: 200, marginBottom: 20, borderRadius: 10, backgroundColor: '#f2f2f2' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5, width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, marginTop: 10 },
  button: { marginVertical: 8, width: '90%' },

  // overlay reaproveitado (se precisar)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  filterMenu: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '100%' },
  filterTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});