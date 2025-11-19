// src/config.ts
import Constants from 'expo-constants';

const extra: any =
  (Constants as any)?.expoConfig ??
  (Constants as any)?.manifest ??
  {};

const ENV: 'prod' | 'dev' = extra?.extra?.env ?? extra?.env ?? 'prod';

// Lê as bases do app.json (extra.apiBaseProd / extra.apiBaseDev)
// Remove barra final (se houver) para evitar // ao concatenar
export const API_BASE: string =
  (ENV === 'prod' ? (extra?.extra?.apiBaseProd ?? extra?.apiBaseProd) : (extra?.extra?.apiBaseDev ?? extra?.apiBaseDev))
    ?.toString()
    ?.replace(/\/+$/, '') || '';

export const ENDPOINTS = {
  // Admin
  pecas: `${API_BASE}/pecas`,

  // Técnico
  estoqueCarro: `${API_BASE}/estoque-carro`,
};

// (Opcional) helper para normalizar URL de imagem relativa
export const toAbsUrl = (rel?: string | null) =>
  !rel ? null : /^https?:\/\//i.test(rel) ? rel : `${API_BASE}${rel.startsWith('/') ? '' : '/'}${rel}`;

// --- ADICIONAR AO FINAL DE src/config.ts ---

// Endpoints de treinamentos (mantém ENDPOINTS existente intacto)
export const TRAINING_ENDPOINTS = {
  base: `${API_BASE}/trainings`,                         // GET/POST /trainings
  byId: (id: number) => `${API_BASE}/trainings/${id}`,   // PUT/DELETE /trainings/:id
  full: (id: number) => `${API_BASE}/trainings/${id}/full`,
  available: `${API_BASE}/trainings/available`,
  questions: (trainingId: number) => `${API_BASE}/trainings/${trainingId}/questions`,
  question: (questionId: number) => `${API_BASE}/training-questions/${questionId}`,
  options: (questionId: number) => `${API_BASE}/training-questions/${questionId}/options`,
  option: (optionId: number) => `${API_BASE}/training-options/${optionId}`,
  start: (trainingId: number) => `${API_BASE}/trainings/${trainingId}/start`,
  submit: (attemptId: number) => `${API_BASE}/training-attempts/${attemptId}/submit`,
  attempts: (trainingId: number) => `${API_BASE}/trainings/${trainingId}/attempts`,
  exportCsv: `${API_BASE}/trainings/export`,
};
