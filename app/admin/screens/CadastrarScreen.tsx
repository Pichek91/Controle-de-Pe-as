import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
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
import { ENDPOINTS } from '../../../src/config'; // << ajuste o path se necessário

export default function CadastrarScreen() {
  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
    estoqueMin: '',
    estoqueMax: '',
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const pickImageFromGallery = async () => {
    // Permissão da galeria (Android 13+ precisa)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'É necessário permitir acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85, // reduz tamanho para evitar limite no servidor
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85, // reduz tamanho para evitar limite no servidor
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const cadastrarPeca = async () => {
    // Validação de campos vazios
    for (const key in form) {
      if (!form[key as keyof typeof form]) {
        Alert.alert('Erro', `O campo ${key} não pode estar vazio.`);
        return;
      }
    }

    // Imagem obrigatória
    if (!imageUri) {
      Alert.alert('Erro', 'É necessário tirar uma foto ou selecionar da galeria.');
      return;
    }

    setLoading(true);

    try {
      // 1) Validar duplicidade (GET)
      const response = await axios.get(ENDPOINTS.pecas, { timeout: 15000 });

      if (!response.data || !Array.isArray(response.data)) {
        setLoading(false);
        Alert.alert('Erro', 'Não foi possível validar duplicidade. Tente novamente.');
        return;
      }

      const existe = response.data.some(
        (p: any) => p?.nome === form.nome || p?.codigo === form.codigo
      );

      if (existe) {
        setLoading(false);
        Alert.alert('Erro', 'Peça já cadastrada com este nome ou código.');
        return;
      }

      // 2) Preparar dados para envio (multipart/form-data)
      const data = new FormData();
      Object.keys(form).forEach((key) => {
        data.append(key, form[key as keyof typeof form]);
      });

      // Forçar JPEG com extensão .jpg (muitos servidores dependem disso)
      const filename = `imagem_${Date.now()}.jpg`;
      data.append('imagem', {
        uri: imageUri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      // 3) POST cadastro
      await axios.post(ENDPOINTS.pecas, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      setLoading(false);
      Alert.alert('Sucesso', 'Peça cadastrada com sucesso!');
      setForm({
        nome: '',
        marca: '',
        modelo: '',
        codigo: '',
        quantidade: '',
        estoqueMin: '',
        estoqueMax: '',
      });
      setImageUri(null);
    } catch (err: any) {
      setLoading(false);

      // Log detalhado para diagnóstico
      console.log('ERRO CADASTRAR PEÇA =>', {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
      });

      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Falha na conexão ou no cadastro. Verifique sua internet e tente novamente.';
      Alert.alert('Erro', msg);
    }
  };

  // Map para labels amigáveis e teclados corretos
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
      <Text style={styles.title}>Cadastrar Peça</Text>

      {Object.keys(form).map((key) => {
        const isNumeric = numericKeys.includes(key);
        return (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={labels[key] || key}
            value={form[key as keyof typeof form]}
            onChangeText={(text) => handleChange(key, text)}
            // 🔹 Cores e UX
            placeholderTextColor="#7A7F85"         // cor do placeholder (tema claro)
            selectionColor="#6200EE"                // combina com seu indicador de loading
            cursorColor="#6200EE"
            underlineColorAndroid="transparent"
            autoCapitalize={isNumeric ? 'none' : 'words'}
            autoCorrect={false}
            // Teclado apropriado
            keyboardType={isNumeric ? 'numeric' : 'default'}
            inputMode={isNumeric ? 'numeric' : 'text'}
          />
        );
      })}

      {/* Ícone da câmera e botão da galeria lado a lado */}
      <View style={styles.imageRow}>
        <TouchableOpacity onPress={pickImageFromCamera}>
          <Ionicons name="camera" size={50} color="#6200EE" />
        </TouchableOpacity>
        <Button title="Selecionar da Galeria" onPress={pickImageFromGallery} />
      </View>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      {/* Ícone de carregamento */}
      {loading && (
        <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 10 }} />
      )}

      {/* Botão salvar escondido enquanto carrega */}
      {!loading && (
        <View style={{ marginTop: 20, width: '100%' }}>
          <Button title="Salvar" onPress={cadastrarPeca} />
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
    borderColor: '#DADCE0',       // borda mais suave
    paddingHorizontal: 12,
    borderRadius: 10,             // cantos mais modernos
    marginBottom: 10,
    backgroundColor: '#F8FAFC',   // fundo leve para destacar o campo
    color: '#1F2937',             // texto digitado com ótimo contraste
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
