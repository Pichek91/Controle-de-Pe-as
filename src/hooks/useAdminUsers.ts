
import { getAuth } from 'firebase/auth';

const API_BASE = 'https://api.grancoffeepecas.com.br'; // ajuste para sua URL real

async function getToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return await user.getIdToken(true); // força refresh para pegar claims atualizadas
}

export async function createUser(email: string, password: string, role: 'admin' | 'tecnico') {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, role }),
  });
  if (!res.ok) throw new Error('Erro ao criar usuário');
  return res.json();
}

export async function listUsers(role: 'all' | 'admin' | 'tecnico', pageToken?: string) {
  const token = await getToken();
  const url = new URL(`${API_BASE}/admin/users`);
  url.searchParams.set('role', role);
  url.searchParams.set('limit', '50');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao listar usuários');
  const data = await res.json();
  return data || { users: [], nextPageToken: null };
}

export async function updateRole(uid: string, role: 'admin' | 'tecnico') {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar role');
  return res.json();
}

export async function deleteUser(uid: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao excluir usuário');
  return res.json();
}
