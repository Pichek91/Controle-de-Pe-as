// app/tecnico/screens/RetiradasScreen.tsx
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert, FlatList, RefreshControl, Text, TouchableOpacity, View,
} from 'react-native';
import { API_BASE } from '../../../src/config';
import { useAuth } from '../../../src/hooks/useAuth';

type ReqItem = {
  id: number;
  qty: number;
  status: 'pending' | 'ready_for_pickup' | 'picked_up' | 'rejected';
  technicianEmail: string;
  technicianUid?: string | null;
  created_at: string;
  part: { id: number; nome: string; codigo: string; marca?: string; modelo?: string };
};

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RetiradasScreen() {
  const { uid, email, token } = useAuth();
  const [items, setItems] = useState<ReqItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hdrs = useMemo(() => authHeaders(token), [token]);

  // DEBUG
  console.log('[Retiradas] auth:', { uid, email, hasToken: !!token });
  console.log('[Retiradas] headers ->', hdrs);

  const mergeUnique = (a: ReqItem[], b: ReqItem[]) => {
    const map = new Map<number, ReqItem>();
    [...a, ...b].forEach((r) => map.set(r.id, r));
    return Array.from(map.values()).sort((x, y) => y.id - x.id);
  };

  const fetchByUid = useCallback(async (signal: AbortSignal): Promise<ReqItem[]> => {
    if (!uid) return [];
    const url = `${API_BASE}/separation-requests/my?status=ready_for_pickup&technicianUid=${encodeURIComponent(uid)}`;
    console.log('[Retiradas] GET (uid):', url);
    const res = await fetch(url, { headers: hdrs, signal });
    console.log('[Retiradas] status (uid):', res.status);
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    console.log('[Retiradas] data (uid):', data);
    if (!res.ok) throw new Error(`HTTP ${res.status} (uid)`);
    return data?.requests ?? [];
  }, [uid, hdrs]);

  const fetchByEmail = useCallback(async (signal: AbortSignal): Promise<ReqItem[]> => {
    if (!email) return [];
    const url = `${API_BASE}/separation-requests/my?status=ready_for_pickup&technicianEmail=${encodeURIComponent(email)}`;
    console.log('[Retiradas] GET (email):', url);
    const res = await fetch(url, { headers: hdrs, signal });
    console.log('[Retiradas] status (email):', res.status);
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    console.log('[Retiradas] data (email):', data);
    if (!res.ok) throw new Error(`HTTP ${res.status} (email)`);
    return data?.requests ?? [];
  }, [email, hdrs]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      // cancela requisição anterior
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!uid && !email) {
        console.warn('[Retiradas] sem uid/email — limpando lista');
        setItems([]);
        setInitialLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        // mostra loading na primeira carga e no pull-to-refresh
        if (!opts?.silent && !refreshing) setInitialLoading(true);

        const [rUid, rEmail] = await Promise.allSettled([
          fetchByUid(controller.signal),
          fetchByEmail(controller.signal),
        ]);

        const listUid = rUid.status === 'fulfilled' ? rUid.value : [];
        const listEmail = rEmail.status === 'fulfilled' ? rEmail.value : [];

        const merged = mergeUnique(listUid, listEmail);
        console.log('[Retiradas] merged count:', merged.length, 'ids:', merged.map(x => x.id));
        setItems(merged);
      } catch (e: any) {
        if (e?.name !== 'AbortError' && !opts?.silent) {
          console.warn('[Retiradas] load error:', e);
          Alert.alert('Erro', 'Falha ao carregar as peças prontas para retirada.');
        }
      } finally {
        // 🔧 Garanta que o spinner some SEMPRE
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [uid, email, refreshing, fetchByUid, fetchByEmail]
  );

  // 🔧 Carregar quando a tela focar (sem "silent" na primeira vez)
  useFocusEffect(
    useCallback(() => {
      console.log('[Retiradas] focus -> carregar');
      let active = true;
      (async () => { if (active) await load(); })(); // <-- sem silent aqui
      return () => {
        console.log('[Retiradas] blur  -> abortar');
        active = false;
        abortRef.current?.abort();
      };
    }, [load])
  );

  async function confirmarRetirada(id: number) {
    if (!uid && !email) return;
    setBusyId(id);
    try {
      const body: any = uid ? { technicianUid: uid } : { technicianEmail: email };
      console.log('[Retiradas] POST pickup-confirm:', id, 'body:', body);
      const res = await fetch(`${API_BASE}/separation-requests/${id}/pickup-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs },
        body: JSON.stringify(body),
      });
      console.log('[Retiradas] pickup-confirm status:', res.status);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn('[Retiradas] pickup-confirm body:', txt);
        let err: any = {};
        try { err = JSON.parse(txt); } catch {}
        Alert.alert('Erro', err?.error ?? 'Falha ao confirmar retirada.');
        await load({ silent: true });
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      Alert.alert('Sucesso', 'Peça registrada no estoque do carro.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('[Retiradas] confirmarRetirada erro:', e);
        Alert.alert('Erro', 'Não foi possível confirmar a retirada.');
      }
    } finally {
      setBusyId(null);
    }
  }

  if (initialLoading) {
    return <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 24 }} />;
  }

  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: '#fafafa' }}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load({ silent: true }); }}
          />
        }
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eaeaea', marginBottom: 12, backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1b5e20' }}>
              {item.part.nome} <Text style={{ color: '#666' }}>(cód. {item.part.codigo})</Text>
            </Text>
            <Text style={{ fontSize: 14, marginTop: 4 }}>
              Qtd: <Text style={{ fontWeight: '700' }}>{item.qty}</Text>
            </Text>
            <Text style={{ marginTop: 6, color: '#777', fontSize: 12 }}>
              Pronto desde {new Date(item.created_at).toLocaleString()}
            </Text>

            <TouchableOpacity
              onPress={() => confirmarRetirada(item.id)}
              disabled={busyId === item.id}
              style={{ marginTop: 12, backgroundColor: '#2e7d32', borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: busyId === item.id ? 0.7 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {busyId === item.id ? 'Confirmando...' : 'Confirmar retirada'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 24, color: '#777' }}>Sem peças prontas para retirada.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}