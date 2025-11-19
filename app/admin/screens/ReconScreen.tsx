import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE } from '../../../src/config';
// 📦 Excel + compartilhamento
import { Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

type ReconItem = {
  id: number;
  part_id: number;
  qty: number;
  status: 'ready_for_pickup' | 'picked_up';
  must_return: 0 | 1;
  recon_status?: 'pending' | 'received' | 'restored' | 'discarded' | null;
  recon_received_at?: string | null;
  recon_processed_at?: string | null;
  returned_at?: string | null;
  recon_notes?: string | null; // <<< incluir nota no tipo
  technicianEmail: string;
  technicianUid?: string | null;
  created_at: string;
  part: {
    id: number;
    nome: string;
    codigo: string;
    marca?: string | null;
    modelo?: string | null;
  };
};

type ActionKind = 'restore' | 'discard';
type HistoryStatus = 'all' | 'restored' | 'discarded';

export default function ReconScreen() {
  // ===== Lista principal (itens DEVOLVIDOS pelo técnico → recon_status='received') =====
  const [items, setItems] = useState<ReconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== Modal da ação (observações) =====
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<ReconItem | null>(null);
  const [action, setAction] = useState<ActionKind>('restore');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ===== Novo: Modal de INFO (anotações de andamento) =====
  const [infoVisible, setInfoVisible] = useState(false);          // <<<
  const [infoSelected, setInfoSelected] = useState<ReconItem|null>(null); // <<<
  const [infoText, setInfoText] = useState('');                   // <<<
  const [infoSaving, setInfoSaving] = useState(false);            // <<<

  // ===== Histórico (filtros + export) =====
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReconItem[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filtros do histórico
  const [statusFilter, setStatusFilter] = useState<HistoryStatus>('all'); // all|restored|discarded
  const [rangeMode, setRangeMode] = useState<'lastDays' | 'custom'>('lastDays');
  const [lastDays, setLastDays] = useState<number>(30); // 7 | 30 | 90
  const [fromDate, setFromDate] = useState<string>(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>('');     // YYYY-MM-DD

  // =================== Fetch: DEVOLVIDAS (received) ===================
  const fetchRecon = useCallback(async () => {
    try {
      setError(null);
      const { data } = await axios.get(`${API_BASE}/recon-items`, { timeout: 12000 });
      const list: ReconItem[] = (data?.items ?? []).filter(
        (it: ReconItem) => (it.recon_status ?? 'pending') === 'received'
      );
      setItems(list);
    } catch (e: any) {
      console.log('ERRO GET /recon-items =>', e?.response?.status, e?.response?.data, e?.message);
      setError('Falha ao carregar itens de recon. Puxe para atualizar e tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecon();
  }, [fetchRecon]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecon();
  }, [fetchRecon]);

  const headerSubtitle = useMemo(
    () =>
      items.length
        ? `${items.length} peça(s) devolvida(s) — prontas para análise`
        : 'Nenhuma peça devolvida pendente de análise',
    [items]
  );

  // =================== Ações: restaurar/descartar ===================
  const openAction = (item: ReconItem, kind: ActionKind) => {
    setSelected(item);
    setAction(kind);
    setNotes('');
    setModalVisible(true);
  };
  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setSelected(null);
    setNotes('');
  };
  const submitAction = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      if (action === 'restore') {
        await axios.post(
          `${API_BASE}/recon-items/${selected.id}/restore`,
          { notes: notes ?? null },
          { timeout: 12000 }
        );
        Alert.alert('OK', 'Peça recondicionada e devolvida ao estoque central.');
      } else {
        await axios.post(
          `${API_BASE}/recon-items/${selected.id}/discard`,
          { reason: notes ?? null },
          { timeout: 12000 }
        );
        Alert.alert('OK', 'Peça descartada (não retorna ao estoque).');
      }
      setItems((prev) => prev.filter((x) => x.id !== selected.id));
      closeModal();
    } catch (e: any) {
      console.log('ERRO POST /recon-items action =>', e?.response?.status, e?.response?.data, e?.message);
      Alert.alert(
        'Erro',
        action === 'restore'
          ? 'Não foi possível concluir o recondicionamento.'
          : 'Não foi possível descartar a peça.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =================== Novo: Info (anotações de andamento) ===================
  const openInfo = (item: ReconItem) => {
    setInfoSelected(item);
    setInfoText((item.recon_notes ?? '').trim());
    setInfoVisible(true);
  };
  const closeInfo = () => {
    if (infoSaving) return;
    setInfoVisible(false);
    setInfoSelected(null);
    setInfoText('');
  };
  const saveInfo = async () => {
    if (!infoSelected) return;
    try {
      setInfoSaving(true);
      await axios.post(
        `${API_BASE}/recon-items/${infoSelected.id}/notes`,
        { notes: infoText },
        { timeout: 12000 }
      );
      // atualiza local
      setItems((prev) =>
        prev.map((it) =>
          it.id === infoSelected.id ? { ...it, recon_notes: infoText } : it
        )
      );
      closeInfo();
      Alert.alert('OK', 'Anotação salva.');
    } catch (e: any) {
      console.log('ERRO POST /recon-items/:id/notes =>', e?.response?.status, e?.response?.data, e?.message);
      Alert.alert('Erro', 'Não foi possível salvar a anotação.');
    } finally {
      setInfoSaving(false);
    }
  };

  // =================== Histórico (com filtros) ===================
  const buildHistoryParams = () => {
    const params: any = { status: statusFilter, limit: 1000 };
    if (rangeMode === 'lastDays') {
      params.lastDays = lastDays;
    } else if ((fromDate ?? '').match(/^\d{4}\-\d{2}\-\d{2}$/) && (toDate ?? '').match(/^\d{4}\-\d{2}\-\d{2}$/)) {
      params.from = fromDate;
      params.to = toDate;
    } else {
      params.lastDays = 30;
    }
    return params;
  };

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      setHistoryLoading(true);
      const params = buildHistoryParams();
      const { data } = await axios.get(`${API_BASE}/recon-history`, { params, timeout: 15000 });
      setHistory(data?.items ?? []);
    } catch (e: any) {
      console.log('ERRO GET /recon-history =>', e?.response?.status, e?.response?.data, e?.message);
      setHistoryError('Falha ao carregar histórico. Tente novamente.');
    } finally {
      setHistoryLoading(false);
    }
  }, [statusFilter, rangeMode, lastDays, fromDate, toDate]);

  const openHistory = async () => {
    setHistoryOpen(true);
    await loadHistory();
  };
  const applyFilters = async () => { await loadHistory(); };
  const clearFilters = async () => {
    setStatusFilter('all');
    setRangeMode('lastDays');
    setLastDays(30);
    setFromDate('');
    setToDate('');
    await loadHistory();
  };

  // =================== Exportar Excel (histórico) ===================
  const buildHistoryBytes = () => {
    const rows = history.map((h) => ({
      id: h.id,
      data_processada: h.recon_processed_at ?? '',
      status_recon: h.recon_status ?? '',
      nome: h.part?.nome ?? '',
      codigo: h.part?.codigo ?? '',
      qtd: h.qty,
      tecnico: h.technicianEmail ?? '',
      recebida_em: h.recon_received_at ?? '',
      retornou_ao_estoque_em: h.returned_at ?? '',
      observacoes: (h.recon_notes ?? '').trim(), // já exporta as anotações
    }));
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        'id',
        'data_processada',
        'status_recon',
        'nome',
        'codigo',
        'qtd',
        'tecnico',
        'recebida_em',
        'retornou_ao_estoque_em',
        'observacoes',
      ],
    });
    (ws as any)['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 12 },
      { wch: 30 },
      { wch: 16 },
      { wch: 6 },
      { wch: 28 },
      { wch: 20 },
      { wch: 24 },
      { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historico Recon');
    const u8 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
    const safeStamp = new Date().toISOString().replace(/[.:]/g, '-');
    const fileName = `historico-recon_${safeStamp}.xlsx`;
    return { u8, fileName };
  };

  const exportHistoryExcel = async () => {
    try {
      if (!history.length) {
        Alert.alert('Nada a exportar', 'Carregue o histórico antes de exportar.');
        return;
      }
      setExporting(true);
      const { u8, fileName } = buildHistoryBytes();
      const outDir = new Directory(Paths.cache, 'exports');
      if (!outDir.exists) {
        try { outDir.create(); } catch {}
      }
      const outFile = outDir.createFile(
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      outFile.write(u8);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outFile.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'com.microsoft.excel.xlsx',
          dialogTitle: 'Exportar histórico do Recon',
        });
      } else {
        Alert.alert('Arquivo salvo', `Planilha salva no app.\nCaminho: ${outFile.uri}`);
      }
    } catch (e: any) {
      console.log('ERRO exportHistoryExcel =>', e?.message);
      Alert.alert('Erro', 'Não foi possível gerar o Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Recon (ADM/Laboratório)</Text>
          <Text style={styles.headerSub}>{headerSubtitle}</Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.btnSmall, styles.btnGhost]} onPress={openHistory}>
            <Text style={styles.btnGhostText}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSmall, styles.btnGhost, exporting && { opacity: 0.5 }]}
            onPress={exportHistoryExcel}
            disabled={exporting}
          >
            <Text style={styles.btnGhostText}>{exporting ? 'Exportando…' : 'Exportar Excel'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* Lista principal: DEVOLVIDAS (received) */}
      {loading ? (
        <View style={[styles.center, { marginTop: 16 }]}>
          <ActivityIndicator />
          <Text style={styles.muted}>Carregando…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma peça devolvida pendente de análise.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Cabeçalho do card + botão Info */}
              <View style={styles.cardHeaderRow}>
                <Text style={styles.partName}>{item.part.nome}</Text>

                {/* Botão Info: ℹ️ (destacar quando houver nota) */}
                <TouchableOpacity
                  onPress={() => openInfo(item)}
                  style={[
                    styles.infoBtn,
                    (item.recon_notes ?? '').trim() ? styles.infoBtnActive : null,
                  ]}
                >
                  <Text style={styles.infoIcon}>ℹ️</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.line}>
                <Text style={styles.label}>Código: </Text>{item.part.codigo}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Quantidade: </Text>{item.qty}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Técnico: </Text>{item.technicianEmail}
              </Text>
              <Text style={styles.meta}>
                Devolvida em {item.recon_received_at
                  ? new Date(item.recon_received_at).toLocaleString()
                  : new Date(item.created_at).toLocaleString()}
              </Text>

              {/* Ações principais */}
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOk]}
                  onPress={() => openAction(item, 'restore')}
                >
                  <Text style={styles.btnLabel}>Peça reparada (voltar estoque)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDanger]}
                  onPress={() => openAction(item, 'discard')}
                >
                  <Text style={styles.btnLabel}>Descartar</Text>
                </TouchableOpacity>
              </View>

              {/* Se quiser, mostra um resumo da nota abaixo */}
              {(item.recon_notes ?? '').trim() ? (
                <Text style={styles.notePreview}>
                  {(item.recon_notes ?? '').trim()}
                </Text>
              ) : null}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* Modal Observações (restore/discard) */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {action === 'restore' ? 'Confirmar recondicionamento' : 'Confirmar descarte'}
            </Text>
            <Text style={styles.modalHint}>
              {action === 'restore'
                ? 'Opcional: registre observações/laudo do reparo antes de concluir.'
                : 'Opcional: registre o motivo do descarte antes de concluir.'}
            </Text>
            <TextInput
              style={styles.textarea}
              placeholder={action === 'restore' ? 'Observações do reparo…' : 'Motivo do descarte…'}
              placeholderTextColor="#6B7B8A"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={closeModal} disabled={submitting}>
                <Text style={styles.btnLabelAlt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  action === 'restore' ? styles.btnOk : styles.btnDanger,
                  submitting && { opacity: 0.7 },
                ]}
                onPress={submitAction}
                disabled={submitting}
              >
                <Text style={styles.btnLabel}>
                  {submitting ? 'Enviando…' : (action === 'restore' ? 'Concluir reparo' : 'Confirmar descarte')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Novo: Modal de INFO (anotações de andamento) */}
      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={closeInfo}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Anotação do Recon</Text>
            <Text style={styles.modalHint}>
              Descreva o que está pendente/andamento para esta peça (ex.: “Aguardando resistor 10k”, “Teste em bancada”).
            </Text>
            <TextInput
              style={styles.textarea}
              placeholder="Digite a nota…"
              placeholderTextColor="#6B7B8A"
              multiline
              value={infoText}
              onChangeText={setInfoText}
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={closeInfo} disabled={infoSaving}>
                <Text style={styles.btnLabelAlt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost, infoSaving && { opacity: 0.6 }]}
                onPress={saveInfo}
                disabled={infoSaving}
              >
                <Text style={styles.btnGhostText}>{infoSaving ? 'Salvando…' : 'Salvar anotação'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: '#0E141A' },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9FB0C7' },
  header: { marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#E6EDF7', fontWeight: '900', fontSize: 20 },
  headerSub: { color: '#9FB0C7', fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#35506C' },
  btnGhost: { backgroundColor: 'transparent' },
  btnGhostText: { color: '#C8D4E6', fontWeight: '800' },
  errorText: {
    backgroundColor: '#3B1F22',
    borderColor: '#6C2F35',
    borderWidth: 1,
    color: '#FFB4B4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', marginTop: 24, color: '#9FB0C7' },
  card: { backgroundColor: '#111923', borderWidth: 1, borderColor: '#233042', borderRadius: 12, padding: 12, marginVertical: 8 },

  // Cabeçalho com botão Info
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },              // <<<
  infoBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#35506C' }, // <<<
  infoBtnActive: { backgroundColor: '#17324B', borderColor: '#4C82B7' },      // <<<
  infoIcon: { color: '#C8D4E6', fontSize: 16 },                                // <<<

  partName: { color: '#E6EDF7', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  line: { color: '#C8D4E6', fontSize: 14, marginTop: 2 },
  label: { color: '#9FB0C7', fontWeight: '700' },
  meta: { color: '#7893B0', fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnOk: { backgroundColor: '#1E7F36' },
  btnDanger: { backgroundColor: '#C62828' },
  btnAlt: { borderWidth: 1, borderColor: '#35506C' },
  btnLabel: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  btnLabelAlt: { color: '#C8D4E6', fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modal: { width: '100%', backgroundColor: '#0E141A', borderRadius: 12, borderWidth: 1, borderColor: '#233042', padding: 14 },
  modalTitle: { color: '#E6EDF7', fontWeight: '900', fontSize: 18 },
  modalHint: { color: '#9FB0C7', fontSize: 13, marginTop: 6, marginBottom: 8 },
  textarea: { minHeight: 90, borderWidth: 1, borderColor: '#233042', backgroundColor: '#0F1720', color: '#E6EDF7', borderRadius: 10, padding: 10, textAlignVertical: 'top' },

  // Histórico + filtros
  historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  historyPanel: { backgroundColor: '#0E141A', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderTopWidth: 1, borderColor: '#233042', padding: 14, maxHeight: '80%' },
  historyTitle: { color: '#E6EDF7', fontWeight: '900', fontSize: 18, marginBottom: 8 },
  filtersBox: { marginBottom: 10, borderWidth: 1, borderColor: '#233042', borderRadius: 10, padding: 10, backgroundColor: '#0F1720' },
  filterRow: { marginBottom: 6 },
  filterLabel: { color: '#C8D4E6', fontWeight: '700', marginBottom: 4 },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderColor: '#35506C', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  pillActive: { backgroundColor: '#17324B', borderColor: '#4C82B7' },
  pillText: { color: '#C8D4E6', fontWeight: '700' },
  pillTextActive: { color: '#E6EDF7' },
  dateInput: { flex: 1, borderWidth: 1, borderColor: '#35506C', borderRadius: 8, paddingHorizontal: 10, color: '#E6EDF7', backgroundColor: '#0F1720' },
  hItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1D2A39' },
  hName: { color: '#E6EDF7', fontWeight: '800' },
  hCode: { color: '#9FB0C7', fontWeight: '700' },
  hLine: { color: '#C8D4E6', marginTop: 2 },
  hNotes: { color: '#AFC4DE', marginTop: 4, fontStyle: 'italic' },

  // Preview de nota no card principal
  notePreview: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1D2A39',
    paddingTop: 8,
    color: '#AFC4DE',
    fontStyle: 'italic',
  },
});