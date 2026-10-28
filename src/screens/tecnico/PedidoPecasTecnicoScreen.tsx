import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../../config';

type StatusPedido =
  | 'pendente'
  | 'em_analise'
  | 'compra'
  | 'matriz'
  | 'retirada_maquina'
  | 'aguardando_fornecedor'
  | 'disponivel'
  | 'cancelado';

type Pedido = {
  id: number;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  codigo?: string | null;
  quantidade: number;
  status: StatusPedido;
  foto?: string | null;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
};

const STATUS_INFO: Record<
  StatusPedido,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    background: string;
    color: string;
  }
> = {
  pendente: {
    label: 'Aguardando análise',
    icon: 'time-outline',
    background: '#fff3cd',
    color: '#856404',
  },

  em_analise: {
    label: 'Em análise',
    icon: 'search-outline',
    background: '#e8f2ff',
    color: '#2469a8',
  },

  compra: {
    label: 'Em compra',
    icon: 'cart-outline',
    background: '#e8f2ff',
    color: '#2469a8',
  },

  matriz: {
    label: 'Solicitado à matriz',
    icon: 'business-outline',
    background: '#f0eaff',
    color: '#6545a5',
  },

  retirada_maquina: {
    label: 'Retirada de máquina',
    icon: 'construct-outline',
    background: '#f3ecff',
    color: '#6843a5',
  },

  aguardando_fornecedor: {
    label: 'Aguardando fornecedor',
    icon: 'hourglass-outline',
    background: '#fff0df',
    color: '#a65c00',
  },

  disponivel: {
    label: 'Disponível para retirada',
    icon: 'checkmark-circle-outline',
    background: '#dff5e8',
    color: '#177245',
  },

  cancelado: {
    label: 'Cancelado',
    icon: 'close-circle-outline',
    background: '#fde8e8',
    color: '#b42318',
  },
};

export default function PedidoPecasTecnicoScreen() {
  const [linkDrive, setLinkDrive] = useState('');
  const [lista, setLista] = useState<Pedido[]>([]);

  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [selecionandoFoto, setSelecionandoFoto] =
    useState(false);

  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
  });

  const [foto, setFoto] = useState<string | null>(null);

  const user = getAuth().currentUser;

  /* =====================================================
     FOTO DO PEDIDO
  ===================================================== */

  const getFotoUrl = (fotoPedido?: string | null) => {
    if (!fotoPedido) return null;

    if (
      fotoPedido.startsWith('http://') ||
      fotoPedido.startsWith('https://')
    ) {
      return fotoPedido;
    }

    return `${API_BASE}${fotoPedido}`;
  };

  /* =====================================================
     CARREGAR PEDIDOS E LINK
  ===================================================== */

  const fetchData = useCallback(async () => {
    const currentUser = getAuth().currentUser;

    if (!currentUser?.uid) {
      setLista([]);
      return;
    }

    setLoading(true);

    try {
      const [pedidosResponse, linkResponse] =
        await Promise.all([
          axios.get(
            `${API_BASE}/pedidos/${currentUser.uid}`
          ),

          axios.get(`${API_BASE}/link-vistas`),
        ]);

      // Pedidos disponíveis passam para o fluxo de Retiradas.
      // Mantemos os registros no servidor; apenas ocultamos nesta tela.
      setLista(
        (Array.isArray(pedidosResponse.data)
          ? pedidosResponse.data
          : []
        ).filter((pedido: Pedido) => pedido.status !== 'disponivel')
      );

      setLinkDrive(
        linkResponse.data?.link || ''
      );
    } catch (e: any) {
      console.log('[PEDIDOS] Erro ao carregar:', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /* =====================================================
     ABRIR VISTAS EXPLODIDAS
  ===================================================== */

  const abrirVistas = async () => {
    if (!linkDrive.trim()) {
      Alert.alert(
        'Link indisponível',
        'O administrador ainda não cadastrou o link das vistas explodidas.'
      );

      return;
    }

    try {
      const podeAbrir =
        await Linking.canOpenURL(linkDrive);

      if (!podeAbrir) {
        Alert.alert(
          'Link inválido',
          'Não foi possível abrir o endereço cadastrado.'
        );

        return;
      }

      await Linking.openURL(linkDrive);
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível abrir as vistas explodidas.'
      );
    }
  };

  /* =====================================================
     ESCOLHER FOTO
  ===================================================== */

  const abrirGaleria = async () => {
    try {
      setSelecionandoFoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso às fotos para anexar uma imagem da peça.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setFoto(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[PEDIDOS] Erro ao selecionar foto:', e);
      Alert.alert('Erro', 'Não foi possível selecionar a foto.');
    } finally {
      setSelecionandoFoto(false);
    }
  };

  const abrirCamera = async () => {
    try {
      setSelecionandoFoto(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera para fotografar a peça.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setFoto(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[PEDIDOS] Erro ao tirar foto:', e);
      Alert.alert('Erro', 'Não foi possível utilizar a câmera.');
    } finally {
      setSelecionandoFoto(false);
    }
  };

  const escolherFoto = () => {
    if (selecionandoFoto) return;
    Alert.alert('Adicionar foto', 'Escolha a origem da imagem:', [
      { text: 'Câmera', onPress: abrirCamera },
      { text: 'Galeria', onPress: abrirGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /* =====================================================
     ENVIAR PEDIDO
  ===================================================== */

  const enviarPedido = async () => {
    const currentUser = getAuth().currentUser;

    const nome = form.nome.trim();
    const marca = form.marca.trim();
    const modelo = form.modelo.trim();
    const codigo = form.codigo.trim();

    const quantidade = Number(
      form.quantidade
    );

    if (!currentUser?.uid) {
      Alert.alert(
        'Erro',
        'Não foi possível identificar o técnico.'
      );

      return;
    }

    if (!nome) {
      Alert.alert(
        'Nome da peça',
        'Informe o nome da peça.'
      );

      return;
    }

    if (!marca) {
      Alert.alert('Marca obrigatória', 'Informe a marca da máquina ou peça.');
      return;
    }

    if (!modelo) {
      Alert.alert('Modelo obrigatório', 'Informe o modelo da máquina.');
      return;
    }

    if (!codigo) {
      Alert.alert('Código obrigatório', 'Informe o código da peça conforme o manual.');
      return;
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0
    ) {
      Alert.alert(
        'Quantidade inválida',
        'Informe uma quantidade válida.'
      );

      return;
    }

    try {
      setEnviando(true);

      const body = new FormData();

      body.append('nome', nome);
      body.append('marca', marca);
      body.append('modelo', modelo);
      body.append('codigo', codigo);

      body.append(
        'quantidade',
        String(quantidade)
      );

      body.append(
        'tecnicoUid',
        currentUser.uid
      );

      body.append(
        'tecnicoEmail',
        currentUser.email || ''
      );

      if (foto) {
        const extensao =
          foto.split('.').pop()?.toLowerCase() ||
          'jpg';

        const mimeType =
          extensao === 'png'
            ? 'image/png'
            : 'image/jpeg';

        body.append(
          'foto',
          {
            uri: foto,
            name: `pedido-${Date.now()}.${extensao}`,
            type: mimeType,
          } as any
        );
      }

      await axios.post(
        `${API_BASE}/pedidos`,
        body,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      setForm({
        nome: '',
        marca: '',
        modelo: '',
        codigo: '',
        quantidade: '',
      });

      setFoto(null);

      await fetchData();

      Alert.alert(
        'Pedido enviado',
        'Sua solicitação foi enviada ao estoque.'
      );
    } catch (e: any) {
      console.log(
        '[PEDIDOS] Erro ao enviar:',
        {
          status: e?.response?.status,
          data: e?.response?.data,
          message: e?.message,
        }
      );

      Alert.alert(
        'Erro',
        e?.response?.data?.error ||
          'Não foi possível enviar o pedido.'
      );
    } finally {
      setEnviando(false);
    }
  };

  /* =====================================================
     CANCELAR PEDIDO
  ===================================================== */

  const cancelarPedido = (
    item: Pedido
  ) => {
    Alert.alert(
      'Cancelar pedido',
      `Deseja cancelar a solicitação de ${item.quantidade}x ${item.nome}?`,
      [
        {
          text: 'Não',
          style: 'cancel',
        },

        {
          text: 'Sim, cancelar',
          style: 'destructive',

          onPress: async () => {
            try {
              await axios.delete(
                `${API_BASE}/pedidos/${item.id}`
              );

              await fetchData();
            } catch (e: any) {
              console.log(
                '[PEDIDOS] Erro ao cancelar:',
                {
                  status:
                    e?.response?.status,
                  data: e?.response?.data,
                }
              );

              Alert.alert(
                'Erro',
                e?.response?.data?.error ||
                  'Não foi possível cancelar o pedido.'
              );
            }
          },
        },
      ]
    );
  };

  /* =====================================================
     RENDERIZAR PEDIDO
  ===================================================== */

  const renderPedido = ({
    item,
  }: {
    item: Pedido;
  }) => {
    const statusInfo =
      STATUS_INFO[item.status] ||
      STATUS_INFO.pendente;

    const fotoPedido =
      getFotoUrl(item.foto);

    const podeCancelar =
      item.status !== 'disponivel' &&
      item.status !== 'cancelado';

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nome}>
              {item.nome}
            </Text>

            <Text style={styles.sub}>
              Quantidade: {item.quantidade}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusInfo.background,
              },
            ]}
          >
            <Ionicons
              name={statusInfo.icon}
              size={15}
              color={statusInfo.color}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    statusInfo.color,
                },
              ]}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {fotoPedido && (
          <Image
            source={{ uri: fotoPedido }}
            style={styles.fotoPedido}
            resizeMode="cover"
          />
        )}

        {!!item.codigo && (
          <Text style={styles.sub}>
            Código: {item.codigo}
          </Text>
        )}

        {!!item.marca && (
          <Text style={styles.sub}>
            Marca: {item.marca}
          </Text>
        )}

        {!!item.modelo && (
          <Text style={styles.sub}>
            Modelo: {item.modelo}
          </Text>
        )}

        {!!item.observacao && (
          <View
            style={styles.observacaoBox}
          >
            <View
              style={
                styles.observacaoHeader
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={17}
                color="#2469a8"
              />

              <Text
                style={
                  styles.observacaoTitulo
                }
              >
                Atualização do estoque
              </Text>
            </View>

            <Text
              style={
                styles.observacaoTexto
              }
            >
              {item.observacao}
            </Text>
          </View>
        )}

        {item.status === 'disponivel' && (
          <View
            style={
              styles.retiradaBox
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#177245"
            />

            <Text
              style={
                styles.retiradaText
              }
            >
              Sua peça está pronta. Consulte
              a tela Retiradas.
            </Text>
          </View>
        )}

        {podeCancelar && (
          <TouchableOpacity
            style={styles.cancelarBtn}
            onPress={() =>
              cancelarPedido(item)
            }
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color="#c62828"
            />

            <Text
              style={
                styles.cancelarText
              }
            >
              Cancelar solicitação
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* =====================================================
     TELA
  ===================================================== */

  return (
    <SafeAreaView
      style={styles.container}
      edges={['left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <FlatList
          data={lista}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderPedido}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
            />
          }
          ListHeaderComponent={
            <>
              {/* VISTAS EXPLODIDAS */}

              <TouchableOpacity
                style={styles.linkBox}
                onPress={abrirVistas}
              >
                <View
                  style={
                    styles.linkIconBox
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={22}
                    color="#2469a8"
                  />
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.linkTitle
                    }
                  >
                    Vistas Explodidas
                  </Text>

                  <Text
                    style={
                      styles.linkSubtitle
                    }
                  >
                    Consulte códigos e
                    desenhos das peças
                  </Text>
                </View>

                <Ionicons
                  name="open-outline"
                  size={20}
                  color="#2469a8"
                />
              </TouchableOpacity>

              {/* FORMULÁRIO */}

              <View
                style={styles.formCard}
              >
                <Text
                  style={styles.title}
                >
                  Solicitar peça
                </Text>

                <Text
                  style={
                    styles.formDescription
                  }
                >
                  Use esta solicitação quando
                  a peça necessária não estiver
                  disponível no estoque.
                </Text>

<TextInput
  placeholder="Nome da peça *"
  placeholderTextColor="#777"
  style={styles.input}
  value={form.nome}
  onChangeText={(t) =>
    setForm({
      ...form,
      nome: t,
    })
  }
/>

                <View
                  style={styles.row}
                >
                  <TextInput
                    placeholder="Marca *"
                    placeholderTextColor="#777"
                    style={[
                      styles.input,
                      styles.flexInput,
                    ]}
                    value={form.marca}
                    onChangeText={(t) =>
                      setForm({
                        ...form,
                        marca: t,
                      })
                    }
                  />

                  <TextInput
                    placeholder="Modelo *"
                    placeholderTextColor="#777"
                    style={[
                      styles.input,
                      styles.flexInput,
                    ]}
                    value={form.modelo}
                    onChangeText={(t) =>
                      setForm({
                        ...form,
                        modelo: t,
                      })
                    }
                  />
                </View>

                <TextInput
                  placeholder="Código do manual *"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={form.codigo}
                  autoCapitalize="characters"
                  onChangeText={(t) =>
                    setForm({
                      ...form,
                      codigo: t,
                    })
                  }
                />

                <TextInput
                  placeholder="Quantidade *"
                  placeholderTextColor="#777"
                  keyboardType="number-pad"
                  style={styles.input}
                  value={form.quantidade}
                  onChangeText={(t) =>
                    setForm({
                      ...form,
                      quantidade:
                        t.replace(
                          /[^0-9]/g,
                          ''
                        ),
                    })
                  }
                />

                <TouchableOpacity
                  style={styles.fotoBtn}
                  onPress={escolherFoto}
                  disabled={
                    selecionandoFoto
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color="#555"
                  />

                  <Text
                    style={
                      styles.fotoBtnText
                    }
                  >
                    {foto
                      ? 'Trocar foto'
                      : 'Adicionar foto (opcional)'}
                  </Text>
                </TouchableOpacity>

                {foto && (
                  <View
                    style={
                      styles.previewContainer
                    }
                  >
                    <Image
                      source={{ uri: foto }}
                      style={
                        styles.previewFoto
                      }
                      resizeMode="cover"
                    />

                    <TouchableOpacity
                      style={
                        styles.removeFotoBtn
                      }
                      onPress={() =>
                        setFoto(null)
                      }
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.enviarBtn,
                    enviando &&
                      styles.disabledBtn,
                  ]}
                  onPress={enviarPedido}
                  disabled={enviando}
                >
                  {enviando ? (
                    <ActivityIndicator
                      color="#fff"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="send-outline"
                        size={19}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.enviarText
                        }
                      >
                        Enviar pedido
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* TÍTULO LISTA */}

              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={styles.section}
                >
                  Meus pedidos
                </Text>

                <View
                  style={
                    styles.totalBadge
                  }
                >
                  <Text
                    style={
                      styles.totalText
                    }
                  >
                    {lista.length}
                  </Text>
                </View>
              </View>
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons
                  name="file-tray-outline"
                  size={40}
                  color="#aaa"
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Nenhuma solicitação
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Seus pedidos de peças
                  aparecerão aqui.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading &&
            lista.length === 0 ? (
              <ActivityIndicator
                style={{ margin: 20 }}
              />
            ) : (
              <View
                style={{ height: 30 }}
              />
            )
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#eef6ff',
    borderRadius: 10,
    gap: 10,
  },

  linkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  linkTitle: {
    fontWeight: '700',
    color: '#2469a8',
  },

  linkSubtitle: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },

  formCard: {
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#eee',
  },

  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },

  formDescription: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 7,
  },

  flexInput: {
    flex: 1,
  },

input: {
  borderWidth: 1,
  borderColor: '#ccc',
  backgroundColor: '#fff',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 10,
  marginBottom: 7,

  color: '#111',
  fontSize: 15,
},

  fotoBtn: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  fotoBtnText: {
    color: '#555',
    fontWeight: '600',
  },

  previewContainer: {
    position: 'relative',
    marginTop: 8,
  },

  previewFoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },

  removeFotoBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  enviarBtn: {
    flexDirection: 'row',
    backgroundColor: '#2bb673',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },

  enviarText: {
    color: '#fff',
    fontWeight: '700',
  },

  disabledBtn: {
    opacity: 0.55,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 18,
    marginBottom: 2,
  },

  section: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
  },

  totalBadge: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalText: {
    fontSize: 12,
    fontWeight: '700',
  },

  item: {
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 8,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },

  nome: {
    fontWeight: '700',
    fontSize: 15,
  },

  sub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: 155,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },

  fotoPedido: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginBottom: 8,
  },

  observacaoBox: {
    backgroundColor: '#eef6ff',
    padding: 9,
    borderRadius: 8,
    marginTop: 9,
  },

  observacaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },

  observacaoTitulo: {
    color: '#2469a8',
    fontSize: 11,
    fontWeight: '700',
  },

  observacaoTexto: {
    color: '#555',
    fontSize: 12,
    lineHeight: 17,
  },

  retiradaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eefaf3',
    borderRadius: 8,
    padding: 9,
    gap: 6,
    marginTop: 9,
  },

  retiradaText: {
    flex: 1,
    color: '#177245',
    fontSize: 12,
    fontWeight: '600',
  },

  cancelarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    paddingVertical: 5,
  },

  cancelarText: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 35,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontWeight: '700',
    marginTop: 8,
  },

  emptyText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
  },
});