import { Stack } from 'expo-router';

export default function EstoqueTecLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Estoque Técnicos',
        }}
      />

      <Stack.Screen
        name="tecnico"
        options={{
          title: 'Detalhes do Técnico',
        }}
      />

      <Stack.Screen
        name="carro"
        options={{
          title: 'Estoque do Carro',
        }}
      />

      <Stack.Screen
        name="pendentes"
        options={{
          title: 'Pendentes de Devolução',
        }}
      />
    </Stack>
  );
}