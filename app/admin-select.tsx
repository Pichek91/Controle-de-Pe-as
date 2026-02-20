import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminSelect() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escolha o módulo</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/admin' as any)}
      >
        <Text style={styles.buttonText}>PEÇAS</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.greenButton]}
        onPress={() => router.replace('/maquinas' as any)}
      >
        <Text style={styles.buttonText}>MÁQUINAS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f2f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  greenButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
