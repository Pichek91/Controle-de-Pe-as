// controle-pecas/app/index.tsx
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let t: any;

    // Mantém o splash por ~3s e navega direto
    t = setTimeout(async () => {
      // Fecha o splash (agora a UI RN fica visível)
      await SplashScreen.hideAsync();
      // Redireciona imediatamente para a tela de login
      router.replace('/login');
    }, 3000); // ajuste o tempo (ms) como preferir

    return () => clearTimeout(t);
  }, [router]);

  // Enquanto o splash estiver visível, nada aqui aparece
  return <View />;
}