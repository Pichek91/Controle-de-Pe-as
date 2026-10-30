import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { API_BASE } from '../../config';
import { useAuth } from '../../hooks/useAuth';

type ReturnItem = {
  id: number;
  qty: number;
  status: 'picked_up';
  must_return: 0 | 1;
  recon_status?: 'pending' | 'received' | 'restored' | 'discarded' | null;
  technicianEmail: string;
  technicianUid?: string | null;
  created_at: string;
  part: { id: number; nome: string; codigo: string; marca?: string | null; modelo?: string | null };
};
function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function apiError(res: Response, fallback: string): Promise<string> {
  const txt = await res.text().catch(() => '');
  try { const obj = JSON.parse(txt); return obj?.error ?? fallback; } catch { return fallback; }
}
export default function DevolucaoScreen() {
  const { uid, token, refreshToken } = useAuth();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ReturnItem | null>(null);
  const [defeito, setDefeito] = useState('');
  const hdrs = useMemo(() => authHeaders(token), [token]);

  const fetchList = useCallback(async (): Promise<ReturnItem[]> => {
    if (!uid) return [];
    const res = await fetch(`${API_BASE}/returns/my?technicianUid=${encodeURIComponent(uid)}`, { headers: hdrs });
    if (!res.ok) throw new Error(await apiError(res, `HTTP ${res.status}`));
    const json = await res.json();
    return json?.items ?? [];
  }, [uid, hdrs]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setInitialLoading(true);
      setItems(await fetchList());
    } catch (e: any) {
      console.warn('[Devolução] load error:', e?.message);
      if (!opts?.silent) Alert.alert('Erro', 'Falha ao carregar itens para devolução.');
    } finally { setInitialLoading(false); setRefreshing(false); }
  }, [fetchList]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const handleRefresh = useCallback(() => { setRefreshing(true); void load({ silent: true }); }, [load]);

  const abrirDevolucao = (item: ReturnItem) => {
    if (busyId !== null) return;
    setSelected(item);
    setDefeito('');
  };

  const devolverAgora = async (imprimirEtiqueta: boolean) => {
    if (!selected || busyId !== null) return;
    if (!uid) { Alert.alert('Erro', 'Não foi possível identificar o técnico logado.'); return; }
    const descricao = defeito.trim();
    if (!descricao) { Alert.alert('Defeito obrigatório', 'Descreva o defeito antes de devolver a peça.'); return; }
    if (descricao.length > 500) { Alert.alert('Descrição muito longa', 'Utilize até 500 caracteres.'); return; }
    const item = selected;
    setBusyId(item.id);
    try {

      const tokenAtualizado = await refreshToken();

if (!tokenAtualizado) {
  Alert.alert('Sessão expirada', 'Não foi possível renovar sua autenticação. Faça login novamente.');
  return;
}
      // A API deve registrar a devolução e, quando solicitado, criar o job de impressão na mesma transação.
      const res = await fetch(`${API_BASE}/returns/${item.id}/hand-over`, {
        method: 'POST',
        headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${tokenAtualizado}`,
},
        body: JSON.stringify({ technicianUid: uid, defectDescription: descricao, printLabel: imprimirEtiqueta }),
      });
      if (!res.ok) {
        Alert.alert('Erro', await apiError(res, 'Falha ao registrar devolução.'));
        await load({ silent: true });
        return;
      }
      const result = await res.json().catch(() => ({}));
      setItems(prev => prev.filter(x => x.id !== item.id));
      setSelected(null);
      setDefeito('');
      if (imprimirEtiqueta) {
        Alert.alert('Devolução registrada', result?.printQueued === true
          ? 'Etiqueta adicionada à fila de impressão da filial.'
          : 'Devolução registrada, mas a API não confirmou o envio para a fila de impressão.');
      } else {
        Alert.alert('Sucesso', 'Devolução registrada. Obrigado!');
      }
    } catch (e: any) {
      console.warn('[Devolução] hand-over erro:', e);
      Alert.alert('Erro', 'Não foi possível confirmar a devolução. Atualize a lista antes de tentar novamente.');
    } finally { setBusyId(null); }
  };

  if (initialLoading) return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 24 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.part.nome}{' '}<Text style={styles.muted}>(cód. {item.part.codigo})</Text></Text>
            <Text style={styles.text}>Qtd: <Text style={styles.strong}>{item.qty}</Text></Text>
            <Text style={styles.textSmall}>Retirada em {new Date(item.created_at).toLocaleString()}{' • '}Deve retornar ao Recon</Text>
            <TouchableOpacity onPress={() => abrirDevolucao(item)} disabled={busyId !== null} style={[styles.btn, busyId !== null && styles.btnDisabled]}>
              <Text style={styles.btnLabel}>{busyId === item.id ? 'Enviando…' : 'Devolver agora'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma peça pendente de devolução.</Text>}
        contentContainerStyle={styles.listContent}
      />
      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => { if (busyId === null) setSelected(null); }}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Devolução de peça</Text>
            <Text style={styles.modalPart}>{selected?.part.nome} ({selected?.part.codigo})</Text>
            <Text style={styles.fieldLabel}>Descreva o defeito *</Text>
            <TextInput
              style={styles.input}
              multiline
              maxLength={500}
              value={defeito}
              onChangeText={setDefeito}
              editable={busyId === null}
              placeholder="Ex.: Peça não aciona, apresenta vazamento..."
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{defeito.length}/500</Text>
            <TouchableOpacity disabled={busyId !== null} style={[styles.btn, styles.printBtn, busyId !== null && styles.btnDisabled]} onPress={() => void devolverAgora(true)}>
              <Text style={styles.btnLabel}>{busyId !== null ? 'Registrando…' : 'Devolver e imprimir etiqueta'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busyId !== null} style={[styles.btn, styles.noPrintBtn, busyId !== null && styles.btnDisabled]} onPress={() => void devolverAgora(false)}>
              <Text style={styles.btnLabel}>Devolver sem imprimir</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busyId !== null} style={styles.cancelBtn} onPress={() => setSelected(null)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fafafa' },
  listContent: { paddingBottom: 24 },
  card: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eaeaea', marginBottom: 12, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#1b5e20' }, muted: { color: '#666' },
  text: { fontSize: 14, marginTop: 4, color: '#222' }, strong: { fontWeight: '700' },
  textSmall: { marginTop: 6, color: '#777', fontSize: 12 },
  btn: { marginTop: 12, backgroundColor: '#1565c0', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 }, btnLabel: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 24, color: '#777' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#1b5e20' },
  modalPart: { marginTop: 6, marginBottom: 16, color: '#444' },
  fieldLabel: { fontWeight: '600', marginBottom: 7, color: '#222' },
  input: { minHeight: 105, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, color: '#222' },
  counter: { textAlign: 'right', fontSize: 11, color: '#777', marginTop: 3 },
  printBtn: { backgroundColor: '#1565c0' }, noPrintBtn: { backgroundColor: '#2e7d32', marginTop: 8 },
  cancelBtn: { padding: 13, alignItems: 'center' }, cancelText: { color: '#555', fontWeight: '600' },
});
