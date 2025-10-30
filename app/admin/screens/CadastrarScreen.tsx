import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function CadastrarScreen() {
  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
    estoqueMin: '',
    estoqueMax: ''
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1
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
      quality: 1
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

    // Validação de imagem obrigatória
    if (!imageUri) {
      Alert.alert('Erro', 'É necessário tirar uma foto ou selecionar da galeria.');
      return;
    }

    setLoading(true);

    try {
      // Timeout para evitar travamento
      const response = await axios.get('http://72.61.34.202:3000/pecas', { timeout: 5000 });

      if (!response.data || !Array.isArray(response.data)) {
        setLoading(false);
        Alert.alert('Erro', 'Não foi possível validar duplicidade. Tente novamente.');
        return;
      }

      const existe = response.data.some(
        (p: any) => p.nome === form.nome || p.codigo === form.codigo
      );

      if (existe) {
        setLoading(false);
        Alert.alert('Erro', 'Peça já cadastrada com este nome ou código.');
        return;
      }

      // Preparar dados para envio
      const data = new FormData();
      Object.keys(form).forEach((key) => {
        data.append(key, form[key as keyof typeof form]);
      });

      const filename = imageUri.split('/').pop() || 'imagem.jpg';
      const type = `image/${filename.split('.').pop()}`;
      data.append('imagem', { uri: imageUri, name: filename, type } as any);

      await axios.post('http://72.61.34.202:3000/pecas', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000
      });

      setLoading(false);
      Alert.alert('Sucesso', 'Peça cadastrada com sucesso!');
      setForm({ nome: '', marca: '', modelo: '', codigo: '', quantidade: '', estoqueMin: '', estoqueMax: '' });
      setImageUri(null);
    } catch (error) {
      setLoading(false);
      Alert.alert('Erro', 'Falha na conexão ou no cadastro. Verifique sua rede.');
      console.error(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastrar Peça</Text>
      {Object.keys(form).map((key) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={key}
          value={form[key as keyof typeof form]}
          onChangeText={(text) => handleChange(key, text)}
        />
      ))}

      {/* Ícone da câmera e botão da galeria lado a lado */}
      <View style={styles.imageRow}>
        <TouchableOpacity onPress={pickImageFromCamera}>
          <Ionicons name="camera" size={50} color="#6200EE" />
        </TouchableOpacity>
        <Button title="Selecionar da Galeria" onPress={pickImageFromGallery} />
      </View>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      {/* Ícone de carregamento */}
      {loading && <ActivityIndicator size="large" color="#6200EE" style={{ marginVertical: 10 }} />}

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
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  imageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 15, width: '100%' },
  image: { width: 200, height: 200, marginVertical: 10, borderRadius: 10 }
});