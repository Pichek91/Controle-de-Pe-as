import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { API_KEY, API_URL } from "../../modules/config/api";

type Estante = "A" | "B" | null;

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

  const [editandoLocalizador, setEditandoLocalizador] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [emEstante, setEmEstante] = useState(true);
  const [estante, setEstante] = useState<Estante>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [posicao, setPosicao] = useState<number | null>(null);
  const [localLivre, setLocalLivre] = useState("");

  async function carregar() {
    try {
      setLoading(true);

      const resp = await fetch(`${API_URL}/maquinas`, {
        headers: { "x-api-key": API_KEY },
      });

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

  function aplicarFiltros(
    textoBusca = busca,
    fab = fabricante,
    mod = modelo,
    sit = situacao
  ) {
    let lista = [...maquinas];

    if (textoBusca) {
      lista = lista.filter((m) =>
        String(m.patrimonio || "")
          .toLowerCase()
          .includes(textoBusca.toLowerCase())
      );
    }

    if (fab) {
      lista = lista.filter(
        (m) =>
          String(m.fabricante || "").toLowerCase() === fab.toLowerCase()
      );
    }

    if (mod) {
      lista = lista.filter(
        (m) => String(m.modelo || "").toLowerCase() === mod.toLowerCase()
      );
    }

    if (sit) {
      lista = lista.filter(
        (m) => String(m.situacao || "").toLowerCase() === sit.toLowerCase()
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
    setEditandoLocalizador(false);
  }

  function abrirEdicaoLocalizador() {
    if (!selecionada) return;

    const atual = String(selecionada.localizador || "").trim();
    const match = atual.match(/^E([AB])-A([1-3])-P(1[0-4]|[1-9])$/i);

    if (match) {
      setEmEstante(true);
      setEstante(match[1].toUpperCase() as Estante);
      setAltura(Number(match[2]));
      setPosicao(Number(match[3]));
      setLocalLivre("");
    } else {
      setEmEstante(false);
      setEstante(null);
      setAltura(null);
      setPosicao(null);
      setLocalLivre(atual);
    }

    setEditandoLocalizador(true);
  }

  function montarLocalizador() {
    if (!emEstante) return localLivre.trim();
    if (!estante || !altura || !posicao) return "";
    return `E${estante}-A${altura}-P${posicao}`;
  }

  async function salvarLocalizador() {
    if (!selecionada) return;

    const novoLocalizador = montarLocalizador();

    if (!novoLocalizador) {
      Alert.alert(
        "Localizador incompleto",
        emEstante
          ? "Selecione a estante, a altura e a posição."
          : "Digite o local onde a máquina está."
      );
      return;
    }

    setSalvando(true);

    try {
      const resp = await fetch(`${API_URL}/maquinas/${selecionada.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          localizador: novoLocalizador,
        }),
      });

      if (!resp.ok) {
        let detalhe = "";
        try {
          detalhe = await resp.text();
        } catch {}

        throw new Error(
          `Erro ${resp.status}${detalhe ? ` - ${detalhe}` : ""}`
        );
      }

      const maquinaAtualizada = {
        ...selecionada,
        localizador: novoLocalizador,
      };

      setSelecionada(maquinaAtualizada);

      setMaquinas((lista) =>
        lista.map((m) =>
          String(m.id) === String(selecionada.id)
            ? { ...m, localizador: novoLocalizador }
            : m
        )
      );

      setFiltradas((lista) =>
        lista.map((m) =>
          String(m.id) === String(selecionada.id)
            ? { ...m, localizador: novoLocalizador }
            : m
        )
      );

      setEditandoLocalizador(false);
      Alert.alert("Localizador atualizado", `Novo local: ${novoLocalizador}`);
    } catch (err: any) {
      console.log("Erro ao atualizar localizador:", err);
      Alert.alert(
        "Erro ao salvar",
        err?.message || "Não foi possível atualizar o localizador."
      );
    } finally {
      setSalvando(false);
    }
  }

  function renderItem({ item }: any) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirMaquina(item)}>
        <Text style={styles.title}>{item.patrimonio}</Text>
        <Text>{item.fabricante}</Text>
        <Text>{item.modelo}</Text>
        <Text>Situação: {item.situacao}</Text>
        <Text>Local: {item.localizador || "-"}</Text>
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
          aplicarFiltros(t, fabricante, modelo, situacao);
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

          <TouchableOpacity style={styles.button} onPress={() => aplicarFiltros()}>
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

      <Modal
        visible={modal && !editandoLocalizador}
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <ScrollView
          style={styles.modalContainer}
          contentContainerStyle={styles.modalContent}
        >
          {selecionada && (
            <>
              <Text style={styles.modalTitle}>{selecionada.patrimonio}</Text>

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
              <Text>Localizador: {selecionada.localizador || "-"}</Text>
              <Text>Situação: {selecionada.situacao}</Text>
              <Text>Status: {selecionada.status}</Text>
              <Text>Seguimento: {selecionada.seguimento}</Text>
              <Text>Observações: {selecionada.observacoes}</Text>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={abrirEdicaoLocalizador}
              >
                <Text style={styles.buttonText}>Editar localizador</Text>
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

      <Modal
        visible={modal && editandoLocalizador}
        animationType="slide"
        onRequestClose={() => setEditandoLocalizador(false)}
      >
        <ScrollView
          style={styles.modalContainer}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Alterar localizador</Text>

          <View style={styles.resumo}>
            <Text style={styles.title}>
              Patrimônio: {selecionada?.patrimonio || "-"}
            </Text>
            <Text>Modelo: {selecionada?.modelo || "-"}</Text>
            <Text>Local atual: {selecionada?.localizador || "-"}</Text>
          </View>

          <Text style={styles.sectionTitle}>
            A máquina está em uma estante?
          </Text>

          <View style={styles.optionRow}>
            <OptionButton
              label="SIM"
              selected={emEstante}
              onPress={() => {
                setEmEstante(true);
                setLocalLivre("");
              }}
            />

            <OptionButton
              label="NÃO"
              selected={!emEstante}
              onPress={() => {
                setEmEstante(false);
                setEstante(null);
                setAltura(null);
                setPosicao(null);
              }}
            />
          </View>

          {emEstante ? (
            <>
              <Text style={styles.sectionTitle}>Estante</Text>

              <View style={styles.optionRow}>
                {(["A", "B"] as const).map((item) => (
                  <OptionButton
                    key={item}
                    label={`Estante ${item}`}
                    selected={estante === item}
                    onPress={() => setEstante(item)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Altura</Text>

              <View style={styles.optionRow}>
                {[1, 2, 3].map((item) => (
                  <OptionButton
                    key={item}
                    label={`A${item}`}
                    selected={altura === item}
                    onPress={() => setAltura(item)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>Posição</Text>

              <View style={styles.positionsGrid}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.positionButton,
                      posicao === item && styles.optionButtonSelected,
                    ]}
                    onPress={() => setPosicao(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        posicao === item && styles.optionTextSelected,
                      ]}
                    >
                      P{item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Novo localizador</Text>
                <Text style={styles.previewValue}>
                  {montarLocalizador() || "Selecione todas as opções"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Local</Text>

              <TextInput
                style={styles.input}
                placeholder="Ex.: Bancada, Oficina, Corredor..."
                value={localLivre}
                onChangeText={setLocalLivre}
              />

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Novo localizador</Text>
                <Text style={styles.previewValue}>
                  {localLivre.trim() || "-"}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, salvando && styles.disabledBtn]}
            disabled={salvando}
            onPress={salvarLocalizador}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salvar localizador</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            disabled={salvando}
            onPress={() => setEditandoLocalizador(false)}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,
          selected && styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: "#fff",
  },

  modalContent: {
    padding: 20,
    paddingBottom: 40,
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

  resumo: {
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 10,
    gap: 5,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },

  optionButton: {
    flexGrow: 1,
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },

  optionButtonSelected: {
    backgroundColor: "#1565c0",
    borderColor: "#1565c0",
  },

  optionText: {
    color: "#111827",
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#fff",
  },

  positionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },

  positionButton: {
    width: "22%",
    minWidth: 65,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },

  previewBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 14,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 20,
  },

  previewLabel: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },

  previewValue: {
    color: "#1e3a8a",
    fontSize: 22,
    fontWeight: "800",
  },

  saveBtn: {
    backgroundColor: "#0b3d2e",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  cancelBtn: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  cancelText: {
    color: "#374151",
    fontWeight: "bold",
  },
});
