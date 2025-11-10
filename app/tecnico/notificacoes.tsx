// app/tecnico/notificacoes.tsx
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated,
  Button,
  FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { emitBadgeRefresh } from '../../src/badgeBus';
import { API_BASE } from '../../src/config';
import { useAuth } from '../../src/hooks/useAuth';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type?: string;
  read: 0 | 1;
  createdAt: string;
  payload?: any;
};

export default function NotificacoesTecnicoScreen() {
  const { uid, email } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyBulkDelete, setBusyBulkDelete] = useState(false);
  const [keyInUse, setKeyInUse] = useState<string | null>(null); // chave realmente usada
  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());

  /** Lista por UID; se vazio, tenta EMAIL */
  const fetchData = useCallback(async () => {
    try {
      if (!uid && !email) { setItems([]); setKeyInUse(null); }
      else {
        let k: string | null = null;
        let list: NotificationItem[] = [];

        // tenta UID
        if (uid) {
          const { data } = await axios.get(`${API_BASE}/notifications`, {
            params: { userUid: uid, limit: 50 },
            timeout: 10000,
          });
          list = data?.notifications ?? [];
          if (list.length > 0) { k = uid; }
        }

        // se UID vazio e tiver EMAIL, tenta EMAIL
        if (!k && email) {
          const { data } = await axios.get(`${API_BASE}/notifications`, {
            params: { userUid: email, limit: 50 },
            timeout: 10000,
          });
          const byEmail: NotificationItem[] = data?.notifications ?? [];
          if (byEmail.length > 0) { k = email; list = byEmail; }
        }

        if (!k) k = uid || email || null;
        setKeyInUse(k);
        setItems(list);
      }
    } catch (e) {
      console.warn('[Notif/Tec] fetch error:', e);
      Alert.alert('Erro', 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid, email]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /** Marcar 1 como lida (mantido) */
  const markRead = useCallback(async (id: number) => {
    if (!keyInUse) return;
    try {
      await axios.post(`${API_BASE}/notifications/${id}/read`, { userUid: keyInUse }, { timeout: 10000 });
      emitBadgeRefresh();
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: 1 } : n)));
    } catch (e) {
      console.warn('[Notif/Tec] markRead error:', e);
      Alert.alert('Erro', 'Falha ao marcar como lida.');
    }
  }, [keyInUse]);

  /** Apagar 1: DELETE + remove local + refresh badge */
  const deleteOne = useCallback(async (id: number) => {
    if (!keyInUse) return;
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`, {
        data: { userUid: keyInUse },
        timeout: 10000,
      });
      setItems(prev => prev.filter(n => n.id !== id));
      emitBadgeRefresh();
    } catch (e: any) {
      console.warn('[Notif/Tec] deleteOne error:', e?.response?.status, e?.response?.data || e?.message);
      Alert.alert('Erro', 'Falha ao apagar notificação.');
    } finally {
      const ref = swipeRefs.current.get(id);
      ref?.close();
    }
  }, [keyInUse]);

  /** Apagar tudo: delete-all + limpa lista + refresh badge */
  const deleteAll = useCallback(async () => {
    if (busyBulkDelete || !keyInUse) return;
    try {
      setBusyBulkDelete(true);
      const url = `${API_BASE}/notifications/delete-all`;
      const body = { userUid: keyInUse };
      const { status, data } = await axios.post(url, body, { timeout: 10000 });
      if (status >= 200 && status < 300) {
        setItems([]);
        emitBadgeRefresh();
      } else {
        console.warn('[Notif/Tec] deleteAll non-2xx:', status, data);
        Alert.alert('Erro', 'Falha ao apagar todas as notificações.');
      }
    } catch (e: any) {
      console.warn('[Notif/Tec] deleteAll error:', e?.response?.status, e?.response?.data || e?.message);
      Alert.alert('Erro', 'Falha ao apagar todas as notificações.');
    } finally {
      setBusyBulkDelete(false);
    }
  }, [busyBulkDelete, keyInUse]);

  /** Ação "Apagar" no swipe */
  const renderRightActions = (progress: Animated.AnimatedInterpolation<string | number>, item: NotificationItem) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <View style={{ width: 80, flexDirection: 'row' }}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: trans }] }}>
          <RectButton style={styles.rightAction} onPress={() => deleteOne(item.id)}>
            <Text style={styles.actionText}>Apagar</Text>
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={styles.container}>
      {/* Ações em massa */}
      <View style={styles.bulkRow}>
        <Button
          title={busyBulkDelete ? 'Processando...' : 'Apagar tudo'}
          onPress={deleteAll}
          color="#c62828"
          disabled={busyBulkDelete || items.length === 0}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
          />
        }
        renderItem={({ item }) => {
          const refSetter = (sw: Swipeable | null) => {
            if (sw) swipeRefs.current.set(item.id, sw);
            else swipeRefs.current.delete(item.id);
          };

          return (
            <Swipeable
              ref={refSetter}
              renderRightActions={(p) => renderRightActions(p, item)}
              friction={2}
              rightThreshold={40}
              overshootRight={false}
            >
              <View style={[styles.card, !item.read && styles.cardUnread]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

                {/* Mantém "Marcar como lida" (opcional) */}
                {!item.read && (
                  <TouchableOpacity onPress={() => markRead(item.id)} style={styles.btn}>
                    <Text style={styles.btnLabel}>Marcar como lida</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Swipeable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Sem notificações por enquanto.</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fafafa' },

  bulkRow: { marginBottom: 8, alignItems: 'flex-end' },

  card: {
    padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    marginBottom: 10, backgroundColor: '#fff'
  },
  cardUnread: { backgroundColor: '#f7ffe9' },
  title: { fontWeight: '700', fontSize: 16, marginBottom: 6 },
  body: { color: '#444', marginBottom: 6 },
  time: { color: '#777', fontSize: 12 },
  btn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#2e7d32', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  btnLabel: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 24, color: '#777' },

  // swipe
  rightAction: {
    flex: 1,
    backgroundColor: '#c62828',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
    marginTop: 0,
  },
  actionText: { color: '#fff', fontWeight: '700' },
});
