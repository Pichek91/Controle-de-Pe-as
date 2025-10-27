import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../../firebaseConfig'; // Ajuste conforme seu caminho

export default function LogoutScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('loginData');

      Alert.alert('Logout', 'Você saiu do sistema.');

      navigation.reset({
        index: 0,
        routes: [{ name: 'login' }], // Use o nome exato da rota
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deseja sair?</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
});
