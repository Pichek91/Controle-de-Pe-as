import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TecnicoDetalheScreen() {
  const params = useLocalSearchParams<{
    tecnicoId: string;
    tecnicoEmail?: string;
    tecnicoNome?: string;
  }>();

  const tecnicoId = params.tecnicoId;
  const tecnicoEmail = params.tecnicoEmail ?? '';
  const tecnicoNome = params.tecnicoNome ?? '';

  const titulo =
    tecnicoNome || tecnicoEmail || 'Técnico';

  const goCarro = () => {
    router.push({
      pathname: '/admin/estoque-tec/carro',
      params: {
        tecnicoId,
        tecnicoEmail,
        tecnicoNome,
      },
    });
  };

  const goPendentes = () => {
    router.push({
      pathname: '/admin/estoque-tec/pendentes',
      params: {
        tecnicoId,
        tecnicoEmail,
        tecnicoNome,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <Ionicons
          name="person-circle"
          size={60}
          color="#4a90e2"
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {titulo}
          </Text>

          {!!tecnicoEmail && (
            <Text style={styles.muted}>
              {tecnicoEmail}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.btnGrid}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={goCarro}
        >
          <Ionicons
            name="car-sport"
            size={22}
            color="#fff"
          />

          <Text style={styles.actionText}>
            Estoque Carro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.returnButton,
          ]}
          onPress={goPendentes}
        >
          <Ionicons
            name="swap-vertical"
            size={22}
            color="#fff"
          />

          <Text style={styles.actionText}>
            Peças pendentes de devolução
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f4f8ff',
    borderWidth: 1,
    borderColor: '#e1ecff',
    marginBottom: 16,
  },

  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2b3a67',
  },

  muted: {
    color: '#666',
    marginTop: 6,
  },

  btnGrid: {
    gap: 12,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2bb673',
    gap: 8,
  },

  returnButton: {
    backgroundColor: '#ff7043',
  },

  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
});
