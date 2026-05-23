import { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Link, router } from 'expo-router'
import { useAuthStore } from '../../src/stores/authStore'
import Input from '../../src/components/Input'
import Button from '../../src/components/Button'

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register)
  const [form, setForm] = useState({ username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleRegister = async () => {
    setError('')
    if (form.password !== form.confirm) return setError('Пароли не совпадают')
    setLoading(true)
    try {
      await register(form.username, form.password)
      router.replace('/(app)/chat')
    } catch (e) {
      setError(e.response?.data?.username?.[0] || 'Ошибка регистрации')
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
        <Text style={styles.title}>Регистрация</Text>
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
        <Input
          label="Подтверждение пароля"
          value={form.confirm}
          onChangeText={set('confirm')}
          secureTextEntry
        />
        <Button
          title="Зарегистрироваться"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 4 }}
        />
        <Link
          href="/(auth)/login"
          style={styles.link}
        >
          Уже есть аккаунт? Войти
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
