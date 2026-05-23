import { Stack } from 'expo-router'
import { useSpaceStore } from '../src/stores/spaceStore'
import { useAuthStore } from '../src/stores/authStore'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const { init, isLoading } = useAuthStore()
  const initSpace = useSpaceStore((s) => s.init)

  useEffect(() => {
    init()
    initSpace()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator
          size="large"
          color="#6366f1"
        />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
