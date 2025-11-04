// src/services/estoqueCarro.ts
import axios from 'axios';
import { ENDPOINTS } from '../config';

export type CarroItemPayload = {
  ownerUid: string;     // obrigatório (UID do técnico)
  ownerEmail?: string;
  nome: string;         // obrigatório
  marca?: string;
  modelo?: string;
  codigo: string;       // obrigatório
  quantidade?: number;  // default 0 (servidor)
  estoqueMin?: number;  // default 0 (servidor)
  estoqueMax?: number;  // default 0 (servidor)
};

// 1) Cria o item (JSON, sem imagem)
export async function criarItemCarro(payload: CarroItemPayload) {
  return axios.post(ENDPOINTS.estoqueCarro, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  });
}

// 2) Envia/atualiza a foto (multipart, campo 'imagem')
export async function enviarImagemItemCarro(id: number, uri: string) {
  const data = new FormData();
  data.append('imagem', {
    uri,
    name: `carro_${id}.jpg`,
    type: 'image/jpeg',
  } as any);

  return axios.put(`${ENDPOINTS.estoqueCarro}/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
}