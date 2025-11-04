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