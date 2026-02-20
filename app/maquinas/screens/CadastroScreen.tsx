import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { criarMaquina } from "../../../src/modules/maquinas/services/maquinasService";

// Tipos leves para manter o que já funciona e evitar undefined
type Vinculo = "nao" | "sim";
type Seguimento = "FOOD" | "OSC" | "LARGE OFFICE" | "OTG" | "OUTROS";
type Status = "Estoque" | "Em Campo" | "Reparo" | "Sucata" | "Separar Envio";
type FotoAsset = { uri: string; width?: number; height?: number; fileName?: string };

export default function CadastroScreen() {
  const [patrimonio, setPatrimonio] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [maquinaVinculada, setMaquinaVinculada] = useState<Vinculo>("nao");
  const [cliente, setCliente] = useState("");
  const [os, setOs] = useState("");
  const [localizador, setLocalizador] = useState("");
  const [situacaoEquipamento, setSituacaoEquipamento] = useState("");
  const [seguimento, setSeguimento] = useState<Seguimento>("OUTROS");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<Status>("Estoque");
  const [foto, setFoto] = useState<FotoAsset | null>(null);
  const [loading, setLoading] = useState(false);

  async function selecionarFoto() {
    try {
      // 1) Pede permissão da câmera antes de abrir
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Habilite o acesso à câmera para tirar foto.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: false,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.length) {
        setFoto(result.assets[0] as FotoAsset);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("Erro", "Falha ao abrir a câmera.");
    }
  }

  async function handleSalvar() {
    if (!patrimonio || !fabricante || !modelo || !localizador) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);

      await criarMaquina({
        patrimonio,
        fabricante,
        modelo,
        numero_serie: numeroSerie,
        maquina_vinculada: maquinaVinculada,
        cliente: maquinaVinculada === "sim" ? cliente : "",
        os: maquinaVinculada === "sim" ? os : "",
        localizador,
        situacao_equipamento: situacaoEquipamento,
        observacoes,
        seguimento,
        status,
        // 2) Envia somente a URI da foto (evita problemas de serialização/compat)
        foto: foto ? { uri: foto.uri } : undefined,
      });

      Alert.alert("Sucesso", "Máquina cadastrada com sucesso!");

      // limpa campos
      setPatrimonio("");
      setFabricante("");
      setModelo("");
      setNumeroSerie("");
      setCliente("");
      setOs("");
      setLocalizador("");
      setObservacoes("");
      setFoto(null);
    } catch (error) {
      console.log("Erro ao criar máquina:", error);
      Alert.alert("Erro", "Não foi possível cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro de Máquina</Text>

      <Input label="Patrimônio *" value={patrimonio} setValue={setPatrimonio} />
      <Input label="Fabricante *" value={fabricante} setValue={setFabricante} />
      <Input label="Modelo *" value={modelo} setValue={setModelo} />
      <Input label="N° de Série" value={numeroSerie} setValue={setNumeroSerie} />

      <Text style={styles.label}>Máquina Vinculada?</Text>
      <Picker
        selectedValue={maquinaVinculada}
        onValueChange={(itemValue: Vinculo) => setMaquinaVinculada(itemValue)}
      >
        <Picker.Item label="Não" value="nao" />
        <Picker.Item label="Sim" value="sim" />
      </Picker>

      {maquinaVinculada === "sim" && (
        <>
          <Input label="Cliente" value={cliente} setValue={setCliente} />
          <Input label="OS" value={os} setValue={setOs} />
        </>
      )}

      <Input label="Localizador *" value={localizador} setValue={setLocalizador} />
      <Input
        label="Situação do Equipamento"
        value={situacaoEquipamento}
        setValue={setSituacaoEquipamento}
      />

      <Text style={styles.label}>Seguimento</Text>
      <Picker
        selectedValue={seguimento}
        onValueChange={(val: Seguimento) => setSeguimento(val)}
      >
        <Picker.Item label="FOOD" value="FOOD" />
        <Picker.Item label="OSC" value="OSC" />
        <Picker.Item label="LARGE OFFICE" value="LARGE OFFICE" />
        <Picker.Item label="OTG" value="OTG" />
        <Picker.Item label="OUTROS" value="OUTROS" />
      </Picker>

      <Text style={styles.label}>Status</Text>
      <Picker selectedValue={status} onValueChange={(val: Status) => setStatus(val)}>
        <Picker.Item label="Estoque" value="Estoque" />
        <Picker.Item label="Em Campo" value="Em Campo" />
        <Picker.Item label="Reparo" value="Reparo" />
        <Picker.Item label="Sucata" value="Sucata" />
        <Picker.Item label="Separar Envio" value="Separar Envio" />
      </Picker>

      <Input
        label="Observações"
        value={observacoes}
        setValue={setObservacoes}
        multiline
      />

      <TouchableOpacity style={styles.buttonFoto} onPress={selecionarFoto}>
        <Text style={styles.buttonText}>Tirar Foto</Text>
      </TouchableOpacity>

      {foto?.uri ? <Image source={{ uri: foto.uri }} style={styles.preview} /> : null}

      <TouchableOpacity style={styles.button} onPress={handleSalvar} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Salvando..." : "Salvar"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Input({
  label,
  value,
  setValue,
  multiline = false,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 100 }]}
        value={value}
        onChangeText={setValue}
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { marginTop: 10, fontWeight: "600" },
  input: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#0dc50dbe",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonFoto: {
    backgroundColor: "#334155",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  preview: {
    width: "100%",
    height: 200,
    marginTop: 15,
    borderRadius: 8,
  },
});