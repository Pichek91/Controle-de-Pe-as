import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PecasReconScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tela de Peças para Recon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' }
});