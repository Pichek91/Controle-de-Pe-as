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

type Maquina = {
  id: number | string;
  nome?: string;
  modelo?: string;
  foto?: string;
  localizador?: string;
  status?: string;
  tipo?: string;
  patrimonio?: string | number;
  numero_patrimonio?: string | number;
  numPatrimonio?: string | number;
  assetNumber?: string | number;
  patrimonioNumero?: string | number;
  vinculada?: boolean | string | number;
  vinculoStatus?: string;
  situacao?: string;
};

export default function LocalizadorScreen() {
  const [busca, setBusca] = useState('');
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selected, setSelected] = useState<Maquina | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  function getPatrimonio(m: Partial<Maquina>) {
    return (
      m.patrimonio ??
      m.numero_patrimonio ??
      m.numPatrimonio ??
      m.assetNumber ??
      m.patrimonioNumero ??
      ''
    );
  }

  function norm(v: any) {
    return String(v ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  function getVinculoStatus(m: any): 'VINCULADA' | 'LIVRE' {
    if (typeof m?.vinculada === 'boolean') {
      return m.vinculada ? 'VINCULADA' : 'LIVRE';
    }

    if (m?.vinculada !== undefined && m?.vinculada !== null) {
      const v = norm(m.vinculada);
      if (['true', '1', 'sim'].includes(v)) return 'VINCULADA';
      if (['false', '0', 'nao', 'não'].includes(v)) return 'LIVRE';
    }

    const candidatos = [
      m?.vinculoStatus,
      m?.status,
      m?.situacao,
    ]
      .map(norm)
      .filter(Boolean)
      .join(' | ');

    const sinaisVinculada = ['vincul', 'ocupad', 'alocad', 'em uso', 'instalad', 'em cliente'];
    for (const s of sinaisVinculada) {
      if (candidatos.includes(s)) return 'VINCULADA';
    }

    const sinaisLivre = ['livre', 'disponivel', 'disponível', 'estoque', 'parada'];
    for (const s of sinaisLivre) {
      if (candidatos.includes(norm(s))) return 'LIVRE';
    }

    return 'LIVRE';
  }

  async function buscar(valor: string) {
    if (!valor) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/maquinas`, {
        headers: { 'x-api-key': API_KEY },
      });

      const data: Maquina[] = await res.json();

      const v = valor.toLowerCase();

      const filtradas = data.filter((m) => {
        const local = (m.localizador || '').toLowerCase();
        const modelo = (m.modelo || '').toLowerCase();
        const nome = (m.nome || '').toLowerCase();
        const patrimonio = String(getPatrimonio(m) || '').toLowerCase();
        const vinculo = getVinculoStatus(m).toLowerCase();

        return (
          local.includes(v) ||
          modelo.includes(v) ||
          nome.includes(v) ||
          patrimonio.includes(v) ||
          vinculo.includes(v)
        );
      });

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
        placeholder="Digite o local, modelo, status ou patrimônio"
        value={busca}
        onChangeText={setBusca}
        returnKeyType="search"
        onSubmitEditing={() => buscar(busca)}
      />

      <TouchableOpacity style={styles.button} onPress={() => buscar(busca)}>
        <Text style={styles.buttonText}>Buscar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.qrButton} onPress={() => setScannerVisible(true)}>
        <Ionicons name="qr-code-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}> Ler QR Code</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" />}

      <Text style={styles.resultado}>Encontradas: {maquinas.length} máquinas</Text>

      <FlatList
        data={maquinas}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => buscar(busca)} />
        }
        renderItem={({ item }) => {
          const patrimonio = getPatrimonio(item);
          const vinculo = getVinculoStatus(item);
          const isVinculada = vinculo === 'VINCULADA';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelected(item)}
            >
              {/* Faixa lateral — agora o DOBRO do tamanho */}
              <View
                style={[
                  styles.indicador,
                  isVinculada ? styles.indicadorVermelho : styles.indicadorVerde,
                ]}
              />

              <View style={styles.cardHeader}>
                <Text style={styles.nome}>{item.nome || item.modelo}</Text>
              </View>

              <Text>Local: {item.localizador || '-'}</Text>
              <Text>Patrimônio: {patrimonio ? String(patrimonio) : '-'}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
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
            <Text>Patrimônio: {selected ? String(getPatrimonio(selected) || '-') : '-'}</Text>
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
      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
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
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
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
  resultado: { fontWeight: '600', marginBottom: 10 },

  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },

  nome: { fontWeight: 'bold', fontSize: 16 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  indicador: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 8, // AQUI → dobro do tamanho anterior (4 → 8)
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  indicadorVermelho: {
    backgroundColor: '#ef4444',
  },
  indicadorVerde: {
    backgroundColor: '#10B981',
  },

  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  image: { width: '100%', height: 220, marginBottom: 20, borderRadius: 10 },
  infoBox: { gap: 8, marginBottom: 20 },
  editButton: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  closeButton: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});