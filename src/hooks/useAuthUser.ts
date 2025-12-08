
// src/hooks/useAuthUser.ts
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../../firebaseConfig';

/**
 * Perfil unificado: junta dados do Firebase com dados da sua API.
 */
export type AuthProfile = {
  // Firebase
  uid: string;
  email: string | null;
  photoURL: string | null; // foto padrão do Firebase (se existir)
  firebaseUser: FirebaseUser;

  // API Hostinger
  photoUrl: string | null;     // foto absoluta da API (/profile/me)
  displayName: string | null;

  // Segurança
  token: string | null;        // Firebase ID Token para Authorization: Bearer
};

type UseAuthUserReturn = {
  user: AuthProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

// Ajuste a URL base se necessário
const API_BASE = 'https://api.grancoffeepecas.com.br';

export function useAuthUser(): UseAuthUserReturn {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Consulta /profile/me na sua API usando o ID Token.
   */
  const fetchProfileFromApi = useCallback(async (idToken: string) => {
    try {
      const resp = await fetch(`${API_BASE}/profile/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Falha ao obter perfil');

      // Esperado: { uid, email, displayName, photoUrl }
      return {
        displayName: data?.displayName ?? null,
        photoUrl: data?.photoUrl ?? null,
        email: data?.email ?? null,
      } as { displayName: string | null; photoUrl: string | null; email: string | null };
    } catch (e) {
      // Em caso de erro, não quebra; retorna nulls
      return { displayName: null, photoUrl: null, email: null };
    }
  }, []);

  /**
   * Monta o AuthProfile completo.
   */
  const buildProfile = useCallback(
    async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        return;
      }
      // ID Token para autorizar na API
      const idToken = await fbUser.getIdToken(/* forceRefresh */ true);
      const apiProfile = await fetchProfileFromApi(idToken);

      const profile: AuthProfile = {
        uid: fbUser.uid,
        email: fbUser.email ?? apiProfile.email ?? null,
        photoURL: fbUser.photoURL ?? null,     // firebase
        firebaseUser: fbUser,
        photoUrl: apiProfile.photoUrl ?? null, // api
        displayName: apiProfile.displayName ?? fbUser.displayName ?? null,
        token: idToken,
      };
      setUser(profile);
    },
    [fetchProfileFromApi]
  );

  /**
   * Observa mudanças de autenticação no Firebase.
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      try {
        setLoading(true);
        await buildProfile(fbUser);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [buildProfile]);

  /**
   * Refresh manual (ex.: depois de upload de foto).
   */
  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      await buildProfile(firebaseUser);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, buildProfile]);

  /**
   * Sign-out helper.
   */
  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  // Opcional: memo para evitar re-renders
  const value = useMemo<UseAuthUserReturn>(
    () => ({ user, loading, refreshUser, signOut }),
    [user, loading, refreshUser, signOut]
  );

  return value;
}
