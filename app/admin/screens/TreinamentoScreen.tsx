// app/admin/screens/TreinamentoScreen.tsx
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ⚠️ Ajuste estes caminhos se sua estrutura for diferente
import { TRAINING_ENDPOINTS } from '../../../src/config';
import { useAuth } from '../../../src/hooks/useAuth';

type Training = { id: number; title: string; description?: string; is_published: number };
type FullTraining = {
  training: Training;
  questions: {
    id: number;
    training_id: number;
    question_text: string;
    image?: string | null;
    is_required: number;
    question_type: string;
    position: number;
    options: { id: number; question_id: number; option_text: string; is_correct: number; position: number }[];
  }[];
};
type AttemptRow = { id: number; technician_uid?: string|null; technician_email?: string|null; started_at: string; submitted_at?: string|null; score_percent?: number|null };

type QuestionDraft = {
  localId: string;
  question_text: string;
  is_required: boolean;
  imageUri?: string | null;
  options: { localId: string; option_text: string; is_correct: boolean }[];
};

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function TreinamentoScreen() {
  const [mode, setMode] = useState<'menu'|'add'|'list'|'export'|'edit'>('menu');
  const [editId, setEditId] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      {mode === 'menu' && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Treinamentos</Text>

          {/* MENU: Empilhado (vertical) */}
          <ButtonStack>
            <PrimaryButton label="Adicionar treinamento" onPress={() => setMode('add')} />
            <PrimaryButton label="Ver treinamentos" onPress={() => setMode('list')} />
            <PrimaryButton label="Extrair dados" onPress={() => setMode('export')} />
          </ButtonStack>
        </ScrollView>
      )}

      {mode === 'add' && <AddTraining onBack={() => setMode('menu')} />}
      {mode === 'list' && <ListTrainings onBack={() => setMode('menu')} onEdit={(id) => { setEditId(id); setMode('edit'); }} />}
      {mode === 'export' && <ExportTrainings onBack={() => setMode('menu')} />}
      {mode === 'edit' && editId != null && <EditTraining trainingId={editId} onBack={() => setMode('list')} />}
    </View>
  );
}

/* =========================================================================================
 * ADICIONAR TREINAMENTO (construtor) — permanece como antes, com botões empilhados
 * =======================================================================================*/
function AddTraining({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions(qs => ([
      ...qs,
      {
        localId: `${Date.now()}-${Math.random()}`,
        question_text: '',
        is_required: true,
        imageUri: null,
        options: [
          { localId: `${Date.now()}-o1`, option_text: '', is_correct: false },
          { localId: `${Date.now()}-o2`, option_text: '', is_correct: false },
        ]
      }
    ]));
  };

  const pickImage = async (qLocalId: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setQuestions(qs => qs.map(q => q.localId === qLocalId ? ({ ...q, imageUri: res.assets[0].uri }) : q));
    }
  };

  const toggleCorrect = (qLocalId: string, optLocalId: string) => {
    setQuestions(qs => qs.map(q => {
      if (q.localId !== qLocalId) return q;
      const newOpts = q.options.map(o => ({ ...o, is_correct: o.localId === optLocalId }));
      return { ...q, options: newOpts };
    }));
  };

  const addOption = (qLocalId: string) => {
    setQuestions(qs => qs.map(q => q.localId === qLocalId ? ({
      ...q,
      options: [...q.options, { localId: `${Date.now()}-${Math.random()}`, option_text: '', is_correct: false }]
    }) : q));
  };

  const removeOption = (qLocalId: string, optLocalId: string) => {
    setQuestions(qs => qs.map(q => q.localId === qLocalId ? ({
      ...q,
      options: q.options.filter(o => o.localId !== optLocalId)
    }) : q));
  };

  const removeQuestion = (qLocalId: string) => {
    setQuestions(qs => qs.filter(q => q.localId !== qLocalId));
  };

  const finalize = async () => {
    if (!title.trim()) return Alert.alert('Validação', 'Informe o título do treinamento.');
    if (questions.length === 0) return Alert.alert('Validação', 'Adicione ao menos uma pergunta.');
    for (const q of questions) {
      if (!q.question_text.trim()) return Alert.alert('Validação', 'Preencha o texto de todas as perguntas.');
      if (q.options.length < 2) return Alert.alert('Validação', 'Cada pergunta deve ter ao menos 2 opções.');
      if (!q.options.some(o => o.is_correct)) return Alert.alert('Validação', 'Marque uma opção como correta em cada pergunta.');
      if (q.options.some(o => !o.option_text.trim())) return Alert.alert('Validação', 'Preencha o texto de todas as opções.');
    }

    try {
      setSaving(true);
      const tRes = await fetch(TRAINING_ENDPOINTS.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ title, description: desc, is_published: false, created_by: 'admin' })
      });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson?.error ?? 'Falha ao criar treinamento');
      const trainingId = tJson.id as number;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const fd = new FormData();
        fd.append('question_text', q.question_text);
        fd.append('is_required', String(q.is_required ? 1 : 0));
        fd.append('question_type', 'multiple_choice');
        fd.append('position', String(i));
        if (q.imageUri) {
          const name = q.imageUri.split('/').pop() ?? `q${i}.jpg`;
          // @ts-ignore
          fd.append('imagem', { uri: q.imageUri, name, type: 'image/jpeg' });
        }
        const qRes = await fetch(TRAINING_ENDPOINTS.questions(trainingId), {
          method: 'POST',
          headers: { Accept: 'application/json', ...authHeaders(token) },
          body: fd
        });
        const qJson = await qRes.json();
        if (!qRes.ok) throw new Error(qJson?.error ?? 'Falha ao criar pergunta');
        const questionId = qJson.id as number;

        for (let j = 0; j < q.options.length; j++) {
          const o = q.options[j];
          const oRes = await fetch(TRAINING_ENDPOINTS.options(questionId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ option_text: o.option_text, is_correct: o.is_correct ? 1 : 0, position: j })
          });
          const oJson = await oRes.json();
          if (!oRes.ok) throw new Error(oJson?.error ?? 'Falha ao criar opção');
        }
      }

      const pubRes = await fetch(TRAINING_ENDPOINTS.byId(trainingId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ is_published: true })
      });
      const pubJson = await pubRes.json();
      if (!pubRes.ok) throw new Error(pubJson?.error ?? 'Falha ao publicar');

      Alert.alert('Sucesso', 'Questionário finalizado e publicado!');
      onBack();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Adicionar treinamento</Text>

      <TextInput style={styles.input} placeholder="Título" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, {height: 80}]} placeholder="Descrição" value={desc} onChangeText={setDesc} multiline />

      <ButtonStack>
        <PrimaryButton label="Adicionar pergunta" onPress={addQuestion} />
        <SecondaryButton label="Voltar" onPress={onBack} />
      </ButtonStack>

      {questions.map((q, idx) => (
        <View key={q.localId} style={styles.card}>
          <Text style={styles.subtitle}>Pergunta {idx + 1}</Text>

          <TextInput
            style={styles.input}
            placeholder="Texto da pergunta"
            value={q.question_text}
            onChangeText={(t) => setQuestions(qs => qs.map(q0 => q0.localId === q.localId ? ({ ...q0, question_text: t }) : q0))}
          />

          {/* Lateral nesta seção */}
          <View style={styles.rowWrap}>
            <TouchableOpacity
              style={[styles.toggle, styles.flexItem]}
              onPress={() => setQuestions(qs => qs.map(q0 => q0.localId === q.localId ? ({ ...q0, is_required: !q0.is_required }) : q0))}
            >
              <Text style={styles.toggleText}>{q.is_required ? 'Obrigatória ✔' : 'Opcional'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonSm, styles.flexItem]} onPress={() => pickImage(q.localId)}>
              <Text style={styles.buttonText}>Imagem (opcional)</Text>
            </TouchableOpacity>
          </View>

          {q.imageUri ? (
            <Image source={{ uri: q.imageUri }} style={{ width: '100%', height: 160, marginTop: 8, borderRadius: 8 }} />
          ) : null}

          <View style={{ marginTop: 12 }}>
            {q.options.map((o, j) => (
              <View key={o.localId} style={{ marginBottom: 8 }}>
                <TextInput
                  style={styles.input}
                  placeholder={`Opção ${j + 1}`}
                  value={o.option_text}
                  onChangeText={(t) => setQuestions(qs => qs.map(q0 => q0.localId === q.localId ? ({
                    ...q0,
                    options: q0.options.map(oo => oo.localId === o.localId ? ({ ...oo, option_text: t }) : oo)
                  }) : q0))}
                />
                {/* Lateral nesta seção */}
                <View style={styles.rowWrap}>
                  <TouchableOpacity
                    style={[styles.buttonSm, styles.flexItem, o.is_correct && { backgroundColor: '#2e7d32' }]}
                    onPress={() => toggleCorrect(q.localId, o.localId)}
                  >
                    <Text style={styles.buttonText}>{o.is_correct ? 'Correta ✔' : 'Marcar correta'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.buttonSmDel, styles.flexItem]}
                    onPress={() => removeOption(q.localId, o.localId)}
                  >
                    <Text style={styles.buttonText}>Excluir opção</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <PrimaryButton label="Adicionar opção" onPress={() => addOption(q.localId)} />
          </View>

          <TouchableOpacity style={[styles.buttonDel, { marginTop: 10 }]} onPress={() => removeQuestion(q.localId)}>
            <Text style={styles.buttonText}>Remover pergunta</Text>
          </TouchableOpacity>
        </View>
      ))}

      <ButtonStack>
        <SecondaryButton label="Cancelar" onPress={onBack} />
        <TouchableOpacity style={[styles.button, { backgroundColor: '#1976d2' }]} onPress={finalize} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Finalizar questionário</Text>}
        </TouchableOpacity>
      </ButtonStack>
    </ScrollView>
  );
}

/* =========================================================================================
 * LISTAR TREINAMENTOS — agora com botão "Editar" que abre o modo 'edit'
 * =======================================================================================*/
function ListTrainings({ onBack, onEdit }: { onBack: () => void; onEdit: (id: number) => void }) {
  const { token } = useAuth();
  const [items, setItems] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempts, setSelectedAttempts] = useState<{ trainingId: number; attempts: AttemptRow[] } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(TRAINING_ENDPOINTS.base, { headers: { ...authHeaders(token) } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao listar');
      setItems(json.trainings ?? []);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const del = async (id: number) => {
    Alert.alert('Confirmação', 'Deseja excluir este treinamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(TRAINING_ENDPOINTS.byId(id), { method: 'DELETE', headers: { ...authHeaders(token) } });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? 'Falha ao excluir');
          await load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Falha ao excluir');
        }
      } }
    ]);
  };

  const togglePublish = async (id: number, isPublished: number) => {
    try {
      const res = await fetch(TRAINING_ENDPOINTS.byId(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ is_published: isPublished ? 0 : 1 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao atualizar');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao publicar/despublicar');
    }
  };

  const openNotes = async (id: number) => {
    try {
      const res = await fetch(TRAINING_ENDPOINTS.attempts(id), { headers: { ...authHeaders(token) } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao listar notas');
      setSelectedAttempts({ trainingId: id, attempts: json.attempts ?? [] });
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao listar notas');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ver treinamentos</Text>

        <ButtonStack>
          <SecondaryButton label="Voltar" onPress={onBack} />
        </ButtonStack>

        {loading ? <ActivityIndicator /> : (
          <>
            {items.map(t => (
              <View key={t.id} style={styles.card}>
                <Text style={styles.subtitle}>{t.title}</Text>
                {!!t.description && <Text style={{ color: '#555', marginBottom: 8 }}>{t.description}</Text>}

                <ButtonStack>
                  <TouchableOpacity style={styles.buttonSm} onPress={() => onEdit(t.id)}>
                    <Text style={styles.buttonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonSm} onPress={() => togglePublish(t.id, t.is_published)}>
                    <Text style={styles.buttonText}>{t.is_published ? 'Despublicar' : 'Publicar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonSm} onPress={() => openNotes(t.id)}>
                    <Text style={styles.buttonText}>Ver notas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.buttonSmDel} onPress={() => del(t.id)}>
                    <Text style={styles.buttonText}>Excluir</Text>
                  </TouchableOpacity>
                </ButtonStack>
              </View>
            ))}

            {selectedAttempts && (
              <View style={styles.card}>
                <Text style={styles.subtitle}>Notas — Treinamento #{selectedAttempts.trainingId}</Text>
                {selectedAttempts.attempts.length === 0 ? (
                  <Text style={{ color: '#555' }}>Nenhuma tentativa ainda.</Text>
                ) : selectedAttempts.attempts.map(a => (
                  <View key={a.id} style={{ marginBottom: 8 }}>
                    <Text>
                      #{a.id} • {a.technician_email ?? a.technician_uid ?? '(sem id)'}
                      {'\n'}Início: {a.started_at} • Envio: {a.submitted_at ?? '—'}
                    </Text>
                    <Text style={{ fontWeight: 'bold' }}>{a.score_percent != null ? `${Number(a.score_percent).toFixed(2)}%` : '—'}</Text>
                  </View>
                ))}

                <ButtonStack>
                  <PrimaryButton label="Fechar notas" onPress={() => setSelectedAttempts(null)} />
                </ButtonStack>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================================================
 * EDITAR TREINAMENTO — com botões “na lateral” dentro da edição de perguntas/opções
 * =======================================================================================*/
function EditTraining({ trainingId, onBack }: { trainingId: number; onBack: () => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<FullTraining | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingT, setSavingT] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(TRAINING_ENDPOINTS.full(trainingId), { headers: { ...authHeaders(token) } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Falha ao carregar treinamento');
      setData(json as FullTraining);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao carregar treinamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [trainingId, token]);

  const updateTrainingMeta = async (patch: Partial<Training>) => {
    if (!data) return;
    try {
      setSavingT(true);
      const res = await fetch(TRAINING_ENDPOINTS.byId(data.training.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(patch)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Falha ao salvar treinamento');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar treinamento');
    } finally {
      setSavingT(false);
    }
  };

  const addQuestion = async () => {
    if (!data) return;
    try {
      const fd = new FormData();
      fd.append('question_text', 'Nova pergunta');
      fd.append('is_required', '1');
      fd.append('question_type', 'multiple_choice');
      fd.append('position', String(data.questions.length));

      const res = await fetch(TRAINING_ENDPOINTS.questions(data.training.id), {
        method: 'POST',
        headers: { Accept: 'application/json', ...authHeaders(token) },
        body: fd
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Falha ao adicionar pergunta');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao adicionar pergunta');
    }
  };

  const saveQuestion = async (qId: number, body: { question_text?: string; is_required?: number; position?: number; removeImage?: '1' }, imageUri?: string | null) => {
    try {
      const fd = new FormData();
      if (body.question_text !== undefined) fd.append('question_text', body.question_text);
      if (body.is_required !== undefined) fd.append('is_required', String(body.is_required));
      if (body.position !== undefined) fd.append('position', String(body.position));
      if (body.removeImage === '1') fd.append('removeImage', '1');
      if (imageUri) {
        const name = imageUri.split('/').pop() ?? `q_${qId}.jpg`;
        // @ts-ignore
        fd.append('imagem', { uri: imageUri, name, type: 'image/jpeg' });
      }
      const res = await fetch(TRAINING_ENDPOINTS.question(qId), {
        method: 'PUT',
        headers: { Accept: 'application/json', ...authHeaders(token) },
        body: fd
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Falha ao salvar pergunta');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar pergunta');
    }
  };

  const deleteQuestion = async (qId: number) => {
    Alert.alert('Confirmação', 'Excluir esta pergunta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(TRAINING_ENDPOINTS.question(qId), { method: 'DELETE', headers: { ...authHeaders(token) } });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error ?? 'Falha ao excluir pergunta');
          await load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Falha ao excluir pergunta');
        }
      } }
    ]);
  };

  const addOption = async (qId: number) => {
    try {
      const res = await fetch(TRAINING_ENDPOINTS.options(qId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ option_text: 'Nova opção', is_correct: 0, position: 99 })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Falha ao adicionar opção');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao adicionar opção');
    }
  };

  const updateOption = async (optId: number, patch: { option_text?: string; is_correct?: number; position?: number }) => {
    try {
      const res = await fetch(TRAINING_ENDPOINTS.option(optId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify(patch)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Falha ao salvar opção');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar opção');
    }
  };

  const deleteOption = async (optId: number) => {
    Alert.alert('Confirmação', 'Excluir esta opção?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(TRAINING_ENDPOINTS.option(optId), { method: 'DELETE', headers: { ...authHeaders(token) } });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error ?? 'Falha ao excluir opção');
          await load();
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Falha ao excluir opção');
        }
      } }
    ]);
  };

  const pickImage = async (qId: number) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await saveQuestion(qId, {}, res.assets[0].uri);
    }
  };

  const removeImage = async (qId: number) => {
    await saveQuestion(qId, { removeImage: '1' }, null);
  };

  if (loading || !data) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  const t = data.training;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Editar treinamento #{t.id}</Text>

      {/* META DO TREINAMENTO */}
      <TextInput
        style={styles.input}
        placeholder="Título"
        defaultValue={t.title}
        onEndEditing={(e) => updateTrainingMeta({ title: e.nativeEvent.text })}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Descrição"
        defaultValue={t.description ?? ''}
        multiline
        onEndEditing={(e) => updateTrainingMeta({ description: e.nativeEvent.text })}
      />

      <ButtonStack>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.is_published ? '#c62828' : '#2e7d32' }]}
          onPress={() => updateTrainingMeta({ is_published: t.is_published ? 0 : 1 })}
          disabled={savingT}
        >
          <Text style={styles.buttonText}>{t.is_published ? 'Despublicar' : 'Publicar'}</Text>
        </TouchableOpacity>
        <SecondaryButton label="Voltar" onPress={onBack} />
      </ButtonStack>

      {/* PERGUNTAS */}
      <PrimaryButton label="Adicionar pergunta" onPress={addQuestion} />

      {data.questions.map((q, idx) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.subtitle}>Pergunta {idx + 1}</Text>

          <TextInput
            style={styles.input}
            placeholder="Texto da pergunta"
            defaultValue={q.question_text}
            onEndEditing={(e) => saveQuestion(q.id, { question_text: e.nativeEvent.text })}
          />

          {/* LATERAL: obrigatória + imagem */}
          <View style={styles.rowWrap}>
            <TouchableOpacity
              style={[styles.toggle, styles.flexItem]}
              onPress={() => saveQuestion(q.id, { is_required: q.is_required ? 0 : 1 })}
            >
              <Text style={styles.toggleText}>{q.is_required ? 'Obrigatória ✔' : 'Opcional'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonSm, styles.flexItem]} onPress={() => pickImage(q.id)}>
              <Text style={styles.buttonText}>Imagem (opcional)</Text>
            </TouchableOpacity>
          </View>

          {q.image ? (
            <View>
              <Image source={{ uri: q.image }} style={{ width: '100%', height: 160, marginTop: 8, borderRadius: 8 }} />
              <TouchableOpacity style={[styles.buttonSmDel, { marginTop: 8 }]} onPress={() => removeImage(q.id)}>
                <Text style={styles.buttonText}>Remover imagem</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* OPÇÕES */}
          <View style={{ marginTop: 12 }}>
            {q.options.map((o, j) => (
              <View key={o.id} style={{ marginBottom: 8 }}>
                <TextInput
                  style={styles.input}
                  placeholder={`Opção ${j + 1}`}
                  defaultValue={o.option_text}
                  onEndEditing={(e) => updateOption(o.id, { option_text: e.nativeEvent.text })}
                />

                {/* Lateral: marcar correta + excluir */}
                <View style={styles.rowWrap}>
                  <TouchableOpacity
                    style={[styles.buttonSm, styles.flexItem, o.is_correct ? { backgroundColor: '#2e7d32' } : null]}
                    onPress={() => updateOption(o.id, { is_correct: o.is_correct ? 0 : 1 })}
                  >
                    <Text style={styles.buttonText}>{o.is_correct ? 'Correta ✔' : 'Marcar correta'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.buttonSmDel, styles.flexItem]}
                    onPress={() => deleteOption(o.id)}
                  >
                    <Text style={styles.buttonText}>Excluir opção</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <PrimaryButton label="Adicionar opção" onPress={() => addOption(q.id)} />
          </View>

          <TouchableOpacity style={[styles.buttonDel, { marginTop: 10 }]} onPress={() => deleteQuestion(q.id)}>
            <Text style={styles.buttonText}>Remover pergunta</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

/* =========================================================================================
 * EXPORTAÇÃO — permanece igual
 * =======================================================================================*/
function ExportTrainings({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const exportCsv = async () => {
    try {
      setDownloading(true);
      const res = await fetch(TRAINING_ENDPOINTS.exportCsv, { method: 'GET', headers: { ...authHeaders(token) } });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Falha ao exportar');
      }
      const csv = await res.text();
      Alert.alert('Exportação pronta', 'CSV gerado. Conteúdo foi impresso no console para testes.');
      console.log('CSV:\n', csv);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao exportar');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Extrair dados de treinamentos</Text>
      <ButtonStack>
        <SecondaryButton label="Voltar" onPress={onBack} />
        <TouchableOpacity style={[styles.button, { backgroundColor: '#1976d2' }]} onPress={exportCsv} disabled={downloading}>
          {downloading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Exportar para CSV</Text>}
        </TouchableOpacity>
      </ButtonStack>
      <Text style={{ marginTop: 12, color: '#555' }}>
        O CSV inclui: TrainingID, Title, AttemptID, TechnicianUID, TechnicianEmail, StartedAt, SubmittedAt, ScorePercent.
      </Text>
    </ScrollView>
  );
}

/** UI helpers reutilizáveis */
function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.button} onPress={onPress}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
}
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.buttonSec} onPress={onPress}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
}
function ButtonStack({ children }: { children: React.ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

/** Estilos */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scroll: { paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },

  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', marginVertical: 6
  },

  // Botões principais empilhados
  button: { backgroundColor: '#4a148c', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonSec: { backgroundColor: '#757575', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonSm: { backgroundColor: '#4a148c', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonSmDel: { backgroundColor: '#c62828', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonDel: { backgroundColor: '#b71c1c', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginVertical: 8, backgroundColor: '#fafafa' },

  // “Obrigatória” como chip cinza
  toggle: { backgroundColor: '#eee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginVertical: 6 },
  toggleText: { color: '#333', fontWeight: '600' },

  // Empilhamento padrão
  stack: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' },

  // >>> Lateral nas seções de edição
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  flexItem: {
    flexGrow: 1,
    flexBasis: '48%',
  },
});