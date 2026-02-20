import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../../src/modules/config/api";

export default function EstoqueScreen() {
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [filtradas, setFiltradas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtrosVisivel, setFiltrosVisivel] = useState(false);

  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [situacao, setSituacao] = useState("");

  const [modal, setModal] = useState(false);
  const [selecionada, setSelecionada] = useState<any>(null);

  const [refreshing, setRefreshing] = useState(false);


  async function carregar() {
    try {
      setLoading(true);

      const resp = await fetch(`${API_URL}/maquinas`);
      const data = await resp.json();

      setMaquinas(data);
      setFiltradas(data);
    } catch (err) {
      console.log("Erro:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function aplicarFiltros() {
    let lista = [...maquinas];

    if (busca) {
      lista = lista.filter((m) =>
        (m.patrimonio || "")
          .toLowerCase()
          .includes(busca.toLowerCase())
      );
    }

    if (fabricante) {
      lista = lista.filter(
        (m) =>
          (m.fabricante || "").toLowerCase() ===
          fabricante.toLowerCase()
      );
    }

    if (modelo) {
      lista = lista.filter(
        (m) =>
          (m.modelo || "").toLowerCase() ===
          modelo.toLowerCase()
      );
    }

    if (situacao) {
      lista = lista.filter(
        (m) =>
          (m.situacao || "").toLowerCase() ===
          situacao.toLowerCase()
      );
    }

    setFiltradas(lista);
  }

  async function atualizarLista() {
  setRefreshing(true);
  await carregar();
  setRefreshing(false);
}


  function abrirMaquina(item: any) {
    setSelecionada(item);
    setModal(true);
  }

  function renderItem({ item }: any) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirMaquina(item)}
      >
        <Text style={styles.title}>{item.patrimonio}</Text>
        <Text>{item.fabricante}</Text>
        <Text>{item.modelo}</Text>
        <Text>Situação: {item.situacao}</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando máquinas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Estoque</Text>

        <TouchableOpacity
          style={styles.filtroBtn}
          onPress={() => setFiltrosVisivel(!filtrosVisivel)}
        >
          <Text style={{ fontSize: 18 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Filtrar patrimônio..."
        value={busca}
        onChangeText={(t) => {
          setBusca(t);
          aplicarFiltros();
        }}
      />

      {filtrosVisivel && (
        <View style={styles.filtros}>
          <TextInput
            style={styles.input}
            placeholder="Fabricante"
            value={fabricante}
            onChangeText={setFabricante}
          />

          <TextInput
            style={styles.input}
            placeholder="Modelo"
            value={modelo}
            onChangeText={setModelo}
          />

          <TextInput
            style={styles.input}
            placeholder="Situação"
            value={situacao}
            onChangeText={setSituacao}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={aplicarFiltros}
          >
            <Text style={styles.buttonText}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>
      )}

<FlatList
  data={filtradas}
  keyExtractor={(item) => String(item.id)}
  renderItem={renderItem}
  refreshing={refreshing}
  onRefresh={atualizarLista}
/>


      {/* MODAL */}
      <Modal visible={modal} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          {selecionada && (
            <>
              <Text style={styles.modalTitle}>
                {selecionada.patrimonio}
              </Text>

              {selecionada.foto_url && (
                <Image
                  source={{ uri: selecionada.foto_url }}
                  style={styles.foto}
                />
              )}

              <Text>Fabricante: {selecionada.fabricante}</Text>
              <Text>Modelo: {selecionada.modelo}</Text>
              <Text>Nº Série: {selecionada.numero_serie}</Text>
              <Text>Cliente: {selecionada.cliente}</Text>
              <Text>OS: {selecionada.os}</Text>
              <Text>Localizador: {selecionada.localizador}</Text>
              <Text>Situação: {selecionada.situacao}</Text>
              <Text>Status: {selecionada.status}</Text>
              <Text>Seguimento: {selecionada.seguimento}</Text>
              <Text>Observações: {selecionada.observacoes}</Text>

              <TouchableOpacity style={styles.editBtn}>
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModal(false)}
              >
                <Text style={styles.buttonText}>Fechar</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f4f6f9" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  header: { fontSize: 22, fontWeight: "bold" },

  filtroBtn: {
    backgroundColor: "#0b3d2e",
    padding: 10,
    borderRadius: 8,
  },

  filtros: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  button: {
    backgroundColor: "#0b3d2e",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    alignItems: "center",
  },

  buttonText: { color: "#fff", fontWeight: "bold" },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  title: { fontWeight: "bold", fontSize: 16 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },

  foto: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
  },

  editBtn: {
    backgroundColor: "#1565c0",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },

  closeBtn: {
    backgroundColor: "#c62828",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
});
