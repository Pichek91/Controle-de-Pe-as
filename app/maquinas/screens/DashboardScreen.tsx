import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_URL } from "../../../src/modules/config/api";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dados, setDados] = useState({
    estoque: 0,
    vinculadas: 0,
    livres: 0,
    separarEnvio: 0,
    food: 0,
    ocs: 0,
    largeOffice: 0,
    otg: 0,
    outros: 0,
  });

  async function carregar() {
    try {
      setLoading(true);

      const resp = await fetch(`${API_URL}/maquinas`);
      const data = await resp.json();

      const estoque = data.filter((m: any) => m.status === "Estoque").length;
      const vinculadas = data.filter((m: any) => m.maquina_vinculada === true).length;
      const livres = data.filter((m: any) => m.situacao === "LIVRE").length;
      const separarEnvio = data.filter((m: any) => m.status === "Separar Envio").length;

      const food = data.filter((m: any) => m.seguimento === "FOOD").length;
      const ocs = data.filter((m: any) => m.seguimento === "OSC").length;
      const largeOffice = data.filter((m: any) => m.seguimento === "LARGE OFFICE").length;
      const otg = data.filter((m: any) => m.seguimento === "OTG").length;
      const outros = data.filter((m: any) => m.seguimento === "OUTROS").length;

      setDados({
        estoque,
        vinculadas,
        livres,
        separarEnvio,
        food,
        ocs,
        largeOffice,
        otg,
        outros,
      });
    } catch (err) {
      console.log("Erro dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  async function atualizar() {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando dashboard...</Text>
      </View>
    );
  }

  function Card({ titulo, valor }: any) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>{titulo}</Text>
        <Text style={styles.cardValor}>{valor}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={atualizar} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>

      <Card titulo="Estoque" valor={dados.estoque} />
      <Card titulo="Vinculadas" valor={dados.vinculadas} />
      <Card titulo="Livres" valor={dados.livres} />
      <Card titulo="Separar Envio" valor={dados.separarEnvio} />

      <Text style={styles.subTitle}>Seguimentos</Text>

      <Card titulo="FOOD" valor={dados.food} />
      <Card titulo="OCS" valor={dados.ocs} />
      <Card titulo="LARGE OFFICE" valor={dados.largeOffice} />
      <Card titulo="OTG" valor={dados.otg} />
      <Card titulo="OUTROS" valor={dados.outros} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f6f9",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },

  cardTitulo: {
    fontSize: 14,
    color: "#666",
  },

  cardValor: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 4,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
