// app/tecnico/screens/TreinamentosScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, Image,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// ⚠️ Ajuste estes caminhos conforme sua árvore de pastas
import { TRAINING_ENDPOINTS, toAbsUrl } from '../../../src/config';
import { useAuth } from '../../../src/hooks/useAuth';

type Training = { id: number; title: string; description?: string };
type Question = {
  id: number;
  question_text: string;
  is_required: number;
  image?: string | null;
  options: { id: number; option_text: string }[];
};
type FullTraining = { training: Training; questions: Question[] };

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function TreinamentosScreen() {
  const { uid, email, token } = useAuth();

  // Listagem de treinamentos publicados
  const [list, setList] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  // Prova em andamento
  const [current, setCurrent] = useState<FullTraining | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> optionId
  const [qIndex, setQIndex] = useState<number>(0); // índice da pergunta atual
  const [inSummary, setInSummary] = useState<boolean>(false); // modo resumo

  // ---------------------------
  // Carregar lista de treinamentos publicados
  // ---------------------------
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(TRAINING_ENDPOINTS.available, { headers: { ...authHeaders(token) } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao listar');
      setList(json.trainings ?? []);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [token]);

  // ---------------------------
  // Abrir um treinamento (pega perguntas + inicia tentativa)
  // ---------------------------
  const open = async (id: number) => {
    try {
      const res = await fetch(TRAINING_ENDPOINTS.full(id), { headers: { ...authHeaders(token) } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao abrir treinamento');

      const sRes = await fetch(TRAINING_ENDPOINTS.start(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ technician_uid: uid, technician_email: email })
      });
      const sJson = await sRes.json();
      if (!sRes.ok) throw new Error(sJson?.error ?? 'Falha ao iniciar tentativa');

      setAttemptId(sJson.attemptId);
      setCurrent(json as FullTraining);
      setAnswers({});
      setQIndex(0);
      setInSummary(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao abrir treinamento');
    }
  };

  // ---------------------------
  // Helpers de UI/Validação
  // ---------------------------
  const total = current?.questions?.length ?? 0;
  const q = useMemo(() => (current && !inSummary ? current.questions[qIndex] : null), [current, inSummary, qIndex]);

  const select = (qid: number, oid: number) => setAnswers(a => ({ ...a, [qid]: oid }));

  const computeMissingQuestions = (): number[] => {
    if (!current) return [];
    const missing: number[] = [];
    current.questions.forEach((qq, idx) => {
      if (!answers[qq.id]) missing.push(idx + 1); // exige TODAS respondidas
    });
    return missing;
  };

  const confirmCurrent = () => {
    if (!current || !q) return;
    // Exigir resposta para todas (como você pediu)
    if (!answers[q.id]) {
      Alert.alert(`Pergunta ${qIndex + 1}`, 'Selecione uma opção para confirmar.');
      return;
    }
    if (qIndex < total - 1) {
      setQIndex(i => i + 1);
    } else {
      // Checou a última -> ir para resumo (validando todas)
      const miss = computeMissingQuestions();
      if (miss.length > 0) {
        Alert.alert('Respostas pendentes',
          `Faltam respostas nas perguntas: ${miss.join(', ')}`);
        return;
      }
      setInSummary(true);
    }
  };

  const goPrev = () => {
    if (!current || inSummary) return;
    setQIndex(i => Math.max(0, i - 1));
  };

  const jumpToQuestion = (index: number) => {
    setInSummary(false);
    setQIndex(Math.max(0, Math.min(index, total - 1)));
  };

  // ---------------------------
  // Enviar ao servidor (com confirmação)
  // ---------------------------
  const submit = async () => {
    if (!attemptId || !current) return;

    // Validação final (todas respondidas)
    const miss = computeMissingQuestions();
    if (miss.length > 0) {
      Alert.alert('Respostas pendentes',
        `Faltam respostas nas perguntas: ${miss.join(', ')}`);
      return;
    }

    Alert.alert(
      'Confirmar envio',
      'Tem certeza que deseja enviar suas respostas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar', style: 'destructive', onPress: async () => {
            try {
              const payload = {
                answers: Object.entries(answers).map(([q, o]) => ({
                  questionId: Number(q),
                  optionId: Number(o),
                }))
              };
              const res = await fetch(TRAINING_ENDPOINTS.submit(attemptId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
                body: JSON.stringify(payload)
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.error ?? 'Falha ao enviar');
              Alert.alert('Resultado', `Sua nota: ${Number(json.score_percent).toFixed(2)}%`);
              // resetar estado e voltar para lista
              setCurrent(null);
              setAttemptId(null);
              setAnswers({});
              setQIndex(0);
              setInSummary(false);
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Falha ao enviar');
            }
          }
        }
      ]
    );
  };

  // ======================================================================================
  // RENDER: Perguntas (uma por vez) OU Resumo
  // ======================================================================================
  if (current) {
    if (inSummary) {
      // --- RESUMO ---
      return (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Resumo — {current.training.title}</Text>

          {current.questions.map((qq, idx) => {
            const selectedId = answers[qq.id];
            const selectedObj = qq.options.find(o => o.id === selectedId);
            return (
              <View key={qq.id} style={styles.card}>
                <Text style={styles.subtitle}>Q{idx + 1}. {qq.question_text}</Text>
                {!!qq.image && (
                  <Image
                    source={{ uri: toAbsUrl(qq.image) || undefined }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                )}
                <Text style={{ marginTop: 6 }}>
                  Sua resposta: <Text style={{ fontWeight: '700' }}>{selectedObj?.option_text ?? '(não respondida)'}</Text>
                </Text>

                {/* Permite voltar direto para editar essa pergunta */}
                <TouchableOpacity style={[styles.buttonSec, { marginTop: 8 }]} onPress={() => jumpToQuestion(idx)}>
                  <Text style={styles.buttonText}>Editar esta resposta</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 8 }} />
          <TouchableOpacity style={[styles.button, { backgroundColor: '#1976d2' }]} onPress={submit}>
            <Text style={styles.buttonText}>Enviar respostas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.buttonSec]} onPress={() => setInSummary(false)}>
            <Text style={styles.buttonText}>Voltar às perguntas</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    // --- UMA PERGUNTA POR VEZ ---
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{current.training.title}</Text>
        <Text style={{ color: '#555', marginBottom: 10 }}>
          Pergunta {qIndex + 1} de {total}
        </Text>

        {q && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>{q.question_text}{q.is_required ? ' *' : ''}</Text>

            {/* Foto da pergunta (se houver) */}
            {!!q.image && (
              <Image
                source={{ uri: toAbsUrl(q.image) || undefined }}
                style={styles.image}
                resizeMode="cover"
              />
            )}

            {/* Opções */}
            <View style={{ marginTop: 8 }}>
              {q.options.map(o => {
                const selected = answers[q.id] === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.option, selected && { backgroundColor: '#1976d2' }]}
                    onPress={() => select(q.id, o.id)}
                  >
                    <Text style={{ color: selected ? '#fff' : '#333' }}>{o.option_text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Ações: confirmar/avançar e voltar */}
        <TouchableOpacity style={[styles.button, { backgroundColor: '#1976d2' }]} onPress={confirmCurrent}>
          <Text style={styles.buttonText}>{qIndex < total - 1 ? 'Confirmar resposta e ir para a próxima' : 'Confirmar resposta e ver resumo'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSec} onPress={goPrev} disabled={qIndex === 0}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSec, { backgroundColor: '#757575' }]}
          onPress={() => {
            Alert.alert('Cancelar prova', 'Deseja cancelar e voltar à lista?', [
              { text: 'Não', style: 'cancel' },
              {
                text: 'Sim', style: 'destructive', onPress: () => {
                  setCurrent(null);
                  setAttemptId(null);
                  setAnswers({});
                  setQIndex(0);
                  setInSummary(false);
                }
              }
            ]);
          }}
        >
          <Text style={styles.buttonText}>Cancelar prova</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ======================================================================================
  // RENDER: Lista de treinamentos publicados
  // ======================================================================================
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Treinamentos disponíveis</Text>
      {loading ? <ActivityIndicator /> : (
        <>
          {list.map(t => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.subtitle}>{t.title}</Text>
              {!!t.description && <Text style={{ color: '#555', marginBottom: 8 }}>{t.description}</Text>}
              <TouchableOpacity style={styles.button} onPress={() => open(t.id)}>
                <Text style={styles.buttonText}>Fazer prova</Text>
              </TouchableOpacity>
            </View>
          ))}
          {list.length === 0 && <Text style={{ color: '#555' }}>Nenhum treinamento publicado.</Text>}
        </>
      )}
    </ScrollView>
  );
}

// ----------------------------------
// Estilos
// ----------------------------------
const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginVertical: 8, backgroundColor: '#fafafa' },
  image: { width: '100%', height: 180, borderRadius: 8, marginTop: 6, backgroundColor: '#ddd' },
  option: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginVertical: 6, backgroundColor: '#fff' },
  button: { backgroundColor: '#4a148c', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonSec: { backgroundColor: '#757575', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
