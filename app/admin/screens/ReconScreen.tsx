import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReconScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tela de Recon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' }
});