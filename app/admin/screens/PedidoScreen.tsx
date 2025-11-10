import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ✅ API moderna (SDK 54): File/Directory/Paths
import { Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// Tipagem alinhada com sua API /pecas
type Peca = {
  id: number;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  codigo: string;
  quantidade: number;   // estoque atual
  estoqueMin: number;
  estoqueMax?: number | null;
  imagem?: string | null; // URL absoluta (não será exportada)
};

// Item com campos derivados para exibição/ordenar
type ItemCritico = Peca & {
  deficit: number;       // quantidade - estoqueMin (<= 0)
  qtdParaPedir: number;  // Math.max(estoqueMin - quantidade, 0)
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.grancoffeepecas.com.br';
const PECAS_ENDPOINT = '/pecas';

export default function PedidoScreen() {
  const [loading, setLoading] = useState(true);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE_URL}${PECAS_ENDPOINT}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(`Erro ao carregar peças (${res.status}): ${JSON.stringify(body)}`);
      }

      const data = (await res.json()) as any[];

      const sane: Peca[] = data.map((r) => ({
        id: Number(r.id),
        nome: String(r.nome ?? ''),
        marca: r.marca ?? null,
        modelo: r.modelo ?? null,
        codigo: String(r.codigo ?? ''),
        quantidade: Number(isFinite(r.quantidade) ? r.quantidade : 0),
        estoqueMin: Number(isFinite(r.estoqueMin) ? r.estoqueMin : 0),
        estoqueMax:
          r.estoqueMax != null && isFinite(r.estoqueMax) ? Number(r.estoqueMax) : null,
        imagem: r.imagem ?? null,
      }));

      setPecas(sane);
    } catch (e: any) {
      if (e.name === 'AbortError') setError('Tempo de resposta excedido. Tente novamente.');
      else setError(e?.message ?? 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Filtra críticas e ordena por maior "qtdParaPedir"
  const pecasCriticas: ItemCritico[] = useMemo(() => {
    const lista = pecas
      .filter((p) => p.quantidade <= p.estoqueMin)
      .map((p) => {
        const deficit = p.quantidade - p.estoqueMin; // <= 0
        const qtdParaPedir = Math.max(p.estoqueMin - p.quantidade, 0);
        return { ...p, deficit, qtdParaPedir };
      });

    return lista.sort((a, b) => {
      if (b.qtdParaPedir !== a.qtdParaPedir) return b.qtdParaPedir - a.qtdParaPedir;
      return a.nome.localeCompare(b.nome);
    });
  }, [pecas]);

  const totalItensCriticos = pecasCriticas.length;
  const totalQtdParaPedir = useMemo(
    () => pecasCriticas.reduce((acc, it) => acc + it.qtdParaPedir, 0),
    [pecasCriticas]
  );

  // ============ Builder de planilha → ArrayBuffer (NÃO base64) ============
  const buildExcelArrayBuffer = useCallback(() => {
    // Dados (sem imagem)
    const rows = pecasCriticas.map((p) => ({
      id: p.id,
      nome: p.nome,
      marca: p.marca ?? '',
      modelo: p.modelo ?? '',
      codigo: p.codigo,
      quantidade: p.quantidade,
      estoqueMin: p.estoqueMin,
      estoqueMax: p.estoqueMax ?? '',
      qtdParaPedir: p.qtdParaPedir,
    }));

    const headerOrder = [
      'id',
      'nome',
      'marca',
      'modelo',
      'codigo',
      'quantidade',
      'estoqueMin',
      'estoqueMax',
      'qtdParaPedir',
    ] as const;

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: headerOrder as unknown as string[],
    });

    (ws as any)['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    // Linha de total ao final
    const startRange = XLSX.utils.decode_range(ws['!ref'] as string);
    const lastDataRow = startRange.s.r + rows.length;
    const totalLabelCell = XLSX.utils.encode_cell({ r: lastDataRow + 1, c: 0 }); // A...
    const totalValueCell = XLSX.utils.encode_cell({ r: lastDataRow + 1, c: 8 }); // I...
    ws[totalLabelCell] = { t: 's', v: 'TOTAL Qtd para pedir' };
    ws[totalValueCell] = { t: 'n', v: totalQtdParaPedir };
    const newRef = XLSX.utils.encode_range(
      startRange.s,
      { r: lastDataRow + 1, c: startRange.e.c }
    );
    (ws as any)['!ref'] = newRef;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças Críticas');

    // ⚠️ Importante: gerar como ArrayBuffer para escrever bytes no novo FileSystem
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const fileName = `pedido-pecas_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
    return { arrayBuffer, fileName };
  }, [pecasCriticas, totalQtdParaPedir]);
  // =======================================================================

  // 1) Exportar/Compartilhar (sandbox do app) — API moderna
  const handleExportExcel = useCallback(async () => {
    try {
      if (!pecasCriticas.length) {
        Alert.alert('Nada a exportar', 'Não há peças em quantidade igual ou inferior ao estoque mínimo.');
        return;
      }
      setExporting(true);

      const { arrayBuffer, fileName } = buildExcelArrayBuffer();

      // Cria pasta no cache e o arquivo dentro dela (API nova)
      const outDir = new Directory(Paths.cache, 'exports');
      outDir.create(); // sem opções; 'recursive' não é suportado pela tipagem atual

      const outFile = outDir.createFile(
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Grava o conteúdo como bytes (Uint8Array). File.write é SÍNCRONO. [1](https://docs.expo.dev/versions/latest/sdk/filesystem/)
      const bytes = new Uint8Array(arrayBuffer);
      outFile.write(bytes);

      // Compartilha (iOS/Android)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outFile.uri, {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          UTI: 'com.microsoft.excel.xlsx',
          dialogTitle: 'Exportar planilha de peças críticas',
        });
      } else {
        Alert.alert('Arquivo salvo', `Planilha salva no app.\nCaminho: ${outFile.uri}`);
      }
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Falha ao criar o arquivo.');
    } finally {
      setExporting(false);
    }
  }, [pecasCriticas, buildExcelArrayBuffer]);

  // 2) Salvar em Downloads (Android) — API moderna
  const handleSaveToDownloads = useCallback(async () => {
    try {
      if (!pecasCriticas.length) {
        Alert.alert('Nada a salvar', 'Não há peças em quantidade igual ou inferior ao estoque mínimo.');
        return;
      }
      if (Platform.OS !== 'android') {
        // Em iOS, não há “Downloads” do sistema; use compartilhar/Files.
        await handleExportExcel();
        return;
      }

      setExporting(true);

      const { arrayBuffer, fileName } = buildExcelArrayBuffer();

      // Abre o seletor de diretório do Android (API nova). Parâmetro é opcional e deve ser um URI.
      const picked = await Directory.pickDirectoryAsync(); // sem "Downloads" literal
      if (!picked) throw new Error('Nenhuma pasta selecionada.');

      // Cria o arquivo dentro da pasta escolhida (apenas 2 args)
      const outFile = picked.createFile(
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Escreve bytes
      const bytes = new Uint8Array(arrayBuffer);
      outFile.write(bytes);

      Alert.alert('Sucesso', 'Planilha salva com sucesso na pasta escolhida.');
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e?.message ?? 'Não foi possível salvar em Downloads.');
    } finally {
      setExporting(false);
    }
  }, [pecasCriticas, buildExcelArrayBuffer, handleExportExcel]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Carregando peças…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Peças para Pedido</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.btn, (!pecasCriticas.length || exporting) && styles.btnDisabled]}
            onPress={handleExportExcel}
            disabled={!pecasCriticas.length || exporting}
          >
            <Text style={styles.btnText}>{exporting ? 'Gerando…' : 'Gerar Excel'}</Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={[styles.btnAlt, (!pecasCriticas.length || exporting) && styles.btnDisabled]}
              onPress={handleSaveToDownloads}
              disabled={!pecasCriticas.length || exporting}
            >
              <Text style={styles.btnAltText}>
                {exporting ? 'Salvando…' : 'Salvar em Downloads'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={[styles.btn, styles.btnOutline]}>
            <Text style={[styles.btnText, styles.btnOutlineText]}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.subtitle}>
        {totalItensCriticos
          ? `${totalItensCriticos} peça(s) com estoque ≤ mínimo • Total a pedir: ${totalQtdParaPedir}`
          : 'Nenhuma peça com estoque igual ou abaixo do mínimo.'}
      </Text>

      <FlatList
        data={pecasCriticas}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Tudo certo! Não há peças críticas no momento.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.nome}</Text>

              <Text style={styles.cardLine}>
                <Text style={styles.label}>Código: </Text>
                {item.codigo}
              </Text>

              {!!item.marca && (
                <Text style={styles.cardLine}>
                  <Text style={styles.label}>Marca: </Text>
                  {item.marca}
                </Text>
              )}

              {!!item.modelo && (
                <Text style={styles.cardLine}>
                  <Text style={styles.label}>Modelo: </Text>
                  {item.modelo}
                </Text>
              )}

              <Text style={styles.cardLine}>
                <Text style={styles.label}>Estoque atual: </Text>
                {item.quantidade}{' '}
                <Text style={styles.label}>| Mínimo: </Text>
                {item.estoqueMin}
                {item.estoqueMax != null && (
                  <>
                    {' '}
                    <Text style={styles.label}>| Máximo: </Text>
                    {item.estoqueMax}
                  </>
                )}
              </Text>

              <Text style={[styles.cardLine, styles.toOrder]}>
                <Text style={styles.toOrderLabel}>Qtd para pedir: </Text>
                {item.qtdParaPedir}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { paddingHorizontal: 16, paddingBottom: 8, color: '#444' },

  btn: {
    backgroundColor: '#0B5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },

  // Botão alternativo (Downloads)
  btnAlt: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0B5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnAltText: { color: '#0B5', fontWeight: '700' },

  btnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0B5',
    marginTop: 8,
  },
  btnOutlineText: { color: '#0B5' },

  errorBox: {
    backgroundColor: '#fee',
    borderColor: '#f88',
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#b00' },

  emptyBox: { alignItems: 'center', padding: 24 },
  muted: { color: '#777' },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardLine: { color: '#333' },
  label: { color: '#666', fontWeight: '600' },

  // Destaque para "Qtd para pedir"
  toOrder: { color: '#0a5', fontWeight: '700', marginTop: 4 },
  toOrderLabel: { color: '#0a5', fontWeight: '900' },
});