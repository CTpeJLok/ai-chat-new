import { Tabs, Redirect } from 'expo-router'
import { MessageCircle, Folder, Settings } from 'lucide-react-native'
import { useAuthStore } from '../../src/stores/authStore'

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чат',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: 'Файлы',
          tabBarIcon: ({ color, size }) => (
            <Folder
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color, size }) => (
            <Settings
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  )
}
