
// app/admin/screens/NotificacoesScreen.tsx
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { API_BASE } from '../../../src/config';

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

// ✅ Função para enviar push via FCM
async function sendPushNotificationFCM(token: string, title: string, body: string) {
  try {
    const FCM_SERVER_KEY = 'SUA_CHAVE_FCM_AQUI'; // coloque sua chave do Firebase
    const payload = {
      to: token,
      notification: { title, body },
      data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Erro FCM:', text);
    }
  } catch (e) {
    console.error('Erro ao enviar push:', e);
  }
}

export default function NotificacoesScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyBulkDelete, setBusyBulkDelete] = useState(false);
  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/notifications`, {
        params: { userUid: ADMIN_UID, limit: 50 },
        timeout: 10000,
      });
      setItems(data?.notifications ?? []);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE}/notifications/${id}/read`, { userUid: ADMIN_UID }, { timeout: 10000 });
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: 1 } : n)));

      // ✅ Exemplo: enviar push quando marcar como lida (opcional)
      // Aqui você pode buscar o token do usuário no backend e chamar sendPushNotificationFCM(token, ...)
    } catch {
      Alert.alert('Erro', 'Falha ao marcar como lida.');
    }
  };

  const deleteOne = useCallback(async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`, {
        data: { userUid: ADMIN_UID },
        timeout: 10000,
      });
      setItems(prev => prev.filter(n => n.id !== id));
    } catch {
      Alert.alert('Erro', 'Falha ao apagar notificação.');
    } finally {
      const ref = swipeRefs.current.get(id);
      ref?.close();
    }
  }, []);

  const deleteAll = useCallback(async () => {
    if (busyBulkDelete) return;
    try {
      setBusyBulkDelete(true);
      const url = `${API_BASE}/notifications/delete-all`;
      const body = { userUid: ADMIN_UID };
      const { status } = await axios.post(url, body, { timeout: 10000 });
      if (status >= 200 && status < 300) {
        setItems([]);
      } else {
        Alert.alert('Erro', 'Falha ao apagar todas as notificações.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao apagar todas as notificações.');
    } finally {
      setBusyBulkDelete(false);
    }
  }, [busyBulkDelete]);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<string | number>,
    item: NotificationItem
  ) => {
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
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
  btn: {
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: '#2e7d32', paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 6
  },
  btnLabel: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 24, color: '#777' },
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
