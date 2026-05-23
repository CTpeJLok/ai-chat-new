import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/stores/authStore'

export default function Index() {
  const user = useAuthStore((s) => s.user)
  return <Redirect href={user ? '/(app)/chat' : '/(auth)/login'} />
}
