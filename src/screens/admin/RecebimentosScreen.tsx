import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = 'https://api.grancoffeepecas.com.br';

type Role = 'tecnico' | 'admin';

export default function RecebimentosScreen() {
  const [role, setRole] = useState<Role>('tecnico');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function handleSend() {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      Alert.alert('Atenção', 'Informe o título da notificação.');
      return;
    }

    if (!cleanBody) {
      Alert.alert('Atenção', 'Digite a mensagem que deseja enviar.');
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        'Sessão inválida',
        'Não foi possível identificar o administrador logado.'
      );
      return;
    }

    const destination =
      role === 'tecnico'
        ? 'todos os técnicos'
        : 'todos os administradores';

    Alert.alert(
      'Confirmar envio',
      `Deseja enviar esta notificação para ${destination}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Enviar',
          onPress: () => {
            void sendNotification(user);
          },
        },
      ]
    );
  }

  async function sendNotification(user: ReturnType<typeof getAuth>['currentUser']) {
    if (!user) return;

    try {
      setSending(true);

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/push/broadcast/by-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role,
            title: title.trim(),
            body: body.trim(),
            route:
              role === 'tecnico'
                ? '/tecnico/notificacoes'
                : '/admin/notificacoes',
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.detail ||
            `Erro HTTP ${response.status}`
        );
      }

      const users = Number(data?.users ?? 0);
      const sent = Number(data?.sent ?? 0);
      const failed = Number(data?.failed ?? 0);

      setTitle('');
      setBody('');

      Alert.alert(
        'Notificação enviada',
        `Usuários: ${users}\nPush enviados: ${sent}\nFalhas: ${failed}`
      );
    } catch (error: any) {
      console.error('[NOTIFICATION SEND]', error);

      Alert.alert(
        'Erro ao enviar',
        error?.message || 'Não foi possível enviar a notificação.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
<KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={28}
              color="#333"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Enviar notificação</Text>
            <Text style={styles.subtitle}>
              Envie avisos diretamente para os usuários do aplicativo.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Destinatários</Text>

        <View style={styles.options}>
          <Pressable
            style={[
              styles.option,
              role === 'tecnico' && styles.optionSelected,
            ]}
            onPress={() => setRole('tecnico')}
            disabled={sending}
          >
            <Ionicons
              name={
                role === 'tecnico'
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={22}
              color="#333"
            />

            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                Todos os técnicos
              </Text>
              <Text style={styles.optionSubtitle}>
                Envia para todos os usuários cadastrados como técnico.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.option,
              role === 'admin' && styles.optionSelected,
            ]}
            onPress={() => setRole('admin')}
            disabled={sending}
          >
            <Ionicons
              name={
                role === 'admin'
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={22}
              color="#333"
            />

            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                Todos os administradores
              </Text>
              <Text style={styles.optionSubtitle}>
                Envia para todos os usuários administradores.
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.label}>Título</Text>

        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Aviso importante"
          editable={!sending}
          maxLength={100}
        />

        <Text style={styles.counter}>
          {title.length}/100
        </Text>

        <Text style={styles.label}>Mensagem</Text>

<TextInput
  style={[styles.input, styles.messageInput]}
  value={body}
  onChangeText={setBody}
  placeholder="Digite a mensagem que será enviada..."
  multiline
  textAlignVertical="top"
  editable={!sending}
  maxLength={500}
  onFocus={() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }}
/>

        <Text style={styles.counter}>
          {body.length}/500
        </Text>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#555"
          />

          <Text style={styles.infoText}>
            A mensagem ficará disponível no sininho do aplicativo e,
            quando houver um dispositivo registrado, também será enviada
            como notificação push.
          </Text>
        </View>

        <Pressable
          style={[
            styles.sendButton,
            sending && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="send"
                size={20}
                color="#fff"
              />
              <Text style={styles.sendButtonText}>
                Enviar notificação
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
    lineHeight: 19,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    marginTop: 6,
  },

  options: {
    gap: 10,
    marginBottom: 20,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
  },

  optionSelected: {
    borderColor: '#555',
    backgroundColor: '#f0f0f0',
  },

  optionText: {
    flex: 1,
    marginLeft: 10,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },

  optionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    lineHeight: 17,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
  },

  messageInput: {
    minHeight: 130,
  },

  counter: {
    textAlign: 'right',
    color: '#888',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 20,
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#555',
    fontSize: 13,
    lineHeight: 18,
  },

  sendButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  sendButtonDisabled: {
    opacity: 0.6,
  },

  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});