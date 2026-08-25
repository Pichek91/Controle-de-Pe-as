import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    API_KEY,
    API_URL,
} from "../../../src/modules/config/api";


type Estante = "A" | "B" | null;

type InventarioItem = {
  id: number | string;
  patrimonio: string;
  localizador_fisico: string;
  conferido_em?: string;

  situacao:
    | "ok"
    | "local_divergente"
    | "nao_cadastrada";

  sistema?: {
    id?: number | string;
    modelo?: string;
    localizador?: string;
  } | null;
};

type InventarioResultado = {
  total_sistema?: number;
  total_encontradas?: number;
  corretas?: number;
  local_divergente?: number;
  nao_encontradas?: number;
  nao_cadastradas?: number;

  itens_corretos?: any[];
  itens_divergentes?: any[];
  itens_nao_encontrados?: any[];
  itens_nao_cadastrados?: any[];
};

type Inventario = {
  id: number | string;

  status:
    | "em_andamento"
    | "finalizado";

  criado_em?: string;
  finalizado_em?: string;

  responsavel?: string;
  observacoes?: string;

  total_snapshot?: number;

  snapshot?: any[];

  itens?: InventarioItem[];

  resultado?: InventarioResultado | null;
};

type Tela =
  | "historico"
  | "conferencia"
  | "resultado";


export default function InventarioScreen() {

  const [
    inventarios,
    setInventarios
  ] = useState<Inventario[]>([]);

  const [
    inventarioAtual,
    setInventarioAtual
  ] = useState<Inventario | null>(null);

  const [
    tela,
    setTela
  ] = useState<Tela>("historico");

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    salvando,
    setSalvando
  ] = useState(false);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);


  /* =========================================================
     MODAL NOVO INVENTÁRIO
  ========================================================= */

  const [
    modalNovoInventario,
    setModalNovoInventario
  ] = useState(false);

  const [
    responsavelNovoInventario,
    setResponsavelNovoInventario
  ] = useState("");


  /* =========================================================
     LOCAL
  ========================================================= */

  const [
    emEstante,
    setEmEstante
  ] = useState(true);

  const [
    estante,
    setEstante
  ] = useState<Estante>(null);

  const [
    altura,
    setAltura
  ] = useState<number | null>(null);

  const [
    posicao,
    setPosicao
  ] = useState<number | null>(null);

  const [
    localLivre,
    setLocalLivre
  ] = useState("");


  /* =========================================================
     PATRIMÔNIO
  ========================================================= */

  const [
    patrimonio,
    setPatrimonio
  ] = useState("");

  const [
    mensagem,
    setMensagem
  ] = useState<{
    tipo:
      | "ok"
      | "divergente"
      | "nao_cadastrada"
      | "duplicado"
      | "erro"
      | null;

    titulo?: string;
    detalhe?: string;
  }>({
    tipo: null,
  });


  const inputPtRef =
    useRef<TextInput>(null);


  /* =========================================================
     CARREGAR HISTÓRICO
  ========================================================= */

  async function carregarInventarios() {

    try {

      setLoading(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios`,
          {
            headers: {
              "x-api-key": API_KEY,
            },
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao carregar inventários."
        );

      }

      setInventarios(
        Array.isArray(dados)
          ? dados
          : []
      );

    } catch (erro: any) {

      console.log(
        "Erro ao carregar inventários:",
        erro
      );

      Alert.alert(
        "Erro",
        erro?.message ||
        "Não foi possível carregar os inventários."
      );

    } finally {

      setLoading(false);

    }
  }


  async function atualizarLista() {

    setRefreshing(true);

    await carregarInventarios();

    setRefreshing(false);

  }


  useEffect(() => {

    carregarInventarios();

  }, []);


  /* =========================================================
     NOVO INVENTÁRIO
  ========================================================= */

  function iniciarNovoInventario() {

    setResponsavelNovoInventario("");

    setModalNovoInventario(true);

  }


  async function confirmarNovoInventario() {

    const responsavel =
      responsavelNovoInventario.trim();

    if (!responsavel) {

      Alert.alert(
        "Responsável",
        "Informe o responsável pelo inventário."
      );

      return;
    }


    try {

      setSalvando(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-api-key":
                API_KEY,
            },

            body:
              JSON.stringify({
                responsavel,
              }),
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao iniciar inventário."
        );

      }

      setModalNovoInventario(false);

      setInventarioAtual(dados);

      resetarLocal();

      setMensagem({
        tipo: null,
      });

      setTela("conferencia");

      setTimeout(() => {
        inputPtRef.current?.focus();
      }, 300);

    } catch (erro: any) {

      Alert.alert(
        "Erro",
        erro?.message ||
        "Não foi possível iniciar o inventário."
      );

    } finally {

      setSalvando(false);

    }
  }


  /* =========================================================
     CONTINUAR INVENTÁRIO
  ========================================================= */

  async function continuarInventario(
    id: number | string
  ) {

    try {

      setLoading(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios/${id}`,
          {
            headers: {
              "x-api-key": API_KEY,
            },
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao carregar inventário."
        );

      }

      setInventarioAtual(dados);

      resetarLocal();

      setMensagem({
        tipo: null,
      });

      setTela("conferencia");

    } catch (erro: any) {

      Alert.alert(
        "Erro",
        erro?.message ||
        "Não foi possível carregar o inventário."
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================================
     LOCALIZADOR
  ========================================================= */

  function montarLocalizador() {

    if (!emEstante) {
      return localLivre.trim();
    }

    if (
      !estante ||
      !altura ||
      !posicao
    ) {
      return "";
    }

    return `E${estante}-A${altura}-P${posicao}`;
  }


  function resetarLocal() {

    setEmEstante(true);

    setEstante(null);

    setAltura(null);

    setPosicao(null);

    setLocalLivre("");

    setPatrimonio("");

  }


  const localAtual =
    useMemo(
      () =>
        montarLocalizador(),
      [
        emEstante,
        estante,
        altura,
        posicao,
        localLivre,
      ]
    );


  /* =========================================================
     CONFERIR PT
  ========================================================= */

  async function conferirPatrimonio() {

    const pt =
      patrimonio.trim();

    if (!inventarioAtual) {
      return;
    }

    if (!localAtual) {

      Alert.alert(
        "Local",
        emEstante
          ? "Selecione estante, altura e posição."
          : "Digite o local físico."
      );

      return;
    }

    if (!pt) {
      return;
    }


    try {

      setSalvando(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios/${inventarioAtual.id}/item`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-api-key":
                API_KEY,
            },

            body:
              JSON.stringify({
                patrimonio: pt,
                localizador: localAtual,
              }),
          }
        );

      const dados =
        await resposta.json();


      if (
        resposta.status === 409 &&
        dados?.duplicado
      ) {

        const item =
          dados.item;

        setMensagem({
          tipo: "duplicado",

          titulo:
            `PT ${pt} já foi conferido`,

          detalhe:
            `Local anterior: ${
              item?.localizador_fisico ||
              "-"
            }`,
        });

        setPatrimonio("");

        setTimeout(
          () => {
            inputPtRef
              .current
              ?.focus();
          },
          100
        );

        return;
      }


      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao conferir patrimônio."
        );

      }


      const item =
        dados.item as InventarioItem;


      setInventarioAtual(
        atual => {

          if (!atual) {
            return atual;
          }

          return {
            ...atual,

            itens: [
              ...(atual.itens || []),
              item,
            ],
          };

        }
      );


      if (
        item.situacao === "ok"
      ) {

        setMensagem({
          tipo: "ok",

          titulo:
            `PT ${item.patrimonio}`,

          detalhe:
            "Local correto.",
        });

      }

      else if (
        item.situacao ===
        "local_divergente"
      ) {

        setMensagem({
          tipo: "divergente",

          titulo:
            `PT ${item.patrimonio}`,

          detalhe:
            `Sistema: ${
              item.sistema?.localizador ||
              "SEM LOCAL"
            }\nFísico: ${
              item.localizador_fisico
            }`,
        });

      }

      else {

        setMensagem({
          tipo: "nao_cadastrada",

          titulo:
            `PT ${item.patrimonio}`,

          detalhe:
            "Encontrado fisicamente, mas não existe no estoque do sistema.",
        });

      }


      setPatrimonio("");

      setTimeout(
        () => {
          inputPtRef
            .current
            ?.focus();
        },
        100
      );

    } catch (erro: any) {

      console.log(
        "Erro ao conferir PT:",
        erro
      );

      setMensagem({
        tipo: "erro",

        titulo: "Erro",

        detalhe:
          erro?.message ||
          "Não foi possível conferir o patrimônio.",
      });

    } finally {

      setSalvando(false);

    }
  }


  /* =========================================================
     FINALIZAR
  ========================================================= */

  function solicitarFinalizacao() {

    const total =
      inventarioAtual
        ?.itens
        ?.length ||
      0;

    Alert.alert(
      "Finalizar Inventário",
      `${total} patrimônio(s) foram conferidos.\n\nDeseja finalizar agora?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },

        {
          text: "Finalizar",
          style: "destructive",
          onPress: finalizarInventario,
        },
      ]
    );
  }


  async function finalizarInventario() {

    if (!inventarioAtual) {
      return;
    }

    try {

      setSalvando(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios/${inventarioAtual.id}/finalizar`,
          {
            method: "POST",

            headers: {
              "x-api-key": API_KEY,
            },
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao finalizar inventário."
        );

      }

      setInventarioAtual(dados);

      setTela("resultado");

      await carregarInventarios();

    } catch (erro: any) {

      Alert.alert(
        "Erro",
        erro?.message ||
        "Não foi possível finalizar o inventário."
      );

    } finally {

      setSalvando(false);

    }
  }


  /* =========================================================
     VER RESULTADO
  ========================================================= */

  async function verResultado(
    id: number | string
  ) {

    try {

      setLoading(true);

      const resposta =
        await fetch(
          `${API_URL}/inventarios/${id}`,
          {
            headers: {
              "x-api-key": API_KEY,
            },
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {

        throw new Error(
          dados?.erro ||
          "Erro ao carregar resultado."
        );

      }

      setInventarioAtual(dados);

      setTela("resultado");

    } catch (erro: any) {

      Alert.alert(
        "Erro",
        erro?.message ||
        "Não foi possível carregar o resultado."
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading &&
    tela === "historico"
  ) {

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text>
          Carregando inventários...
        </Text>
      </View>
    );
  }


  /* =========================================================
     RESULTADO
  ========================================================= */

  if (
    tela === "resultado" &&
    inventarioAtual
  ) {

    const resultado =
      inventarioAtual.resultado || {};

    const divergentes =
      resultado.itens_divergentes || [];

    const ausentes =
      resultado.itens_nao_encontrados || [];

    const naoCadastrados =
      resultado.itens_nao_cadastrados || [];


    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.headerRow}>

          <View>
            <Text style={styles.header}>
              Resultado
            </Text>

            <Text style={styles.muted}>
              Inventário #{inventarioAtual.id}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {

              setTela("historico");

              setInventarioAtual(null);

              carregarInventarios();

            }}
          >
            <Text style={styles.secondaryBtnText}>
              Voltar
            </Text>
          </TouchableOpacity>

        </View>


        <View style={styles.resultGrid}>

          <ResultCard
            label="Sistema"
            value={
              resultado.total_sistema ||
              0
            }
          />

          <ResultCard
            label="Encontradas"
            value={
              resultado.total_encontradas ||
              0
            }
          />

          <ResultCard
            label="Corretas"
            value={
              resultado.corretas ||
              0
            }
          />

          <ResultCard
            label="Divergentes"
            value={
              resultado.local_divergente ||
              0
            }
          />

          <ResultCard
            label="Ausentes"
            value={
              resultado.nao_encontradas ||
              0
            }
          />

          <ResultCard
            label="Não cadastradas"
            value={
              resultado.nao_cadastradas ||
              0
            }
          />

        </View>


        {divergentes.length > 0 && (

          <View style={styles.resultSection}>

            <Text style={styles.resultTitleWarning}>
              ⚠️ Localização divergente
            </Text>

            {divergentes.map(
              (item: any) => (

                <View
                  key={String(item.id)}
                  style={styles.resultItem}
                >

                  <Text style={styles.itemPt}>
                    PT {item.patrimonio}
                  </Text>

                  <Text>
                    Sistema:{" "}
                    {
                      item.sistema
                        ?.localizador ||
                      "SEM LOCAL"
                    }
                  </Text>

                  <Text>
                    Encontrado:{" "}
                    {item.localizador_fisico}
                  </Text>

                </View>

              )
            )}

          </View>

        )}


        {naoCadastrados.length > 0 && (

          <View style={styles.resultSection}>

            <Text style={styles.resultTitleInfo}>
              ❓ Não cadastradas
            </Text>

            {naoCadastrados.map(
              (item: any) => (

                <View
                  key={String(item.id)}
                  style={styles.resultItem}
                >

                  <Text style={styles.itemPt}>
                    PT {item.patrimonio}
                  </Text>

                  <Text>
                    Local físico:{" "}
                    {item.localizador_fisico}
                  </Text>

                </View>

              )
            )}

          </View>

        )}


        {ausentes.length > 0 && (

          <View style={styles.resultSection}>

            <Text style={styles.resultTitleDanger}>
              ❌ No sistema, mas não encontradas
            </Text>

            {ausentes.map(
              (item: any) => (

                <View
                  key={String(item.id)}
                  style={styles.resultItem}
                >

                  <Text style={styles.itemPt}>
                    PT {item.patrimonio}
                  </Text>

                  <Text numberOfLines={2}>
                    {item.modelo}
                  </Text>

                  <Text>
                    Sistema:{" "}
                    {
                      item.localizador ||
                      "SEM LOCAL"
                    }
                  </Text>

                </View>

              )
            )}

          </View>

        )}

      </ScrollView>
    );
  }


  /* =========================================================
     CONFERÊNCIA
  ========================================================= */

  if (
    tela === "conferencia" &&
    inventarioAtual
  ) {

    const itens =
      [
        ...(inventarioAtual.itens || []),
      ].reverse();


    return (
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.headerRow}>

          <View>

            <Text style={styles.header}>
              Inventário
            </Text>

            <Text style={styles.muted}>
              {
                inventarioAtual
                  .itens?.length ||
                0
              }{" "}
              de{" "}
              {
                inventarioAtual
                  .total_snapshot ||
                inventarioAtual
                  .snapshot
                  ?.length ||
                0
              }{" "}
              conferidas
            </Text>

          </View>


          <TouchableOpacity
            style={styles.finishBtn}
            onPress={solicitarFinalizacao}
          >
            <Text style={styles.buttonText}>
              Finalizar
            </Text>
          </TouchableOpacity>

        </View>


        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Local físico
          </Text>


          <View style={styles.optionRow}>

            <OptionButton
              label="ESTANTE"
              selected={emEstante}
              onPress={() => {

                setEmEstante(true);

                setLocalLivre("");

              }}
            />

            <OptionButton
              label="OUTRO"
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

              <Text style={styles.fieldLabel}>
                Estante
              </Text>

              <View style={styles.optionRow}>

                {(["A", "B"] as const).map(
                  item => (

                    <OptionButton
                      key={item}
                      label={`Estante ${item}`}
                      selected={
                        estante === item
                      }
                      onPress={() =>
                        setEstante(item)
                      }
                    />

                  )
                )}

              </View>


              <Text style={styles.fieldLabel}>
                Altura
              </Text>

              <View style={styles.optionRow}>

                {[1, 2, 3].map(
                  item => (

                    <OptionButton
                      key={item}
                      label={`A${item}`}
                      selected={
                        altura === item
                      }
                      onPress={() =>
                        setAltura(item)
                      }
                    />

                  )
                )}

              </View>


              <Text style={styles.fieldLabel}>
                Posição
              </Text>

              <View style={styles.positionsGrid}>

                {Array.from(
                  { length: 14 },
                  (_, i) => i + 1
                ).map(
                  item => (

                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.positionButton,

                        posicao === item &&
                        styles.optionButtonSelected,
                      ]}
                      onPress={() =>
                        setPosicao(item)
                      }
                    >

                      <Text
                        style={[
                          styles.optionText,

                          posicao === item &&
                          styles.optionTextSelected,
                        ]}
                      >
                        P{item}
                      </Text>

                    </TouchableOpacity>

                  )
                )}

              </View>

            </>
          ) : (
            <>

              <Text style={styles.fieldLabel}>
                Local
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Ex.: CORREDOR CENTRAL, BANCADA 4..."
                value={localLivre}
                onChangeText={setLocalLivre}
                autoCapitalize="characters"
              />

            </>
          )}


          <View style={styles.localPreview}>

            <Text style={styles.localPreviewLabel}>
              Local atual
            </Text>

            <Text style={styles.localPreviewValue}>
              {localAtual || "Selecione o local"}
            </Text>

          </View>

        </View>


        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Patrimônio
          </Text>


          <TextInput
            ref={inputPtRef}
            style={styles.ptInput}
            placeholder="Digite o PT"
            value={patrimonio}
            onChangeText={setPatrimonio}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={conferirPatrimonio}
            editable={!salvando}
          />


          <TouchableOpacity
            style={[
              styles.checkBtn,

              salvando &&
              styles.disabled,
            ]}
            disabled={salvando}
            onPress={conferirPatrimonio}
          >

            {salvando ? (

              <ActivityIndicator
                color="#fff"
              />

            ) : (

              <Text style={styles.buttonText}>
                Conferir
              </Text>

            )}

          </TouchableOpacity>


          {mensagem.tipo && (

            <MensagemCard
              tipo={mensagem.tipo}
              titulo={mensagem.titulo}
              detalhe={mensagem.detalhe}
            />

          )}

        </View>


        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Últimas conferências
          </Text>


          {itens.length === 0 ? (

            <Text style={styles.muted}>
              Nenhum patrimônio conferido.
            </Text>

          ) : (

            itens
              .slice(0, 30)
              .map(
                item => (

                  <InventarioItemRow
                    key={String(item.id)}
                    item={item}
                  />

                )
              )

          )}

        </View>

      </ScrollView>
    );
  }


  /* =========================================================
     HISTÓRICO
  ========================================================= */

  return (
    <View style={styles.container}>

      <View style={styles.headerRow}>

        <Text style={styles.header}>
          Inventário
        </Text>


        <TouchableOpacity
          style={styles.newBtn}
          disabled={salvando}
          onPress={iniciarNovoInventario}
        >

          {salvando ? (

            <ActivityIndicator
              color="#fff"
            />

          ) : (

            <Text style={styles.buttonText}>
              + Novo
            </Text>

          )}

        </TouchableOpacity>

      </View>


      <FlatList
        data={inventarios}
        keyExtractor={
          item =>
            String(item.id)
        }
        refreshing={refreshing}
        onRefresh={atualizarLista}
        contentContainerStyle={{
          paddingBottom: 30,
        }}

        ListEmptyComponent={
          <View style={styles.emptyCard}>

            <Text style={styles.emptyIcon}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              Nenhum inventário
            </Text>

            <Text style={styles.muted}>
              Toque em + Novo para iniciar.
            </Text>

          </View>
        }

        renderItem={({ item }) => {

          const finalizado =
            item.status === "finalizado";

          return (
            <View style={styles.historyCard}>

              <View style={styles.historyTop}>

                <View style={{ flex: 1 }}>

                  <Text style={styles.historyTitle}>
                    Inventário
                  </Text>

                  <Text style={styles.muted}>
                    {formatarData(item.criado_em)}
                  </Text>

                  {!!item.responsavel && (

                    <Text style={styles.historyResponsible}>
                      Responsável:{" "}
                      {item.responsavel}
                    </Text>

                  )}

                </View>


                <View
                  style={[
                    styles.badge,

                    finalizado
                      ? styles.badgeDone
                      : styles.badgeOpen,
                  ]}
                >

                  <Text
                    style={[
                      styles.badgeText,

                      finalizado
                        ? styles.badgeDoneText
                        : styles.badgeOpenText,
                    ]}
                  >
                    {finalizado
                      ? "Finalizado"
                      : "Em andamento"}
                  </Text>

                </View>

              </View>


              <View style={styles.historyStats}>

                <Text>
                  Sistema:{" "}
                  <Text style={styles.bold}>
                    {
                      item.total_snapshot ||
                      item.snapshot?.length ||
                      0
                    }
                  </Text>
                </Text>

                <Text>
                  Conferidas:{" "}
                  <Text style={styles.bold}>
                    {
                      item.itens?.length ||
                      0
                    }
                  </Text>
                </Text>

              </View>


              <TouchableOpacity
                style={
                  finalizado
                    ? styles.secondaryBtnFull
                    : styles.primaryBtnFull
                }
                onPress={() => {

                  if (finalizado) {

                    verResultado(item.id);

                  } else {

                    continuarInventario(item.id);

                  }

                }}
              >

                <Text
                  style={
                    finalizado
                      ? styles.secondaryBtnText
                      : styles.buttonText
                  }
                >
                  {finalizado
                    ? "Ver resultado"
                    : "Continuar inventário"}
                </Text>

              </TouchableOpacity>

            </View>
          );

        }}
      />


      {/* =====================================================
          MODAL NOVO INVENTÁRIO
      ====================================================== */}

      <Modal
        visible={modalNovoInventario}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalNovoInventario(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              Novo Inventário
            </Text>

            <Text style={styles.modalLabel}>
              Responsável
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Digite o nome do responsável"
              value={responsavelNovoInventario}
              onChangeText={
                setResponsavelNovoInventario
              }
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={
                confirmarNovoInventario
              }
            />


            <View style={styles.modalButtons}>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                disabled={salvando}
                onPress={() =>
                  setModalNovoInventario(false)
                }
              >
                <Text style={styles.modalCancelText}>
                  Cancelar
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,

                  salvando &&
                  styles.disabled,
                ]}
                disabled={salvando}
                onPress={
                  confirmarNovoInventario
                }
              >

                {salvando ? (

                  <ActivityIndicator
                    color="#fff"
                  />

                ) : (

                  <Text style={styles.buttonText}>
                    Iniciar
                  </Text>

                )}

              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

    </View>
  );
}


/* =========================================================
   COMPONENTES
========================================================= */

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

        selected &&
        styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >

      <Text
        style={[
          styles.optionText,

          selected &&
          styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>

    </TouchableOpacity>
  );
}


function InventarioItemRow({
  item,
}: {
  item: InventarioItem;
}) {

  let backgroundColor =
    "#f0fdf4";

  let icon =
    "✅";

  let status =
    "Correto";


  if (
    item.situacao ===
    "local_divergente"
  ) {

    backgroundColor =
      "#fffbeb";

    icon =
      "⚠️";

    status =
      "Divergente";
  }


  if (
    item.situacao ===
    "nao_cadastrada"
  ) {

    backgroundColor =
      "#eff6ff";

    icon =
      "❓";

    status =
      "Não cadastrada";
  }


  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor,
        },
      ]}
    >

      <View style={{ flex: 1 }}>

        <Text style={styles.itemPt}>
          {icon} PT {item.patrimonio}
        </Text>

        <Text style={styles.itemLocal}>
          {item.localizador_fisico}
        </Text>

      </View>


      <Text style={styles.itemStatus}>
        {status}
      </Text>

    </View>
  );
}


function MensagemCard({
  tipo,
  titulo,
  detalhe,
}: {
  tipo: string | null;
  titulo?: string;
  detalhe?: string;
}) {

  let backgroundColor =
    "#f0fdf4";

  let borderColor =
    "#bbf7d0";

  let color =
    "#166534";

  let icon =
    "✅";


  if (
    tipo === "divergente"
  ) {

    backgroundColor =
      "#fffbeb";

    borderColor =
      "#fde68a";

    color =
      "#92400e";

    icon =
      "⚠️";
  }


  if (
    tipo === "nao_cadastrada" ||
    tipo === "duplicado"
  ) {

    backgroundColor =
      "#eff6ff";

    borderColor =
      "#bfdbfe";

    color =
      "#1e40af";

    icon =
      tipo === "duplicado"
        ? "⚠️"
        : "❓";
  }


  if (
    tipo === "erro"
  ) {

    backgroundColor =
      "#fff1f2";

    borderColor =
      "#fecdd3";

    color =
      "#9f1239";

    icon =
      "❌";
  }


  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor,
          borderColor,
        },
      ]}
    >

      <Text
        style={[
          styles.messageTitle,
          {
            color,
          },
        ]}
      >
        {icon} {titulo}
      </Text>

      {!!detalhe && (

        <Text
          style={{
            color,
            marginTop: 5,
          }}
        >
          {detalhe}
        </Text>

      )}

    </View>
  );
}


function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {

  return (
    <View style={styles.resultCard}>

      <Text style={styles.resultCardLabel}>
        {label}
      </Text>

      <Text style={styles.resultCardValue}>
        {value}
      </Text>

    </View>
  );
}


function formatarData(
  value?: string
) {

  if (!value) {
    return "-";
  }

  try {

    return new Date(
      value
    ).toLocaleString(
      "pt-BR"
    );

  } catch {

    return value;

  }
}


/* =========================================================
   ESTILOS
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      padding: 16,
      backgroundColor: "#f4f6f9",
    },

    scrollContent: {
      paddingBottom: 40,
    },

    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 15,
    },

    header: {
      fontSize: 24,
      fontWeight: "800",
      color: "#1e293b",
    },

    muted: {
      color: "#64748b",
    },

    bold: {
      fontWeight: "700",
    },

    newBtn: {
      backgroundColor: "#0b3d2e",
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 8,
      minWidth: 85,
      alignItems: "center",
    },

    finishBtn: {
      backgroundColor: "#c62828",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
    },

    checkBtn: {
      backgroundColor: "#0b3d2e",
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
    },

    disabled: {
      opacity: 0.6,
    },

    buttonText: {
      color: "#fff",
      fontWeight: "700",
    },

    secondaryBtn: {
      backgroundColor: "#e5e7eb",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
    },

    secondaryBtnText: {
      color: "#374151",
      fontWeight: "700",
    },

    card: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 15,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1e293b",
      marginBottom: 12,
    },

    fieldLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
      marginTop: 6,
      marginBottom: 8,
    },

    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginBottom: 14,
    },

    optionButton: {
      flexGrow: 1,
      minWidth: 90,
      paddingVertical: 11,
      paddingHorizontal: 12,
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
      gap: 7,
      marginBottom: 12,
    },

    positionButton: {
      width: "22%",
      minWidth: 60,
      paddingVertical: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#d1d5db",
      backgroundColor: "#fff",
      alignItems: "center",
    },

    input: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },

    localPreview: {
      backgroundColor: "#eff6ff",
      borderWidth: 1,
      borderColor: "#bfdbfe",
      padding: 14,
      borderRadius: 10,
      marginTop: 5,
    },

    localPreviewLabel: {
      color: "#1e40af",
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 4,
    },

    localPreviewValue: {
      color: "#1e3a8a",
      fontSize: 23,
      fontWeight: "800",
    },

    ptInput: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#cbd5e1",
      borderRadius: 8,
      padding: 13,
      fontSize: 22,
      fontWeight: "800",
      textTransform: "uppercase",
    },

    messageCard: {
      borderWidth: 1,
      borderRadius: 9,
      padding: 12,
      marginTop: 12,
    },

    messageTitle: {
      fontWeight: "800",
      fontSize: 15,
    },

    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      padding: 11,
      borderRadius: 8,
      marginBottom: 7,
    },

    itemPt: {
      fontWeight: "800",
      color: "#1e293b",
    },

    itemLocal: {
      marginTop: 3,
      fontSize: 12,
      color: "#64748b",
    },

    itemStatus: {
      fontSize: 12,
      fontWeight: "700",
      color: "#475569",
    },

    emptyCard: {
      marginTop: 30,
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 30,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    emptyIcon: {
      fontSize: 38,
      marginBottom: 8,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 4,
    },

    historyCard: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    historyTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },

    historyTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#1e293b",
    },

    historyResponsible: {
      marginTop: 5,
      color: "#334155",
    },

    historyStats: {
      flexDirection: "row",
      gap: 15,
      flexWrap: "wrap",
      marginTop: 12,
      marginBottom: 12,
    },

    badge: {
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 20,
    },

    badgeDone: {
      backgroundColor: "#f0fdf4",
    },

    badgeOpen: {
      backgroundColor: "#fffbeb",
    },

    badgeText: {
      fontSize: 11,
      fontWeight: "800",
    },

    badgeDoneText: {
      color: "#166534",
    },

    badgeOpenText: {
      color: "#92400e",
    },

    primaryBtnFull: {
      backgroundColor: "#0b3d2e",
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },

    secondaryBtnFull: {
      backgroundColor: "#e5e7eb",
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },

    resultGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginBottom: 15,
    },

    resultCard: {
      width: "47%",
      backgroundColor: "#fff",
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    resultCardLabel: {
      fontSize: 12,
      color: "#64748b",
      marginBottom: 4,
    },

    resultCardValue: {
      fontSize: 25,
      fontWeight: "800",
      color: "#1e293b",
    },

    resultSection: {
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    },

    resultTitleWarning: {
      fontSize: 16,
      fontWeight: "800",
      color: "#92400e",
      marginBottom: 10,
    },

    resultTitleDanger: {
      fontSize: 16,
      fontWeight: "800",
      color: "#9f1239",
      marginBottom: 10,
    },

    resultTitleInfo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#1e40af",
      marginBottom: 10,
    },

    resultItem: {
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
    },


    /* =====================================================
       MODAL NOVO INVENTÁRIO
    ====================================================== */

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 20,
    },

    modalBox: {
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 20,
    },

    modalTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#1e293b",
      marginBottom: 18,
    },

    modalLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
      marginBottom: 6,
    },

    modalButtons: {
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
    },

    modalCancelBtn: {
      flex: 1,
      backgroundColor: "#e5e7eb",
      padding: 13,
      borderRadius: 8,
      alignItems: "center",
    },

    modalCancelText: {
      color: "#374151",
      fontWeight: "700",
    },

    modalConfirmBtn: {
      flex: 1,
      backgroundColor: "#0b3d2e",
      padding: 13,
      borderRadius: 8,
      alignItems: "center",
    },

  });