import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View } from 'react-native'

export default function ChatLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111827',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#f9fafb' },
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
    </View>
  )
}
