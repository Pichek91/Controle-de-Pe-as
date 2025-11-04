// app/tecnico/cadastrar.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../../../firebaseConfig';
import { criarItemCarro, enviarImagemItemCarro } from '../../../src/services/estoqueCarro';

export default function CadastrarPecaTecnico() {
  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
    estoqueMin: '',
    estoqueMax: '',
  });

  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  async function salvar() {
    const ownerUid = auth.currentUser?.uid ?? '';
    const ownerEmail = auth.currentUser?.email ?? undefined;

    if (!ownerUid) {
      Alert.alert('Atenção', 'Usuário não autenticado.');
      return;
    }
    // mínimos obrigatórios para o back do carro
    if (!form.nome.trim() || !form.codigo.trim()) {
      Alert.alert('Atenção', 'Informe pelo menos Nome e Código.');
      return;
    }
    if (!fotoUri) {
      Alert.alert('Atenção', 'Tire ou selecione uma foto antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      // 1) cria o item via JSON (POST /estoque-carro)
      const cria = await criarItemCarro({
        ownerUid,
        ownerEmail,
        nome: form.nome.trim(),
        marca: form.marca.trim() || undefined,
        modelo: form.modelo.trim() || undefined,
        codigo: form.codigo.trim(),
        quantidade: Number(form.quantidade) || 0,
        estoqueMin: Number(form.estoqueMin) || 0,
        estoqueMax: Number(form.estoqueMax) || 0,
      });

      const id = cria?.data?.id;
      if (!id) throw new Error('Servidor não retornou ID do item.');

      // 2) envia a foto (PUT /estoque-carro/:id, multipart campo "imagem")
      await enviarImagemItemCarro(id, fotoUri);

      Alert.alert('Sucesso', 'Peça cadastrada no estoque do técnico!');
      // limpar formulário
      setForm({
        nome: '',
        marca: '',
        modelo: '',
        codigo: '',
        quantidade: '',
        estoqueMin: '',
        estoqueMax: '',
      });
      setFotoUri(null);
    } catch (err: any) {
      console.log('ERRO cadastrar técnico =>', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      const msg =
        err?.response?.data?.error ??
        err?.message ??
        'Falha ao cadastrar. Verifique sua conexão e tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  const labels: Record<string, string> = {
    nome: 'Nome da Peça',
    marca: 'Marca',
    modelo: 'Modelo',
    codigo: 'Código',
    quantidade: 'Quantidade',
    estoqueMin: 'Estoque Mínimo',
    estoqueMax: 'Estoque Máximo',
  };
  const numericKeys = ['quantidade', 'estoqueMin', 'estoqueMax'];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastrar Peça do Técnico</Text>

      {Object.keys(form).map((key) => {
        const isNumeric = numericKeys.includes(key);
        return (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={labels[key] || key}
            placeholderTextColor="#7A7F85"
            value={(form as any)[key]}
            onChangeText={(text) => handleChange(key, text)}
            keyboardType={isNumeric ? 'numeric' : 'default'}
            inputMode={isNumeric ? 'numeric' : 'text'}
            autoCapitalize={isNumeric ? 'none' : 'words'}
            autoCorrect={false}
          />
        );
      })}

      <View style={styles.imageRow}>
        <TouchableOpacity onPress={pickFromCamera}>
          <Ionicons name="camera" size={50} color="#6200EE" />
        </TouchableOpacity>
        <Button title="Selecionar da Galeria" onPress={pickFromGallery} />
      </View>

      {fotoUri && <Image source={{ uri: fotoUri }} style={styles.image} />}

      {loading ? (
        <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 10 }} />
      ) : (
        <View style={{ marginTop: 20, width: '100%' }}>
          <Button title="Salvar" onPress={salvar} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#DADCE0',
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    color: '#1F2937',
    fontSize: 16,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 15,
    width: '100%',
  },
  image: { width: 200, height: 200, marginVertical: 10, borderRadius: 10 },
});