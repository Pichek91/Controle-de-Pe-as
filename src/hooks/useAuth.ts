// controle-pecas/src/hooks/useAuth.ts
import { getIdToken, onAuthStateChanged, User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '../../firebaseConfig';

type AuthState = {
  user: User | null;
  uid: string | null;
  email: string | null;
  token: string | null; // Firebase ID Token
  loading: boolean;
  refreshToken: () => Promise<string | null>;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!auth.currentUser);

  const refreshToken = useCallback(async () => {
    if (!auth.currentUser) {
      setToken(null);
      return null;
    }
    try {
      const t = await getIdToken(auth.currentUser, /*forceRefresh*/ true);
      setToken(t);
      return t;
    } catch {
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          const t = await getIdToken(u);
          setToken(t);
        } catch {
          setToken(null);
        }
      } else {
        setToken(null);
      }
    });
    return () => unsub();
  }, []);

  return {
    user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    token,
    loading,
    refreshToken,
  };
}