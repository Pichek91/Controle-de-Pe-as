import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
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

type Estante = 'A' | 'B' | null;

export default function LocalizadorScreen() {
  const [busca, setBusca] = useState('');
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selected, setSelected] = useState<Maquina | null>(null);

  // Edição do localizador
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [emEstante, setEmEstante] = useState<boolean>(true);
  const [estante, setEstante] = useState<Estante>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [localLivre, setLocalLivre] = useState('');

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

  function abrirEdicao(m: Maquina) {
    const atual = String(m.localizador || '').trim();

    // Padrão do site: EA-A2-P4 / EB-A3-P14
    const match = atual.match(/^E([AB])-A([1-3])-P(1[0-4]|[1-9])$/i);

    if (match) {
      setEmEstante(true);
      setEstante(match[1].toUpperCase() as Estante);
      setAltura(Number(match[2]));
      setPosicao(Number(match[3]));
      setLocalLivre('');
    } else {
      setEmEstante(false);
      setEstante(null);
      setAltura(null);
      setPosicao(null);
      setLocalLivre(atual);
    }

    setEditando(true);
  }

  function montarLocalizador() {
    if (!emEstante) {
      return localLivre.trim();
    }

    if (!estante || !altura || !posicao) {
      return '';
    }

    return `E${estante}-A${altura}-P${posicao}`;
  }

  async function salvarLocalizador() {
    if (!selected) return;

    const novoLocalizador = montarLocalizador();

    if (!novoLocalizador) {
      Alert.alert(
        'Localizador incompleto',
        emEstante
          ? 'Selecione a estante, a altura e a posição.'
          : 'Digite o local onde a máquina está.'
      );
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch(`${API_URL}/maquinas/${selected.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          localizador: novoLocalizador,
        }),
      });

      if (!res.ok) {
        let detalhe = '';
        try {
          detalhe = await res.text();
        } catch {}

        throw new Error(
          `Erro ${res.status}${detalhe ? ` - ${detalhe}` : ''}`
        );
      }

      const maquinaAtualizada = {
        ...selected,
        localizador: novoLocalizador,
      };

      setSelected(maquinaAtualizada);

      setMaquinas((lista) =>
        lista.map((m) =>
          String(m.id) === String(selected.id)
            ? { ...m, localizador: novoLocalizador }
            : m
        )
      );

      setEditando(false);

      Alert.alert(
        'Localizador atualizado',
        `Novo local: ${novoLocalizador}`
      );
    } catch (err: any) {
      console.log('Erro ao atualizar localizador:', err);

      Alert.alert(
        'Erro ao salvar',
        err?.message || 'Não foi possível atualizar o localizador.'
      );
    } finally {
      setSalvando(false);
    }
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
    } finally {
      setLoading(false);
    }
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
        renderItem={({ item }) => {
          const patrimonio = getPatrimonio(item);
          const vinculo = getVinculoStatus(item);
          const isVinculada = vinculo === 'VINCULADA';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelected(item)}
            >
              <View
                style={[
                  styles.indicador,
                  isVinculada
                    ? styles.indicadorVermelho
                    : styles.indicadorVerde,
                ]}
              />

              <View style={styles.cardHeader}>
                <Text style={styles.nome}>
                  {item.nome || item.modelo}
                </Text>
              </View>

              <Text>Local: {item.localizador || '-'}</Text>
              <Text>
                Patrimônio: {patrimonio ? String(patrimonio) : '-'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detalhes da máquina */}
      <Modal
        visible={!!selected && !editando}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <ScrollView contentContainerStyle={styles.modal}>
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
            <Text>Modelo: {selected?.modelo || '-'}</Text>
            <Text>
              Localizador: {selected?.localizador || '-'}
            </Text>
            <Text>Status: {selected?.status || '-'}</Text>
            <Text>Tipo: {selected?.tipo || '-'}</Text>
            <Text>
              Patrimônio:{' '}
              {selected
                ? String(getPatrimonio(selected) || '-')
                : '-'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => selected && abrirEdicao(selected)}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color="#fff"
            />
            <Text style={styles.buttonText}>
              {' '}Alterar localizador
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelected(null)}
          >
            <Text style={styles.buttonText}>Fechar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Edição do localizador */}
      <Modal
        visible={!!selected && editando}
        animationType="slide"
        onRequestClose={() => setEditando(false)}
      >
        <ScrollView contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>
            Alterar localizador
          </Text>

          <View style={styles.maquinaResumo}>
            <Text style={styles.nome}>
              {selected?.nome || selected?.modelo}
            </Text>
            <Text>
              Patrimônio:{' '}
              {selected
                ? String(getPatrimonio(selected) || '-')
                : '-'}
            </Text>
            <Text>
              Local atual: {selected?.localizador || '-'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            A máquina está em uma estante?
          </Text>

          <View style={styles.optionRow}>
            <OptionButton
              label="SIM"
              selected={emEstante}
              onPress={() => {
                setEmEstante(true);
                setLocalLivre('');
              }}
            />

            <OptionButton
              label="NÃO"
              selected={!emEstante}
              onPress={() => {
                setEmEstante(false);
                setEstante(null);
                setAltura(null);
                setPosicao(null);
              }}
            />
          </View>

          {emEstante ? (
            <>
              <Text style={styles.sectionTitle}>Estante</Text>

              <View style={styles.optionRow}>
                {(['A', 'B'] as const).map((item) => (
                  <OptionButton
                    key={item}
                    label={`Estante ${item}`}
                    selected={estante === item}
                    onPress={() => setEstante(item)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Altura</Text>

              <View style={styles.optionRow}>
                {[1, 2, 3].map((item) => (
                  <OptionButton
                    key={item}
                    label={`A${item}`}
                    selected={altura === item}
                    onPress={() => setAltura(item)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Posição</Text>

              <View style={styles.positionsGrid}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map(
                  (item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.positionButton,
                        posicao === item &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => setPosicao(item)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          posicao === item &&
                            styles.optionTextSelected,
                        ]}
                      >
                        P{item}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>
                  Novo localizador
                </Text>
                <Text style={styles.previewValue}>
                  {montarLocalizador() || 'Selecione todas as opções'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Local</Text>

              <TextInput
                style={styles.input}
                placeholder="Ex.: Bancada, Oficina, Corredor..."
                value={localLivre}
                onChangeText={setLocalLivre}
              />

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>
                  Novo localizador
                </Text>
                <Text style={styles.previewValue}>
                  {localLivre.trim() || '-'}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              salvando && styles.buttonDisabled,
            ]}
            disabled={salvando}
            onPress={salvarLocalizador}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {' '}Salvar localizador
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            disabled={salvando}
            onPress={() => setEditando(false)}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Scanner */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
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

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,
          selected && styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    position: 'relative',
    overflow: 'hidden',
  },

  nome: {
    fontWeight: 'bold',
    fontSize: 16,
  },

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
    width: 8,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },

  indicadorVermelho: {
    backgroundColor: '#ef4444',
  },

  indicadorVerde: {
    backgroundColor: '#10B981',
  },

  modal: {
    flexGrow: 1,
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

  maquinaResumo: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    gap: 5,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },

  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },

  optionButton: {
    flexGrow: 1,
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },

  optionButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  optionText: {
    color: '#111827',
    fontWeight: '600',
  },

  optionTextSelected: {
    color: '#fff',
  },

  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },

  positionButton: {
    width: '22%',
    minWidth: 65,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },

  previewBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 20,
  },

  previewLabel: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  previewValue: {
    color: '#1e3a8a',
    fontSize: 22,
    fontWeight: '800',
  },

  editButton: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  saveButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  cancelButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },

  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
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