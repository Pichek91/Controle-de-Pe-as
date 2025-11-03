// controle-pecas/src/hooks/useAuthUser.ts
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../../firebaseConfig'; // <-- ajuste o caminho

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return { user };
}