import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth } from '../../../firebaseConfig';

export default function LogoutScreen() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('loginData');

      Alert.alert('Logout', 'Você saiu do sistema.');

      router.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);

      Alert.alert(
        'Erro',
        'Não foi possível sair. Tente novamente.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deseja sair?</Text>

      <Button
        title="Logout"
        onPress={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});