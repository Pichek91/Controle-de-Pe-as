import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_KEY, API_URL } from '../../../src/modules/config/api';

export default function LocalizadorScreen() {
  const [busca, setBusca] = useState('');
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [permission, requestPermission] = useCameraPermissions();

  async function buscar(valor: string) {
    if (!valor) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/maquinas`, {
        headers: { "x-api-key": API_KEY }
      });

      const data = await res.json();

      const filtradas = data.filter((m: any) =>
        (m.localizador || '')
          .toLowerCase()
          .includes(valor.toLowerCase())
      );

      setMaquinas(filtradas);
    } catch (err) {
      console.log('Erro ao buscar:', err);
    }

    setLoading(false);
  }

  function handleQRCodeScanned(event: any) {
    const texto = event.data;
    setScannerVisible(false);
    setBusca(texto);
    buscar(texto);
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Permita a câmera para ler QR Code</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Localizador</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite o local"
        value={busca}
        onChangeText={setBusca}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => buscar(busca)}
      >
        <Text style={styles.buttonText}>Buscar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => setScannerVisible(true)}
      >
        <Ionicons name="qr-code-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}> Ler QR Code</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      <Text style={styles.resultado}>
        Encontradas: {maquinas.length} máquinas
      </Text>

      <FlatList
        data={maquinas}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => buscar(busca)}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelected(item)}
          >
            <Text style={styles.nome}>{item.nome || item.modelo}</Text>
            <Text>Local: {item.localizador}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal detalhes */}
      <Modal visible={!!selected} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>
            {selected?.nome || selected?.modelo}
          </Text>

          {selected?.foto && (
            <Image
              source={{ uri: selected.foto }}
              style={styles.image}
              resizeMode="contain"
            />
          )}

          <View style={styles.infoBox}>
            <Text>ID: {selected?.id}</Text>
            <Text>Modelo: {selected?.modelo}</Text>
            <Text>Localizador: {selected?.localizador}</Text>
            <Text>Status: {selected?.status}</Text>
            <Text>Tipo: {selected?.tipo}</Text>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.buttonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelected(null)}
          >
            <Text style={styles.buttonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scanner */}
      <Modal visible={scannerVisible} animationType="slide">
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleQRCodeScanned}
        />

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setScannerVisible(false)}
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },

  qrButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 15,
  },

  resultado: {
    fontWeight: '600',
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  nome: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  modal: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  image: {
    width: '100%',
    height: 220,
    marginBottom: 20,
    borderRadius: 10,
  },

  infoBox: {
    gap: 8,
    marginBottom: 20,
  },

  editButton: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },

  closeButton: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
