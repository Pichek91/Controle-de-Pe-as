import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Alert, ScrollView
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Menu, Button, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://72.61.34.202:3000';

export default function EstoqueScreen() {
  const [pecas, setPecas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedPeca, setSelectedPeca] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'marca' | 'modelo' | ''>('');

  const fetchPecas = async () => {
    try {
      const response = await axios.get(`${API_URL}/pecas`, { timeout: 5000 });
      setPecas(response.data);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      Alert.alert('Erro', 'Não foi possível carregar as peças.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPecas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPecas();
  };

  const filteredPecas = pecas.filter(p => {
    const searchMatch = p.nome.toLowerCase().includes(search.toLowerCase()) ||
                        p.codigo.toLowerCase().includes(search.toLowerCase());

    if (!filter) return searchMatch;

    return searchMatch && (p.marca === filter || p.modelo === filter);
  });

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append('imagem', {
      uri,
      name: `foto-${Date.now()}.jpg`,
      type: 'image/jpeg'
    } as any);

    try {
      await axios.put(`${API_URL}/pecas/${selectedPeca.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Sucesso', 'Imagem atualizada!');
      fetchPecas();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar imagem.');
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadImage(uri);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadImage(uri);
    }
  };

  const excluirPeca = async () => {
    Alert.alert('Confirmar', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/pecas/${selectedPeca.id}`);
            Alert.alert('Sucesso', 'Peça excluída.');
            setSelectedPeca(null);
            setForm({});
            setTimeout(() => fetchPecas(), 300);
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        }
      }
    ]);
  };

  const salvarEdicao = async () => {
    try {
      await axios.put(`${API_URL}/pecas/${selectedPeca.id}`, form);
      Alert.alert('Sucesso', 'Peça atualizada.');
      setEditMode(false);
      setSelectedPeca(null);
      fetchPecas();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar.');
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => {
      setSelectedPeca(item);
      setForm({ ...item }); // mantém todos os campos atuais
      setEditMode(false);
    }}>
      <Image source={{ uri: `${API_URL}${item.imagem}` }} style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.nome}</Text>
        <Text style={styles.subtitle}>Código: {item.codigo}</Text>
        <Text style={styles.subtitle}>Marca: {item.marca}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      {/* Barra de pesquisa + menu */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por nome ou código"
          value={search}
          onChangeText={setSearch}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <Ionicons name="filter" size={28} color="#4CAF50" />
            </TouchableOpacity>
          }
        >
          <Menu.Item leadingIcon="tag" onPress={() => {
            const marcas = Array.from(new Set(pecas.map(p => p.marca)));
            setFilterOptions(marcas);
            setFilterType('marca');
            setMenuVisible(false);
            setFilterModalVisible(true);
          }} title="Marca" />
          <Menu.Item leadingIcon="shape" onPress={() => {
            const modelos = Array.from(new Set(pecas.map(p => p.modelo)));
            setFilterOptions(modelos);
            setFilterType('modelo');
            setMenuVisible(false);
            setFilterModalVisible(true);
          }} title="Modelo" />
          <Divider />
          <Menu.Item leadingIcon="close" onPress={() => {
            setFilter('');
            setMenuVisible(false);
          }} title="Limpar filtro" />
        </Menu>
      </View>

      <FlatList
        data={filteredPecas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Modal para lista dinâmica */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.filterMenu}>
            <Text style={styles.filterTitle}>Selecione {filterType}:</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {filterOptions.map((option, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  style={{ marginVertical: 5 }}
                  onPress={() => {
                    setFilter(option);
                    setFilterModalVisible(false);
                  }}
                >
                  {option}
                </Button>
              ))}
            </ScrollView>
            <Button mode="contained" style={{ marginTop: 10 }} onPress={() => setFilterModalVisible(false)}>Fechar</Button>
          </View>
        </View>
      </Modal>

      {/* Modal para detalhes */}
      <Modal visible={!!selectedPeca} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          {selectedPeca && (
            <>
              <Image source={{ uri: form.imagem?.startsWith('http') ? form.imagem : `${API_URL}${form.imagem}` }} style={styles.modalImage} />
              {editMode ? (
                <>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput style={styles.input} value={form.nome} onChangeText={(text) => handleChange('nome', text)} />

                  <Text style={styles.label}>Marca</Text>
                  <TextInput style={styles.input} value={form.marca} onChangeText={(text) => handleChange('marca', text)} />

                  <Text style={styles.label}>Modelo</Text>
                  <TextInput style={styles.input} value={form.modelo} onChangeText={(text) => handleChange('modelo', text)} />

                  <Text style={styles.label}>Código</Text>
                  <TextInput style={styles.input} value={form.codigo} onChangeText={(text) => handleChange('codigo', text)} />

                  <Text style={styles.label}>Quantidade</Text>
                  <TextInput style={styles.input} value={form.quantidade?.toString()} keyboardType="numeric" onChangeText={(text) => handleChange('quantidade', text)} />

                  <Text style={styles.label}>Estoque Mínimo</Text>
                  <TextInput style={styles.input} value={form.estoqueMin?.toString()} keyboardType="numeric" onChangeText={(text) => handleChange('estoqueMin', text)} />

                  <Text style={styles.label}>Estoque Máximo</Text>
                  <TextInput style={styles.input} value={form.estoqueMax?.toString()} keyboardType="numeric" onChangeText={(text) => handleChange('estoqueMax', text)} />

                  <Text style={styles.label}>Imagem</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%' }}>
                    <Button mode="outlined" icon="camera" onPress={handleTakePhoto}>
                      Tirar Foto
                    </Button>
                    <Button mode="outlined" icon="image" onPress={handlePickImage}>
                      Escolher Foto
                    </Button>
                  </View>

                  <Button mode="contained" style={styles.button} onPress={salvarEdicao}>Salvar</Button>
                </>
              ) : (
                <>
                  <Text style={styles.title}>{selectedPeca.nome}</Text>
                  <Text>Código: {selectedPeca.codigo}</Text>
                  <Text>Marca: {selectedPeca.marca}</Text>
                  <Text>Modelo: {selectedPeca.modelo}</Text>
                  <Text>Quantidade: {selectedPeca.quantidade}</Text>
                  <Text>Estoque Min: {selectedPeca.estoqueMin}</Text>
                  <Text>Estoque Max: {selectedPeca.estoqueMax}</Text>
                  <Button mode="contained" style={styles.button} onPress={() => setEditMode(true)}>Editar</Button>
                  <Button mode="contained" style={[styles.button, { backgroundColor: '#D32F2F' }]} textColor="#fff" onPress={excluirPeca}>Excluir</Button>
                </>
              )}
              <Button mode="outlined" style={styles.button} onPress={() => setSelectedPeca(null)}>Fechar</Button>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10
  },
  searchInput: { flex: 1, padding: 10 },
  card: { flexDirection: 'row', padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  image: { width: 80, height: 80, marginRight: 10, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555' },
  modalContainer: { padding: 20, alignItems: 'center' },
  modalImage: { width: '100%', height: 200, marginBottom: 20, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5, width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, marginTop: 10 },
  button: { marginVertical: 8, width: '90%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterMenu: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: 300 },
  filterTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 }
});