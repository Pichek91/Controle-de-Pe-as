
import { getAuth } from 'firebase/auth';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function RecebimentosScreen() {
  useEffect(() => {
    (async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.log('[DEBUG] Usuário não autenticado');
        return;
      }
      console.log('[DEBUG] UID:', user.uid);
      const token = await user.getIdToken(true);
      console.log('[DEBUG] ID Token COMPLETO:', token);
      const tokenResult = await user.getIdTokenResult(true);
      console.log('[DEBUG] Claims:', tokenResult.claims);
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Tela de Recebimentos (Debug Token no console)</Text>
    </View>
  );
}
