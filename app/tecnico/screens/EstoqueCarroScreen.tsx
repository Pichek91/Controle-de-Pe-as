import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

function TwoGears({ size = 56, duration = 1800 }: { size?: number; duration?: number }) {
  const rotA = useRef(new Animated.Value(0)).current;
  const rotB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.timing(rotA, { toValue: 1, duration, useNativeDriver: true })
    );
    const loopB = Animated.loop(
      Animated.timing(rotB, { toValue: 1, duration, useNativeDriver: true })
    );
    loopA.start();
    loopB.start();
    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [duration, rotA, rotB]);

  const spinA = rotA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinB = rotB.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={styles.gearsWrap}>
      {/* Engrenagem maior (esquerda) */}
      <Animated.Text style={[styles.gear, { fontSize: size, transform: [{ rotate: spinA }] }]}>
        ⚙️
      </Animated.Text>

      {/* Engrenagem menor (direita, levemente acima, contra-rotativa) */}
      <Animated.Text
        style={[
          styles.gear,
          {
            fontSize: Math.round(size * 0.72),
            position: 'absolute',
            left: size * 0.62,
            top: -size * 0.18,
            transform: [{ rotate: spinB }],
          },
        ]}
      >
        ⚙️
      </Animated.Text>
    </View>
  );
}

export default function EstoqueCarroScreen() {
  return (
    <View style={styles.container}>
      <TwoGears size={56} duration={1800} />

      <Text style={styles.title}>Tela de Estoque do Carro</Text>
      <Text style={styles.subtitle}>Ambiente em desenvolvimento</Text>
      <Text style={styles.hint}>Obrigado pela compreensão!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16200bff',
  },
  gearsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 140,
  },
  gear: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#E6EDF7',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: '#C8D4E6',
    textAlign: 'center',
    fontWeight: '600',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: '#9FB0C7',
    textAlign: 'center',
  },
});