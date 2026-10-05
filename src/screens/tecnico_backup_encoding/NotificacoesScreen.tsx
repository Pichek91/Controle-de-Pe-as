// src/screens/tecnico/NotificacoesScreen.tsx

import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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
import {
  RectButton,
  Swipeable,
} from 'react-native-gesture-handler';

import { emitBadgeRefresh } from '../../badgeBus';
import { API_BASE } from '../../config';
import { useAuth } from '../../hooks/useAuth';

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
  const { uid } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyBulkDelete, setBusyBulkDelete] = useState(false);

  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());

  /**
   * Carrega as notificações do técnico autenticado
   * utilizando exclusivamente o Firebase UID.
   */
  const fetchData = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${API_BASE}/notifications`,
        {
          params: {
            userUid: uid,
            limit: 50,
          },
          timeout: 10000,
        }
      );

      setItems(data?.notifications ?? []);
    } catch (e) {
      console.warn(
        '[Notif/Tec] fetch error:',
        e
      );

      Alert.alert(
        'Erro',
        'Não foi possível carregar as notificações.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  /**
   * Atualiza a lista sempre que a tela
   * de notificações ganha foco.
   */
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  /**
   * Marca uma notificação como lida.
   */
  const markRead = useCallback(
    async (id: number) => {
      if (!uid) return;

      try {
        await axios.post(
          `${API_BASE}/notifications/${id}/read`,
          {
            userUid: uid,
          },
          {
            timeout: 10000,
          }
        );

        setItems((prev) =>
          prev.map((notification) =>
            notification.id === id
              ? {
                  ...notification,
                  read: 1,
                }
              : notification
          )
        );

        emitBadgeRefresh();
      } catch (e) {
        console.warn(
          '[Notif/Tec] markRead error:',
          e
        );

        Alert.alert(
          'Erro',
          'Falha ao marcar como lida.'
        );
      }
    },
    [uid]
  );

  /**
   * Apaga uma notificação.
   */
  const deleteOne = useCallback(
    async (id: number) => {
      if (!uid) return;

      try {
        await axios.delete(
          `${API_BASE}/notifications/${id}`,
          {
            data: {
              userUid: uid,
            },
            timeout: 10000,
          }
        );

        setItems((prev) =>
          prev.filter(
            (notification) =>
              notification.id !== id
          )
        );

        emitBadgeRefresh();
      } catch (e: any) {
        console.warn(
          '[Notif/Tec] deleteOne error:',
          e?.response?.status,
          e?.response?.data || e?.message
        );

        Alert.alert(
          'Erro',
          'Falha ao apagar notificação.'
        );
      } finally {
        const ref =
          swipeRefs.current.get(id);

        ref?.close();
      }
    },
    [uid]
  );

  /**
   * Apaga todas as notificações
   * do técnico autenticado.
   */
  const deleteAll = useCallback(async () => {
    if (busyBulkDelete || !uid) return;

    try {
      setBusyBulkDelete(true);

      const url =
        `${API_BASE}/notifications/delete-all`;

      const body = {
        userUid: uid,
      };

      const { status, data } =
        await axios.post(
          url,
          body,
          {
            timeout: 10000,
          }
        );

      if (status >= 200 && status < 300) {
        setItems([]);
        emitBadgeRefresh();
      } else {
        console.warn(
          '[Notif/Tec] deleteAll non-2xx:',
          status,
          data
        );

        Alert.alert(
          'Erro',
          'Falha ao apagar todas as notificações.'
        );
      }
    } catch (e: any) {
      console.warn(
        '[Notif/Tec] deleteAll error:',
        e?.response?.status,
        e?.response?.data || e?.message
      );

      Alert.alert(
        'Erro',
        'Falha ao apagar todas as notificações.'
      );
    } finally {
      setBusyBulkDelete(false);
    }
  }, [busyBulkDelete, uid]);

  /**
   * Atualização manual da lista.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  /**
   * Ação exibida ao arrastar
   * uma notificação para o lado.
   */
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<
      string | number
    >,
    item: NotificationItem
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <View style={styles.rightActionsContainer}>
        <Animated.View
          style={[
            styles.rightActionAnimated,
            {
              transform: [
                {
                  translateX: trans,
                },
              ],
            },
          ]}
        >
          <RectButton
            style={styles.rightAction}
            onPress={() =>
              deleteOne(item.id)
            }
          >
            <Text style={styles.actionText}>
              Apagar
            </Text>
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={styles.loading}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bulkRow}>
        <Button
          title={
            busyBulkDelete
              ? 'Processando...'
              : 'Apagar tudo'
          }
          onPress={deleteAll}
          color="#c62828"
          disabled={
            busyBulkDelete ||
            items.length === 0
          }
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) =>
          String(item.id)
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        renderItem={({ item }) => {
          const refSetter = (
            swipeable: Swipeable | null
          ) => {
            if (swipeable) {
              swipeRefs.current.set(
                item.id,
                swipeable
              );
            } else {
              swipeRefs.current.delete(
                item.id
              );
            }
          };

          return (
            <Swipeable
              ref={refSetter}
              renderRightActions={(
                progress
              ) =>
                renderRightActions(
                  progress,
                  item
                )
              }
              friction={2}
              rightThreshold={40}
              overshootRight={false}
            >
              <View
                style={[
                  styles.card,
                  !item.read &&
                    styles.cardUnread,
                ]}
              >
                <Text style={styles.title}>
                  {item.title}
                </Text>

                <Text style={styles.body}>
                  {item.body}
                </Text>

                <Text style={styles.time}>
                  {new Date(
                    item.createdAt
                  ).toLocaleString()}
                </Text>

                {!item.read && (
                  <TouchableOpacity
                    onPress={() =>
                      markRead(item.id)
                    }
                    style={styles.btn}
                  >
                    <Text
                      style={styles.btnLabel}
                    >
                      Marcar como lida
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Swipeable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Sem notificações por enquanto.
          </Text>
        }
        contentContainerStyle={
          styles.listContent
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fafafa',
  },

  loading: {
    marginTop: 24,
  },

  bulkRow: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },

  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },

  cardUnread: {
    backgroundColor: '#f7ffe9',
  },

  title: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },

  body: {
    color: '#444',
    marginBottom: 6,
  },

  time: {
    color: '#777',
    fontSize: 12,
  },

  btn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2e7d32',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  btnLabel: {
    color: '#fff',
    fontWeight: '700',
  },

  empty: {
    textAlign: 'center',
    marginTop: 24,
    color: '#777',
  },

  rightActionsContainer: {
    width: 80,
    flexDirection: 'row',
  },

  rightActionAnimated: {
    flex: 1,
  },

  rightAction: {
    flex: 1,
    backgroundColor: '#c62828',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },

  actionText: {
    color: '#fff',
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 16,
  },
});