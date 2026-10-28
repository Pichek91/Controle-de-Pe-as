import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getAuth } from 'firebase/auth';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../../config';

/* =====================================================
   TIPOS
===================================================== */

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

  tecnicoUid: string;
  tecnicoEmail?: string | null;

  status: StatusPedido;

  foto?: string | null;
  observacao?: string | null;

  partId?: number | null;
  separationRequestId?: number | null;
  quantidadeRecebida?: number | null;

  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

const STATUS_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  compra: 'Em compra',
  matriz: 'Solicitado à matriz',
  retirada_maquina: 'Retirada de máquina',
  aguardando_fornecedor: 'Aguardando fornecedor',
  disponivel: 'Disponível para retirada',
  cancelado: 'Cancelado',
};

/* =====================================================
   TELA
===================================================== */

export default function SolicitacoesPecasScreen() {
  const [linkDrive, setLinkDrive] = useState('');
  const [lista, setLista] = useState<Pedido[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [loading, setLoading] = useState(false);
  const [salvandoLink, setSalvandoLink] = useState(false);

  /* ===================================================
     MODAL DE ANDAMENTO
  =================================================== */

  const [modalStatusVisible, setModalStatusVisible] =
    useState(false);

  const [pedidoStatus, setPedidoStatus] =
    useState<Pedido | null>(null);

  const [statusSelecionado, setStatusSelecionado] =
    useState<StatusPedido>('em_analise');

  const [observacao, setObservacao] = useState('');

  const [salvandoStatus, setSalvandoStatus] =
    useState(false);

  /* ===================================================
     MODAL DE RECEBIMENTO
  =================================================== */

  const [modalReceberVisible, setModalReceberVisible] =
    useState(false);

  const [pedidoReceber, setPedidoReceber] =
    useState<Pedido | null>(null);

  const [quantidadeRecebida, setQuantidadeRecebida] =
    useState('');

  /*
   * null  = ainda não escolheu
   * true  = com retorno
   * false = sem retorno
   */
  const [mustReturn, setMustReturn] =
    useState<boolean | null>(null);

  const [recebendo, setRecebendo] = useState(false);

  /* =====================================================
     BUSCAR PEDIDOS
  ===================================================== */

  const buscarPedidos = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/pedidos`
      );

      setLista(Array.isArray(data) ? data.filter((p: Pedido) => p.status !== 'disponivel' && p.status !== 'cancelado' && !p.completed_at) : []);
    } catch (e) {
      console.log('[PEDIDOS] Erro ao buscar:', e);

      Alert.alert(
        'Erro',
        'Não foi possível carregar os pedidos de peças.'
      );
    }
  }, []);

  /* =====================================================
     HISTÓRICO DOS ÚLTIMOS 30 DIAS
     A API deve disponibilizar /pedidos-historico.
  ===================================================== */

  const buscarHistorico = useCallback(async () => {
    setCarregandoHistorico(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error('Administrador não autenticado.');
      const { data } = await axios.get(`${API_BASE}/pedidos-historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistorico(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.log('[PEDIDOS] Erro ao carregar histórico:', e);
      Alert.alert('Histórico indisponível', e?.response?.data?.error || 'Verifique se a rota /pedidos-historico foi instalada na API.');
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  const alternarHistorico = async () => {
    if (historicoAberto) {
      setHistoricoAberto(false);
      return;
    }
    setHistoricoAberto(true);
    await buscarHistorico();
  };

  const exportarHistorico = async () => {
    if (!historico.length) {
      Alert.alert('Sem registros', 'Não há pedidos para exportar.');
      return;
    }
    try {
      setExportando(true);
      const colunas = ['ID', 'Peça', 'Marca', 'Modelo', 'Código', 'Quantidade', 'Técnico', 'Status', 'Observação', 'Criado em', 'Atualizado em', 'Concluído em'];
      const campo = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const linhas = historico.map(p => [p.id, p.nome, p.marca, p.modelo, p.codigo, p.quantidade, p.tecnicoEmail || p.tecnicoUid, STATUS_LABEL[p.status] || p.status, p.observacao, p.created_at, p.updated_at, p.completed_at].map(campo).join(';'));
      const csv = '\uFEFF' + [colunas.map(campo).join(';'), ...linhas].join('\r\n');
      const destino = `${FileSystem.cacheDirectory}pedidos-ultimos-30-dias-${new Date().toISOString().slice(0, 10)}.csv`;
      await FileSystem.writeAsStringAsync(destino, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhamento indisponível', 'Não foi possível abrir o compartilhamento neste dispositivo.');
        return;
      }
      await Sharing.shareAsync(destino, { mimeType: 'text/csv', dialogTitle: 'Exportar pedidos para Excel', UTI: 'public.comma-separated-values-text' });
    } catch (e) {
      console.log('[PEDIDOS] Erro ao exportar:', e);
      Alert.alert('Erro', 'Não foi possível gerar a planilha.');
    } finally {
      setExportando(false);
    }
  };

  /* =====================================================
     BUSCAR LINK
  ===================================================== */

  const buscarLink = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/link-vistas`
      );

      setLinkDrive(data?.link || '');
    } catch (e) {
      console.log(
        '[LINK VISTAS] Erro ao buscar:',
        e
      );
    }
  }, []);

  /* =====================================================
     CARREGAR TELA
  ===================================================== */

  const carregarTudo = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([
        buscarPedidos(),
        buscarLink(),
        ...(historicoAberto ? [buscarHistorico()] : []),
      ]);
    } finally {
      setLoading(false);
    }
  }, [buscarPedidos, buscarLink, buscarHistorico, historicoAberto]);

  useFocusEffect(
    useCallback(() => {
      carregarTudo();
    }, [carregarTudo])
  );

  /* =====================================================
     LINK DAS VISTAS
  ===================================================== */

  const salvarLink = async () => {
    try {
      setSalvandoLink(true);

      await axios.post(
        `${API_BASE}/link-vistas`,
        {
          link: linkDrive.trim(),
        }
      );

      Alert.alert(
        'Pronto',
        'Link das vistas explodidas salvo.'
      );
    } catch (e) {
      console.log(
        '[LINK VISTAS] Erro ao salvar:',
        e
      );

      Alert.alert(
        'Erro',
        'Não foi possível salvar o link.'
      );
    } finally {
      setSalvandoLink(false);
    }
  };

  const abrirDrive = async () => {
    const link = linkDrive.trim();

    if (!link) {
      Alert.alert(
        'Link não informado',
        'Cadastre primeiro o link das vistas explodidas.'
      );

      return;
    }

    try {
      const podeAbrir =
        await Linking.canOpenURL(link);

      if (!podeAbrir) {
        Alert.alert(
          'Link inválido',
          'O endereço informado não pôde ser aberto.'
        );

        return;
      }

      await Linking.openURL(link);
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível abrir o link informado.'
      );
    }
  };

  /* =====================================================
     FOTO
  ===================================================== */

  const getFotoUrl = (
    foto?: string | null
  ) => {
    if (!foto) return null;

    if (
      foto.startsWith('http://') ||
      foto.startsWith('https://')
    ) {
      return foto;
    }

    return `${API_BASE}${foto}`;
  };

  /* =====================================================
     MODAL DE ANDAMENTO
  ===================================================== */

  const abrirModalStatus = (item: Pedido) => {
    setPedidoStatus(item);

    if (
      item.status !== 'disponivel' &&
      item.status !== 'cancelado'
    ) {
      setStatusSelecionado(item.status);
    } else {
      setStatusSelecionado('em_analise');
    }

    setObservacao(item.observacao || '');
    setModalStatusVisible(true);
  };

  const fecharModalStatus = () => {
    if (salvandoStatus) return;

    setModalStatusVisible(false);
    setPedidoStatus(null);
    setObservacao('');
  };

  const salvarAndamento = async () => {
    if (!pedidoStatus) return;

    try {
      setSalvandoStatus(true);

      await axios.put(
        `${API_BASE}/pedidos/${pedidoStatus.id}/status`,
        {
          status: statusSelecionado,
          observacao:
            observacao.trim() || null,
        }
      );

      setModalStatusVisible(false);
      setPedidoStatus(null);
      setObservacao('');

      await buscarPedidos();
      if (historicoAberto) await buscarHistorico();

      Alert.alert(
        'Atualizado',
        'Andamento do pedido atualizado.'
      );
    } catch (e: any) {
      console.log(
        '[PEDIDOS] Erro ao atualizar andamento:',
        e
      );

      Alert.alert(
        'Erro',
        e?.response?.data?.error ||
          'Não foi possível atualizar o pedido.'
      );
    } finally {
      setSalvandoStatus(false);
    }
  };

  /* =====================================================
     MODAL RECEBER PEÇA
  ===================================================== */

  const abrirModalReceber = (item: Pedido) => {
    setPedidoReceber(item);

    // Já inicia com a quantidade solicitada.
    setQuantidadeRecebida(
      String(item.quantidade)
    );

    // Obriga o Admin a escolher em cada pedido.
    setMustReturn(null);

    setModalReceberVisible(true);
  };

  const fecharModalReceber = () => {
    if (recebendo) return;

    setModalReceberVisible(false);
    setPedidoReceber(null);
    setQuantidadeRecebida('');
    setMustReturn(null);
  };

  const qtdRecebidaNumero =
    Number(quantidadeRecebida) || 0;

  const quantidadeReservada =
    pedidoReceber?.quantidade || 0;

  const saldoEstoque = useMemo(() => {
    return Math.max(
      0,
      qtdRecebidaNumero -
        quantidadeReservada
    );
  }, [
    qtdRecebidaNumero,
    quantidadeReservada,
  ]);

  const quantidadeInsuficiente =
    !!pedidoReceber &&
    qtdRecebidaNumero <
      pedidoReceber.quantidade;

  /* =====================================================
     CONFIRMAR RECEBIMENTO
  ===================================================== */

  const confirmarRecebimento = async () => {
    if (!pedidoReceber) return;

    const qtd = Number(
      quantidadeRecebida
    );

    if (
      !Number.isInteger(qtd) ||
      qtd <= 0
    ) {
      Alert.alert(
        'Quantidade inválida',
        'Informe uma quantidade recebida válida.'
      );

      return;
    }

    if (qtd < pedidoReceber.quantidade) {
      Alert.alert(
        'Quantidade insuficiente',
        `O técnico solicitou ${pedidoReceber.quantidade} unidade(s). Para concluir o pedido, a quantidade recebida precisa ser igual ou maior que a solicitada.`
      );

      return;
    }

    if (mustReturn === null) {
      Alert.alert(
        'Retorno não informado',
        'Informe se a peça substituída deverá retornar ao estoque.'
      );

      return;
    }

    const textoRetorno = mustReturn
      ? 'COM RETORNO da peça substituída'
      : 'SEM RETORNO da peça substituída';

    Alert.alert(
      'Confirmar recebimento',
      `Foram recebidas ${qtd} unidade(s) de ${pedidoReceber.nome}.\n\n` +
        `${pedidoReceber.quantidade} unidade(s) serão reservadas para o técnico.\n` +
        `${qtd - pedidoReceber.quantidade} unidade(s) ficarão disponíveis no estoque.\n\n` +
        `Retirada: ${textoRetorno}.\n\n` +
        'Deseja concluir o pedido?',
      [
        {
          text: 'Voltar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () =>
            executarRecebimento(
              pedidoReceber,
              qtd,
              mustReturn
            ),
        },
      ]
    );
  };

  /* =====================================================
     EXECUTAR RECEBIMENTO
  ===================================================== */

  const executarRecebimento = async (
    pedido: Pedido,
    qtd: number,
    retorno: boolean
  ) => {
    try {
      setRecebendo(true);

      const { data } = await axios.put(
        `${API_BASE}/pedidos/${pedido.id}/atendido`,
        {
          quantidadeRecebida: qtd,

          // NOVO
          mustReturn: retorno,
        }
      );

      setModalReceberVisible(false);
      setPedidoReceber(null);
      setQuantidadeRecebida('');
      setMustReturn(null);

      await buscarPedidos();
      if (historicoAberto) await buscarHistorico();

      Alert.alert(
        'Peça recebida',
        `${pedido.quantidade} unidade(s) foram reservadas para o técnico.\n\n` +
          `${data?.saldoEstoque ?? qtd - pedido.quantidade} unidade(s) ficaram disponíveis no estoque.\n\n` +
          `${
            retorno
              ? 'A retirada foi marcada COM RETORNO.'
              : 'A retirada foi marcada SEM RETORNO.'
          }\n\n` +
          'A peça já foi enviada para Retiradas.'
      );
    } catch (e: any) {
      console.log(
        '[PEDIDOS] Erro ao receber peça:',
        e
      );

      Alert.alert(
        'Erro',
        e?.response?.data?.error ||
          'Não foi possível concluir o recebimento.'
      );
    } finally {
      setRecebendo(false);
    }
  };

  /* =====================================================
     CANCELAR PEDIDO
  ===================================================== */

  const confirmarCancelamento = (
    item: Pedido
  ) => {
    Alert.alert(
      'Cancelar pedido',
      `Deseja realmente cancelar a solicitação de ${item.quantidade}x ${item.nome}?`,
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

              await buscarPedidos();
      if (historicoAberto) await buscarHistorico();
            } catch (e: any) {
              console.log(
                '[PEDIDOS] Erro ao cancelar:',
                e
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
     RENDER DO PEDIDO
  ===================================================== */

  const renderPedido = ({
    item,
  }: {
    item: Pedido;
  }) => {
    const encerrado =
      item.status === 'disponivel';

    const fotoUrl = getFotoUrl(item.foto);

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTituloArea}>
            <Text style={styles.nome}>
              {item.nome}
            </Text>

            <Text style={styles.quantidade}>
              Quantidade solicitada:{' '}
              {item.quantidade}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              encerrado &&
                styles.statusBadgeOk,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                encerrado &&
                  styles.statusTextOk,
              ]}
            >
              {STATUS_LABEL[item.status] ||
                item.status}
            </Text>
          </View>
        </View>

        {fotoUrl && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              Linking.openURL(fotoUrl)
            }
          >
            <Image
              source={{ uri: fotoUrl }}
              style={styles.foto}
              resizeMode="cover"
            />
          </TouchableOpacity>
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

        <Text style={styles.sub}>
          Técnico:{' '}
          {item.tecnicoEmail ||
            item.tecnicoUid}
        </Text>

        {!!item.observacao && (
          <View style={styles.observacaoBox}>
            <Text
              style={styles.observacaoTitulo}
            >
              Observação
            </Text>

            <Text
              style={styles.observacaoTexto}
            >
              {item.observacao}
            </Text>
          </View>
        )}

        {encerrado || item.status === 'cancelado' || !!item.completed_at ? (
          <View style={styles.concluido}>
            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#2bb673"
            />

            <View style={{ flex: 1 }}>
              <Text
                style={styles.concluidoText}
              >
                {item.status === 'cancelado' ? 'Pedido cancelado' : 'Peça enviada para Retiradas'}
              </Text>

              {!!item.quantidadeRecebida && (
                <Text
                  style={
                    styles.concluidoSubText
                  }
                >
                  Recebido:{' '}
                  {item.quantidadeRecebida}{' '}
                  unidade(s)
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.statusBtn}
              onPress={() =>
                abrirModalStatus(item)
              }
            >
              <Ionicons
                name="git-branch-outline"
                size={18}
                color="#fff"
              />

              <Text style={styles.btnText}>
                Andamento
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.receberBtn}
              onPress={() =>
                abrirModalReceber(item)
              }
            >
              <Ionicons
                name="cube-outline"
                size={18}
                color="#fff"
              />

              <Text style={styles.btnText}>
                Peça chegou
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.delBtn}
              onPress={() =>
                confirmarCancelamento(item)
              }
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  /* =====================================================
     INTERFACE
  ===================================================== */

  return (
    <SafeAreaView
      style={styles.container}
      edges={['left', 'right', 'bottom']}
    >
      {/* ===============================================
          LINK VISTAS EXPLODIDAS
      =============================================== */}

      <View style={styles.card}>
        <Text style={styles.title}>
          Vistas Explodidas
        </Text>

        <Text style={styles.cardDescription}>
          Link disponibilizado aos técnicos
          para consulta de códigos e vistas
          das máquinas.
        </Text>

        <TextInput
          placeholder="Cole o link das vistas explodidas"
          placeholderTextColor="#777"
          value={linkDrive}
          onChangeText={setLinkDrive}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.linkActions}>
          <TouchableOpacity
            style={[
              styles.btn,
              { flex: 1 },
            ]}
            onPress={salvarLink}
            disabled={salvandoLink}
          >
            {salvandoLink ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={18}
                  color="#fff"
                />

                <Text
                  style={styles.btnText}
                >
                  Salvar
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.openBtn,
              { flex: 1 },
            ]}
            onPress={abrirDrive}
          >
            <Ionicons
              name="open-outline"
              size={18}
              color="#fff"
            />

            <Text style={styles.btnText}>
              Abrir
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* HISTÓRICO E EXPORTAÇÃO */}
      <View style={styles.historicoBarra}>
        <TouchableOpacity style={styles.historicoBtn} onPress={alternarHistorico} disabled={carregandoHistorico}>
          <Ionicons name={historicoAberto ? 'list-outline' : 'time-outline'} size={18} color="#fff" />
          <Text style={styles.btnText}>{historicoAberto ? 'Voltar aos pedidos' : 'Últimos 30 dias'}</Text>
        </TouchableOpacity>
        {historicoAberto && (
          <TouchableOpacity style={[styles.exportarBtn, exportando && styles.disabledBtn]} onPress={exportarHistorico} disabled={exportando || carregandoHistorico}>
            {exportando ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
            <Text style={styles.btnText}>Exportar Excel</Text>
          </TouchableOpacity>
        )}
      </View>
      {historicoAberto && <Text style={styles.historicoAviso}>Histórico dos pedidos criados nos últimos 30 dias. Arquivo CSV compatível com Excel.</Text>}

      {/* ===============================================
          LISTA
      =============================================== */}

      <View style={styles.sectionHeader}>
        <Text style={styles.section}>
          {historicoAberto ? 'Histórico de pedidos' : 'Pedidos de peças'}
        </Text>

        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>
            {historicoAberto ? historico.length : lista.length}
          </Text>
        </View>
      </View>

      {(historicoAberto ? carregandoHistorico : loading) && (historicoAberto ? historico : lista).length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
          />
        </View>
      ) : (
        <FlatList
          data={historicoAberto ? historico : lista}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderPedido}
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            (historicoAberto ? historico : lista).length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={historicoAberto ? carregandoHistorico : loading}
              onRefresh={historicoAberto ? buscarHistorico : carregarTudo}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="file-tray-outline"
                size={44}
                color="#999"
              />

              <Text
                style={styles.emptyTitle}
              >
                Nenhum pedido
              </Text>

              <Text
                style={styles.emptyText}
              >
                As solicitações feitas pelos
                técnicos aparecerão aqui.
              </Text>
            </View>
          }
        />
      )}

      {/* =================================================
          MODAL DE ANDAMENTO
      ================================================= */}

      <Modal
        visible={modalStatusVisible}
        transparent
        animationType="fade"
        onRequestClose={fecharModalStatus}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              <View
                style={styles.modalHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.modalTitle}
                  >
                    Andamento do pedido
                  </Text>

                  <Text
                    style={styles.modalSub}
                  >
                    {pedidoStatus?.nome}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    fecharModalStatus
                  }
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                Situação atual
              </Text>

              <View
                style={
                  styles.statusOptions
                }
              >
                <StatusOption
                  label="Em análise"
                  selected={
                    statusSelecionado ===
                    'em_analise'
                  }
                  onPress={() =>
                    setStatusSelecionado(
                      'em_analise'
                    )
                  }
                />

                <StatusOption
                  label="Em compra"
                  selected={
                    statusSelecionado ===
                    'compra'
                  }
                  onPress={() =>
                    setStatusSelecionado(
                      'compra'
                    )
                  }
                />

                <StatusOption
                  label="Solicitado à matriz"
                  selected={
                    statusSelecionado ===
                    'matriz'
                  }
                  onPress={() =>
                    setStatusSelecionado(
                      'matriz'
                    )
                  }
                />

                <StatusOption
                  label="Retirada de máquina"
                  selected={
                    statusSelecionado ===
                    'retirada_maquina'
                  }
                  onPress={() =>
                    setStatusSelecionado(
                      'retirada_maquina'
                    )
                  }
                />

                <StatusOption
                  label="Aguardando fornecedor"
                  selected={
                    statusSelecionado ===
                    'aguardando_fornecedor'
                  }
                  onPress={() =>
                    setStatusSelecionado(
                      'aguardando_fornecedor'
                    )
                  }
                />
              </View>

              <Text style={styles.label}>
                Observação
              </Text>

              <TextInput
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Ex.: Pedido realizado com o fornecedor..."
                placeholderTextColor="#777"
                multiline
                style={
                  styles.observacaoInput
                }
                textAlignVertical="top"
              />

              <View
                style={
                  styles.modalButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelModalBtn
                  }
                  onPress={
                    fecharModalStatus
                  }
                  disabled={salvandoStatus}
                >
                  <Text
                    style={
                      styles.cancelModalText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.confirmModalBtn
                  }
                  onPress={
                    salvarAndamento
                  }
                  disabled={salvandoStatus}
                >
                  {salvandoStatus ? (
                    <ActivityIndicator
                      color="#fff"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.btnText
                        }
                      >
                        Salvar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =================================================
          MODAL DE RECEBIMENTO
      ================================================= */}

      <Modal
        visible={modalReceberVisible}
        transparent
        animationType="fade"
        onRequestClose={fecharModalReceber}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              <View
                style={styles.modalHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.modalTitle}
                  >
                    Receber peça
                  </Text>

                  <Text
                    style={styles.modalSub}
                  >
                    {pedidoReceber?.nome}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    fecharModalReceber
                  }
                >
                  <Ionicons
                    name="close"
                    size={25}
                    color="#555"
                  />
                </TouchableOpacity>
              </View>

              {/* QUANTIDADE SOLICITADA */}

              <View
                style={
                  styles.resumoSolicitacao
                }
              >
                <Text
                  style={
                    styles.resumoLabel
                  }
                >
                  Solicitado pelo técnico
                </Text>

                <Text
                  style={
                    styles.resumoQuantidade
                  }
                >
                  {pedidoReceber?.quantidade ??
                    0}{' '}
                  un.
                </Text>
              </View>

              {/* QUANTIDADE RECEBIDA */}

              <Text style={styles.label}>
                Quantidade recebida
              </Text>

              <TextInput
                value={quantidadeRecebida}
                onChangeText={(text) =>
                  setQuantidadeRecebida(
                    text.replace(
                      /[^0-9]/g,
                      ''
                    )
                  )
                }
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#777"
                style={
                  styles.quantidadeInput
                }
              />

              {/* DISTRIBUIÇÃO */}

              {quantidadeInsuficiente ? (
                <View
                  style={
                    styles.warningBox
                  }
                >
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color="#a66a00"
                  />

                  <Text
                    style={
                      styles.warningText
                    }
                  >
                    A quantidade recebida é
                    menor que a solicitada.
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.distribuicaoBox
                  }
                >
                  <View
                    style={
                      styles.distribuicaoLinha
                    }
                  >
                    <Text
                      style={
                        styles.distribuicaoLabel
                      }
                    >
                      Reservado para o técnico
                    </Text>

                    <Text
                      style={
                        styles.distribuicaoValor
                      }
                    >
                      {quantidadeReservada}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.distribuicaoLinha
                    }
                  >
                    <Text
                      style={
                        styles.distribuicaoLabel
                      }
                    >
                      Disponível no estoque
                    </Text>

                    <Text
                      style={
                        styles.distribuicaoValorEstoque
                      }
                    >
                      {saldoEstoque}
                    </Text>
                  </View>
                </View>
              )}

              {/* =========================================
                  NOVO: RETORNO DA PEÇA
              ========================================= */}

              <View style={styles.retornoSection}>
                <Text style={styles.retornoTitle}>
                  Retorno da peça substituída
                </Text>

                <Text style={styles.retornoDescription}>
                  Informe se o técnico deverá devolver a peça
                  retirada da máquina após realizar a troca.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.retornoOption,
                    mustReturn === false &&
                      styles.retornoOptionSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setMustReturn(false)
                  }
                >
                  <Ionicons
                    name={
                      mustReturn === false
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={22}
                    color={
                      mustReturn === false
                        ? '#2bb673'
                        : '#888'
                    }
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.retornoOptionTitle,
                        mustReturn === false &&
                          styles.retornoOptionTitleSelected,
                      ]}
                    >
                      Sem retorno
                    </Text>

                    <Text
                      style={styles.retornoOptionSub}
                    >
                      O técnico não precisará devolver a
                      peça substituída.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.retornoOption,
                    mustReturn === true &&
                      styles.retornoOptionSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setMustReturn(true)
                  }
                >
                  <Ionicons
                    name={
                      mustReturn === true
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={22}
                    color={
                      mustReturn === true
                        ? '#2bb673'
                        : '#888'
                    }
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.retornoOptionTitle,
                        mustReturn === true &&
                          styles.retornoOptionTitleSelected,
                      ]}
                    >
                      Com retorno
                    </Text>

                    <Text
                      style={styles.retornoOptionSub}
                    >
                      Após a retirada, ficará pendente a
                      devolução da peça substituída.
                    </Text>
                  </View>
                </TouchableOpacity>

                {mustReturn === null && (
                  <View style={styles.retornoWarning}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#8a5b00"
                    />

                    <Text
                      style={
                        styles.retornoWarningText
                      }
                    >
                      Selecione uma das opções antes de
                      confirmar.
                    </Text>
                  </View>
                )}
              </View>

              {/* INFORMAÇÃO */}

              <Text
                style={styles.receberInfo}
              >
                Ao confirmar, a quantidade
                solicitada será reservada para
                o técnico e a peça aparecerá
                automaticamente em Retiradas.
              </Text>

              {/* BOTÕES */}

              <View
                style={
                  styles.modalButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelModalBtn
                  }
                  onPress={
                    fecharModalReceber
                  }
                  disabled={recebendo}
                >
                  <Text
                    style={
                      styles.cancelModalText
                    }
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.receberConfirmBtn,

                    (quantidadeInsuficiente ||
                      mustReturn === null) &&
                      styles.disabledBtn,
                  ]}
                  onPress={
                    confirmarRecebimento
                  }
                  disabled={
                    recebendo ||
                    quantidadeInsuficiente ||
                    mustReturn === null
                  }
                >
                  {recebendo ? (
                    <ActivityIndicator
                      color="#fff"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={19}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.btnText
                        }
                      >
                        Confirmar
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* =====================================================
   COMPONENTE DE STATUS
===================================================== */

function StatusOption({
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
        styles.statusOption,
        selected &&
          styles.statusOptionSelected,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={19}
        color={
          selected ? '#4a90e2' : '#888'
        }
      />

      <Text
        style={[
          styles.statusOptionText,
          selected &&
            styles.statusOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =====================================================
   ESTILOS
===================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },

  card: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 14,
  },

  title: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },

  cardDescription: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
    color: '#111',
  },

  linkActions: {
    flexDirection: 'row',
    gap: 8,
  },

  btn: {
    flexDirection: 'row',
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  openBtn: {
    flexDirection: 'row',
    backgroundColor: '#555',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
  },

  historicoBarra: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  historicoBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#2469a8', padding: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  exportarBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#177245', padding: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  historicoAviso: { color: '#666', fontSize: 12, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  section: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
  },

  totalBadge: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalText: {
    fontWeight: '700',
    fontSize: 12,
  },

  listContent: {
    paddingBottom: 30,
  },

  item: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
    gap: 8,
  },

  itemTituloArea: {
    flex: 1,
  },

  nome: {
    fontWeight: '700',
    fontSize: 15,
  },

  quantidade: {
    color: '#444',
    fontSize: 12,
    marginTop: 2,
  },

  sub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },

  foto: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 9,
    backgroundColor: '#eee',
  },

  statusBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 150,
  },

  statusBadgeOk: {
    backgroundColor: '#dff5e8',
  },

  statusText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  statusTextOk: {
    color: '#177245',
  },

  observacaoBox: {
    backgroundColor: '#f0f3f7',
    padding: 8,
    borderRadius: 7,
    marginTop: 8,
  },

  observacaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },

  observacaoTexto: {
    color: '#555',
    fontSize: 12,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },

  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4a90e2',
    paddingVertical: 9,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  receberBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2bb673',
    paddingVertical: 9,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  delBtn: {
    backgroundColor: '#e53935',
    padding: 9,
    borderRadius: 7,
  },

  concluido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },

  concluidoText: {
    color: '#177245',
    fontSize: 12,
    fontWeight: '700',
  },

  concluidoSubText: {
    color: '#666',
    fontSize: 11,
    marginTop: 1,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  emptyTitle: {
    fontWeight: '700',
    marginTop: 10,
  },

  emptyText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  /* MODAIS */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },

  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  modalSub: {
    color: '#666',
    fontSize: 13,
    marginTop: 3,
  },

  label: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 7,
    marginTop: 4,
  },

  statusOptions: {
    gap: 6,
    marginBottom: 16,
  },

  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },

  statusOptionSelected: {
    borderColor: '#4a90e2',
    backgroundColor: '#eef6ff',
  },

  statusOptionText: {
    color: '#555',
    fontSize: 13,
  },

  statusOptionTextSelected: {
    color: '#2469a8',
    fontWeight: '700',
  },

  observacaoInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 16,
    color: '#111',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },

  cancelModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelModalText: {
    color: '#555',
    fontWeight: '700',
  },

  confirmModalBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4a90e2',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  receberConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2bb673',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  disabledBtn: {
    opacity: 0.45,
  },

  resumoSolicitacao: {
    backgroundColor: '#f5f5f5',
    borderRadius: 9,
    padding: 12,
    marginBottom: 15,
  },

  resumoLabel: {
    color: '#666',
    fontSize: 12,
  },

  resumoQuantidade: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 2,
  },

  quantidadeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#111',
  },

  distribuicaoBox: {
    backgroundColor: '#f2faf5',
    borderRadius: 9,
    padding: 12,
    marginBottom: 12,
  },

  distribuicaoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },

  distribuicaoLabel: {
    color: '#555',
    fontSize: 13,
  },

  distribuicaoValor: {
    fontWeight: '700',
    fontSize: 16,
  },

  distribuicaoValorEstoque: {
    fontWeight: '700',
    fontSize: 16,
    color: '#177245',
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff4d6',
    padding: 10,
    borderRadius: 8,
    gap: 7,
    marginBottom: 12,
  },

  warningText: {
    flex: 1,
    color: '#8a5b00',
    fontSize: 12,
  },

  receberInfo: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },

  /* ===================================================
     NOVO - RETORNO
  =================================================== */

  retornoSection: {
    marginTop: 4,
    marginBottom: 15,
  },

  retornoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },

  retornoDescription: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },

  retornoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 9,
    padding: 11,
    marginBottom: 8,
    backgroundColor: '#fff',
  },

  retornoOptionSelected: {
    borderColor: '#2bb673',
    backgroundColor: '#f0faf5',
  },

  retornoOptionTitle: {
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
  },

  retornoOptionTitleSelected: {
    color: '#177245',
    fontWeight: '700',
  },

  retornoOptionSub: {
    color: '#777',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  retornoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff4d6',
    padding: 8,
    borderRadius: 7,
    marginTop: 2,
  },

  retornoWarningText: {
    flex: 1,
    color: '#8a5b00',
    fontSize: 11,
  },
});