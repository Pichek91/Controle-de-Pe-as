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
  quantidade: number; // estoque atual
  estoqueMin: number;
  estoqueMax?: number | null;
  imagem?: string | null; // URL absoluta (não será exportada)
};

// Item com campos derivados para exibição/ordenar
type ItemCritico = Peca & {
  deficit: number;      // quantidade - estoqueMin (<= 0)
  qtdParaPedir: number; // Math.max(estoqueMin - quantidade, 0)
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.grancoffeepecas.com.br';
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
        throw new Error(
          `Erro ao carregar peças (${res.status}): ${JSON.stringify(body)}`
        );
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
          r.estoqueMax != null && isFinite(r.estoqueMax)
            ? Number(r.estoqueMax)
            : null,
        imagem: r.imagem ?? null,
      }));

      setPecas(sane);
    } catch (e: any) {
      if (e.name === 'AbortError')
        setError('Tempo de resposta excedido. Tente novamente.');
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

  // ============ Builder de planilha → Uint8Array (recomendado em RN) ============
  const buildExcelBytes = useCallback(() => {
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
    (ws as any)[totalLabelCell] = { t: 's', v: 'TOTAL Qtd para pedir' };
    (ws as any)[totalValueCell] = { t: 'n', v: totalQtdParaPedir };

    (ws as any)['!ref'] = XLSX.utils.encode_range(
      startRange.s,
      { r: lastDataRow + 1, c: startRange.e.c }
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças Críticas');

    // ⚠️ Importante: gerar como Uint8Array (type: 'buffer') e gravar direto
    const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;

    // Nome seguro (sem ':' e '.')
    const safeStamp = new Date().toISOString().replace(/[.:]/g, '-');
    const fileName = `pedido-pecas_${safeStamp}.xlsx`;

    return { u8, fileName };
  }, [pecasCriticas, totalQtdParaPedir]);

  // =======================================================================
  // 1) Exportar/Compartilhar (sandbox do app) — API moderna
  const handleExportExcel = useCallback(async () => {
    try {
      if (!pecasCriticas.length) {
        Alert.alert(
          'Nada a exportar',
          'Não há peças em quantidade igual ou inferior ao estoque mínimo.'
        );
        return;
      }
      setExporting(true);

      const { u8, fileName } = buildExcelBytes();

      // Cria/garante pasta no cache (idempotente)
      const outDir = new Directory(Paths.cache, 'exports');
      if (!outDir.exists) {
        try {
          outDir.create();
        } catch {
          // Se já existia / sem permissão — ignora
        }
      }

      // Cria o arquivo e escreve bytes
      const outFile = outDir.createFile(
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      outFile.write(u8);

      // Sanity check (tamanho > 0)
      const info = outFile.info();
      if (!info.size || info.size <= 0) {
        throw new Error('Arquivo gerado com tamanho 0B (provável problema de escrita).');
      }

      // Compartilha (iOS/Android)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outFile.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  }, [pecasCriticas, buildExcelBytes]);

  // 2) Salvar em Downloads (Android) — API moderna (SAF)
  const handleSaveToDownloads = useCallback(async () => {
    try {
      if (!pecasCriticas.length) {
        Alert.alert(
          'Nada a salvar',
          'Não há peças em quantidade igual ou inferior ao estoque mínimo.'
        );
        return;
      }
      if (Platform.OS !== 'android') {
        await handleExportExcel(); // Em iOS, use o compartilhamento/Files
        return;
      }

      setExporting(true);

      const { u8, fileName } = buildExcelBytes();

      // Abre o seletor de diretório do Android (SAF)
      const picked = await Directory.pickDirectoryAsync();
      if (!picked) throw new Error('Nenhuma pasta selecionada.');

      // Cria o arquivo dentro da pasta escolhida
      const outFile = picked.createFile(
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      outFile.write(u8);

      const info = outFile.info();
      if (!info.size || info.size <= 0) {
        throw new Error('Arquivo salvo com tamanho 0B.');
      }

      Alert.alert('Sucesso', 'Planilha salva com sucesso na pasta escolhida.');
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e?.message ?? 'Não foi possível salvar em Downloads.');
    } finally {
      setExporting(false);
    }
  }, [pecasCriticas, buildExcelBytes, handleExportExcel]);

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

        {/* ✅ container de botões com wrap (quebra para 2ª linha se faltar espaço) */}
        <View style={styles.actionsWrap}>
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
                <Text style={styles.label}>Mínimo: </Text>
                {item.estoqueMin}
                {item.estoqueMax != null && (
                  <>
                    {' '}
                    <Text style={styles.label}>Máximo: </Text>
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
    gap: 12, // espaço entre o título e o bloco de ações
  },

  // ✅ novo: contêiner dos botões com wrap
  actionsWrap: {
    flexShrink: 1,      // permite encolher para caber ao lado do título
    maxWidth: '100%',   // garante que não ultrapasse a tela
    flexDirection: 'row',
    flexWrap: 'wrap',   // permite quebrar para a 2ª linha
    columnGap: 8,       // espaço horizontal entre botões (RN 0.71+)
    rowGap: 8,          // espaço vertical quando quebrar de linha
    justifyContent: 'flex-end',
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