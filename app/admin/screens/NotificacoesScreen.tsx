// app/admin/screens/NotificacoesScreen.tsx
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE } from '../../../src/config'; // ajuste se seu path for diferente

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type?: string;
  read: 0 | 1;
  createdAt: string;
  payload?: any;
};

const ADMIN_UID = 'ADMIN';

export default function NotificacoesScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/notifications`, {
        params: { userUid: ADMIN_UID, limit: 50 },
        timeout: 10000,
      });
      setItems(data?.notifications ?? []);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE}/notifications/${id}/read`, { userUid: ADMIN_UID }, { timeout: 10000 });
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: 1 } : n)));
    } catch {
      Alert.alert('Erro', 'Falha ao marcar como lida.');
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.read && styles.cardUnread]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

            {!item.read && (
              <TouchableOpacity onPress={() => markRead(item.id)} style={styles.btn}>
                <Text style={styles.btnLabel}>Marcar como lida</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Sem notificações por enquanto.</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fafafa' },
  card: {
    padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    marginBottom: 10, backgroundColor: '#fff'
  },
  cardUnread: { backgroundColor: '#f7ffe9' },
  title: { fontWeight: '700', fontSize: 16, marginBottom: 6 },
  body: { color: '#444', marginBottom: 6 },
  time: { color: '#777', fontSize: 12 },
  btn: {
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: '#2e7d32', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6
  },
  btnLabel: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 24, color: '#777' },
});
