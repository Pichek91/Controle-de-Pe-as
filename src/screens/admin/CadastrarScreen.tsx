import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENDPOINTS } from '../../config';

export default function CadastrarScreen() {
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);

  const [form, setForm] = useState({
    nome: '',
    marca: '',
    modelo: '',
    codigo: '',
    quantidade: '',
    estoqueMin: '',
    estoqueMax: '',
  });

  const [imageUri, setImageUri] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // FORMULÁRIO
  // =====================================================

  const handleChange = (
    name: string,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // AJUSTE DO SCROLL QUANDO CAMPO RECEBE FOCO
  // =====================================================

  const mostrarCampoAtivo = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 250);
  };

  // =====================================================
  // GALERIA
  // =====================================================

  const pickImageFromGallery =
    async () => {
      const perm =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert(
          'Permissão negada',
          'É necessário permitir acesso à galeria.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });

      if (!result.canceled) {
        setImageUri(
          result.assets[0].uri
        );
      }
    };

  // =====================================================
  // CÂMERA
  // =====================================================

  const pickImageFromCamera =
    async () => {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permissão negada',
          'É necessário permitir acesso à câmera.'
        );

        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.85,
        });

      if (!result.canceled) {
        setImageUri(
          result.assets[0].uri
        );
      }
    };

  // =====================================================
  // CADASTRAR PEÇA
  // =====================================================

  const cadastrarPeca =
    async () => {
      // Validação dos campos
      for (const key in form) {
        if (
          !form[
            key as keyof typeof form
          ]
        ) {
          Alert.alert(
            'Erro',
            `O campo ${key} não pode estar vazio.`
          );

          return;
        }
      }

      // Imagem obrigatória
      if (!imageUri) {
        Alert.alert(
          'Erro',
          'É necessário tirar uma foto ou selecionar da galeria.'
        );

        return;
      }

      setLoading(true);

      try {
        // ===============================================
        // VALIDAR DUPLICIDADE
        // ===============================================

        const response =
          await axios.get(
            ENDPOINTS.pecas,
            {
              timeout: 15000,
            }
          );

        if (
          !response.data ||
          !Array.isArray(
            response.data
          )
        ) {
          setLoading(false);

          Alert.alert(
            'Erro',
            'Não foi possível validar duplicidade. Tente novamente.'
          );

          return;
        }

        const existe =
          response.data.some(
            (p: any) =>
              p?.nome ===
                form.nome ||
              p?.codigo ===
                form.codigo
          );

        if (existe) {
          setLoading(false);

          Alert.alert(
            'Erro',
            'Peça já cadastrada com este nome ou código.'
          );

          return;
        }

        // ===============================================
        // MULTIPART
        // ===============================================

        const data =
          new FormData();

        Object.keys(
          form
        ).forEach((key) => {
          data.append(
            key,
            form[
              key as keyof typeof form
            ]
          );
        });

        const filename =
          `imagem_${Date.now()}.jpg`;

        data.append(
          'imagem',
          {
            uri: imageUri,
            name: filename,
            type: 'image/jpeg',
          } as any
        );

        // ===============================================
        // ENVIO
        // ===============================================

        await axios.post(
          ENDPOINTS.pecas,
          data,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },

            timeout: 30000,
          }
        );

        Alert.alert(
          'Sucesso',
          'Peça cadastrada com sucesso!'
        );

        setForm({
          nome: '',
          marca: '',
          modelo: '',
          codigo: '',
          quantidade: '',
          estoqueMin: '',
          estoqueMax: '',
        });

        setImageUri(null);

        scrollRef.current?.scrollTo({
          y: 0,
          animated: true,
        });
      } catch (err: any) {
        console.log(
          'ERRO CADASTRAR PEÇA =>',
          {
            message:
              err?.message,

            code:
              err?.code,

            status:
              err?.response
                ?.status,

            data:
              err?.response
                ?.data,
          }
        );

        const msg =
          err?.response
            ?.data?.error ||
          err?.message ||
          'Falha na conexão ou no cadastro. Verifique sua internet e tente novamente.';

        Alert.alert(
          'Erro',
          msg
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // CAMPOS
  // =====================================================

  const labels:
    Record<string, string> = {
      nome:
        'Nome da Peça',

      marca:
        'Marca',

      modelo:
        'Modelo',

      codigo:
        'Código',

      quantidade:
        'Quantidade',

      estoqueMin:
        'Estoque Mínimo',

      estoqueMax:
        'Estoque Máximo',
    };

  const numericKeys = [
    'quantidade',
    'estoqueMin',
    'estoqueMax',
  ];

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 0
          : 0
      }
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,

          {
            paddingBottom:
              Math.max(
                insets.bottom,
                20
              ) + 30,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={styles.title}
        >
          Cadastrar Peça
        </Text>

        {Object.keys(
          form
        ).map((key) => {
          const isNumeric =
            numericKeys.includes(
              key
            );

          return (
            <TextInput
              key={key}
              style={
                styles.input
              }
              placeholder={
                labels[key] ||
                key
              }
              value={
                form[
                  key as keyof typeof form
                ]
              }
              onChangeText={(
                text
              ) =>
                handleChange(
                  key,
                  text
                )
              }
              onFocus={
                mostrarCampoAtivo
              }
              placeholderTextColor="#7A7F85"
              selectionColor="#6200EE"
              cursorColor="#6200EE"
              underlineColorAndroid="transparent"
              autoCapitalize={
                isNumeric
                  ? 'none'
                  : 'words'
              }
              autoCorrect={
                false
              }
              keyboardType={
                isNumeric
                  ? 'numeric'
                  : 'default'
              }
              inputMode={
                isNumeric
                  ? 'numeric'
                  : 'text'
              }
              returnKeyType="next"
            />
          );
        })}

        {/* FOTO */}

        <View
          style={
            styles.imageRow
          }
        >
          <TouchableOpacity
            onPress={
              pickImageFromCamera
            }
            style={
              styles.cameraButton
            }
          >
            <Ionicons
              name="camera"
              size={42}
              color="#6200EE"
            />

            <Text
              style={
                styles.cameraText
              }
            >
              Câmera
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.galleryButton
            }
          >
            <Button
              title="Selecionar da Galeria"
              onPress={
                pickImageFromGallery
              }
            />
          </View>
        </View>

        {/* PREVIEW */}

        {imageUri && (
          <Image
            source={{
              uri: imageUri,
            }}
            style={
              styles.image
            }
          />
        )}

        {/* LOADING */}

        {loading && (
          <ActivityIndicator
            size="large"
            color="#6200EE"
            style={
              styles.loading
            }
          />
        )}

        {/* SALVAR */}

        {!loading && (
          <View
            style={
              styles.saveContainer
            }
          >
            <Button
              title="Salvar"
              onPress={
                cadastrarPeca
              }
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// ESTILOS
// =====================================================

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
    },

    scroll: {
      flex: 1,
    },

    container: {
      flexGrow: 1,

      alignItems:
        'center',

      paddingHorizontal:
        20,

      paddingTop:
        20,
    },

    title: {
      fontSize: 22,

      fontWeight:
        'bold',

      marginBottom:
        20,

      color:
        '#1F2937',
    },

    input: {
      width:
        '100%',

      height:
        48,

      borderWidth:
        1,

      borderColor:
        '#DADCE0',

      paddingHorizontal:
        12,

      borderRadius:
        10,

      marginBottom:
        10,

      backgroundColor:
        '#F8FAFC',

      color:
        '#1F2937',

      fontSize:
        16,
    },

    imageRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        10,

      marginBottom:
        15,

      width:
        '100%',
    },

    cameraButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      minWidth:
        80,
    },

    cameraText: {
      color:
        '#6200EE',

      fontSize:
        12,

      fontWeight:
        '600',
    },

    galleryButton: {
      flex:
        1,

      marginLeft:
        15,
    },

    image: {
      width:
        200,

      height:
        200,

      marginVertical:
        10,

      borderRadius:
        10,
    },

    loading: {
      marginVertical:
        20,
    },

    saveContainer: {
      marginTop:
        20,

      width:
        '100%',

      /*
       * Espaço adicional para garantir
       * que o botão nunca encoste
       * na navegação inferior.
       */
      marginBottom:
        20,
    },
  });