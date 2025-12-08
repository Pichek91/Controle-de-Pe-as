
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE = 'https://api.grancoffeepecas.com.br';

async function getToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return await user.getIdToken(true);
}

type UserItem = {
  uid: string;
  email: string | null;
  role?: 'admin' | 'tecnico' | null;
  displayName?: string | null;
};

export default function CadastroUsuario() {
  const [displayName, setDisplayName] = useState(''); // NOVO: nome completo
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'tecnico'>('tecnico');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'admin' | 'tecnico'>('all');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'tecnico'>('tecnico');

  useEffect(() => {
    loadUsers(true);
  }, [filter]);

  async function createUser() {
    try {
      if (!email || !password) {
        Alert.alert('Atenção', 'Informe e-mail e senha.');
        return;
      }
      setCreating(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, displayName }), // envia displayName
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Erro ao criar usuário');
        throw new Error(msg);
      }
      await res.json();
      // limpa campos
      setDisplayName('');
      setEmail('');
      setPassword('');
      setRole('tecnico');
      // reseta paginação e recarrega
      setNextPageToken(null);
      await loadUsers(true);
      Alert.alert('Sucesso', 'Usuário criado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCreating(false);
    }
  }

  async function loadUsers(reset = false) {
    try {
      setLoading(true);
      const token = await getToken();
      const url = new URL(`${API_BASE}/admin/users`);
      url.searchParams.set('role', filter);
      url.searchParams.set('limit', '50');
      if (!reset && nextPageToken) url.searchParams.set('pageToken', nextPageToken);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erro ao listar usuários');
      const data = await res.json();
      const newUsers: UserItem[] = Array.isArray(data?.users) ? data.users : [];
      setNextPageToken(data?.nextPageToken ?? null);
      setUsers(reset ? newUsers : [...users, ...newUsers]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(uid: string) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar tipo');
      await res.json();
      setUsers(users.map(u => (u.uid === uid ? { ...u, role: editRole } : u)));
      setEditVisible(false);
      Alert.alert('Sucesso', 'Tipo atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  function confirmDelete(uid: string) {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteUser(uid) },
      ],
    );
  }

  async function deleteUser(uid: string) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir usuário');
      await res.json();
      setUsers(users.filter(u => u.uid !== uid));
      Alert.alert('Sucesso', 'Usuário excluído.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro de Usuário</Text>

      {/* Nome completo */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: João da Silva"
          value={displayName}
          onChangeText={setDisplayName}
        />
      </View>

      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      </View>

      {/* Senha */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Senha</Text>
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
      </View>

      {/* Tipo */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.roleRow}>
          <Pressable style={[styles.roleBtn, role === 'tecnico' && styles.roleBtnActive]} onPress={() => setRole('tecnico')}>
            <Text>Técnico</Text>
          </Pressable>
          <Pressable style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]} onPress={() => setRole('admin')}>
            <Text>Admin</Text>
          </Pressable>
        </View>
      </View>

      <Button title={creating ? 'Criando...' : 'Criar usuário'} onPress={createUser} disabled={creating} />

      {/* Filtros */}
      <View style={styles.filterRow}>
        {['all', 'admin', 'tecnico'].map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f as 'all' | 'admin' | 'tecnico')}
          >
            <Text style={{ color: filter === f ? '#fff' : '#333' }}>
              {f === 'all' ? 'Todos' : f === 'admin' ? 'Admin' : 'Técnico'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Header lista */}
      <View style={styles.listHeader}>
        <Text style={styles.title}>Usuários</Text>
        <Pressable onPress={() => { setNextPageToken(null); loadUsers(true); }} style={styles.refreshBtn}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Atualizar</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading && users.length === 0 ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  {item.displayName ? (
                    <Text style={[styles.itemEmail, { fontWeight: '700' }]}>{item.displayName}</Text>
                  ) : null}
                  <Text style={styles.itemEmail}>{item.email ?? '(sem e-mail)'}</Text>
                  <Text style={styles.itemRole}>Tipo: {item.role ?? 'não definido'}</Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => { setEditUser(item); setEditRole(item.role ?? 'tecnico'); setEditVisible(true); }}
                  >
                    <Ionicons name="pencil" size={20} color="#444" />
                  </Pressable>
                  <Pressable style={[styles.iconBtn, styles.deleteBtn]} onPress={() => confirmDelete(item.uid)}>
                    <Ionicons name="trash" size={20} color="#c62828" />
                  </Pressable>
                </View>
              </View>
            )}
          />

          {/* Paginação */}
          {nextPageToken && (
            <Pressable style={styles.loadMoreBtn} onPress={() => loadUsers(false)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Carregar mais</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Modal editar role */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Tipo</Text>
            <View style={styles.roleRow}>
              <Pressable style={[styles.roleBtn, editRole === 'tecnico' && styles.roleBtnActive]} onPress={() => setEditRole('tecnico')}>
                <Text>Técnico</Text>
              </Pressable>
              <Pressable style={[styles.roleBtn, editRole === 'admin' && styles.roleBtnActive]} onPress={() => setEditRole('admin')}>
                <Text>Admin</Text>
              </Pressable>
            </View>
            <Button title="Salvar" onPress={() => editUser && updateRole(editUser.uid)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 14, color: '#555', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, backgroundColor: '#fff' },

  roleRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  roleBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8f8f8' },
  roleBtnActive: { backgroundColor: '#e8f0ff', borderColor: '#6c63ff' },

  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  filterChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  filterChipActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  refreshBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  itemLeft: { flexDirection: 'column', gap: 4, flexShrink: 1 },
  itemEmail: { fontSize: 15, color: '#222' },
  itemRole: { fontSize: 13, color: '#666' },

  itemActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  deleteBtn: { borderColor: '#ffcdd2', backgroundColor: '#fff' },

  loadMoreBtn: { marginTop: 12, backgroundColor: '#6c63ff', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, width: '90%' },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
});
