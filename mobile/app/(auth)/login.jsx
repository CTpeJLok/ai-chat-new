import { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { useAuthStore } from '../../src/stores/authStore'
import Input from '../../src/components/Input'
import Button from '../../src/components/Button'

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      router.replace('/(app)/chat')
    } catch (e) {
      setError(e.response?.data?.error || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Вход</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Input
          label="Логин"
          value={form.username}
          onChangeText={set('username')}
          autoCapitalize="none"
        />
        <Input
          label="Пароль"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
        />
        <Button
          title="Войти"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 4 }}
        />
        <Link
          href="/(auth)/register"
          style={styles.link}
        >
          Нет аккаунта? Зарегистрироваться
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 24 },
  error: { color: '#ef4444', marginBottom: 12, fontSize: 14 },
  link: { textAlign: 'center', marginTop: 16, color: '#6366f1', fontSize: 14 },
})
