import { Stack } from 'expo-router'

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Чат', headerShown: false }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Диалог' }}
      />
    </Stack>
  )
}
