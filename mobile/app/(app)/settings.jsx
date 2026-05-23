import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { Search, Plus, LogOut, Key, Check } from 'lucide-react-native'
import { useAuthStore } from '../../src/stores/authStore'
import { useSpaceStore } from '../../src/stores/spaceStore'
import client from '../../src/api/client'
import Button from '../../src/components/Button'
import Input from '../../src/components/Input'
import { Platform } from 'react-native'

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { currentSpace, setSpace } = useSpaceStore()

  const [spaces, setSpaces] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [createModal, setCreateModal] = useState(false)
  const [joinModal, setJoinModal] = useState(null) // space object
  const [passwordModal, setPasswordModal] = useState(false)

  const [createForm, setCreateForm] = useState({ name: '', password: '' })
  const [joinPassword, setJoinPassword] = useState('')
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const loadSpaces = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const res = await client.get('/spaces/', { params: q ? { search: q } : {} })
      setSpaces(res.data)
    } catch {}
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSpaces()
    }, [loadSpaces])
  )

  const handleSearch = (text) => {
    setSearch(text)
    loadSpaces(text)
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.password) return
    setActionLoading(true)
    try {
      const res = await client.post('/spaces/', createForm)
      setCreateModal(false)
      setCreateForm({ name: '', password: '' })
      await setSpace({ id: res.data.id, name: createForm.name })
      loadSpaces()
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.name?.[0] || 'Не удалось создать')
    } finally {
      setActionLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!joinPassword || !joinModal) return
    setActionLoading(true)
    try {
      const res = await client.post(`/spaces/${joinModal.id}/join/`, { password: joinPassword })
      await setSpace({ id: res.data.id, name: res.data.name })
      setJoinModal(null)
      setJoinPassword('')
    } catch {
      Alert.alert('Ошибка', 'Неверный пароль')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (pwForm.new !== pwForm.confirm) return Alert.alert('Пароли не совпадают')
    setActionLoading(true)
    try {
      await client.post('/auth/change-password/', {
        old_password: pwForm.old,
        new_password: pwForm.new,
      })
      setPasswordModal(false)
      setPwForm({ old: '', new: '', confirm: '' })
      Alert.alert('Готово', 'Пароль изменён')
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data?.error || 'Не удалось изменить пароль')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Выйти из аккаунта?')
        : await new Promise((resolve) =>
            Alert.alert('Выйти?', '', [
              { text: 'Отмена', onPress: () => resolve(false) },
              { text: 'Выйти', style: 'destructive', onPress: () => resolve(true) },
            ])
          )

    if (!confirmed) return
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Профиль */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Профиль</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
        </View>
        <Button
          title="Сменить пароль"
          variant="outline"
          onPress={() => setPasswordModal(true)}
          style={{ marginTop: 12 }}
        />
        <Button
          title="Выйти из аккаунта"
          variant="danger"
          onPress={handleLogout}
          style={{ marginTop: 8 }}
        />
      </View>

      {/* Пространства */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Пространства</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModal(true)}
          >
            <Plus
              color="#fff"
              size={16}
            />
          </TouchableOpacity>
        </View>

        {currentSpace && (
          <View style={styles.currentSpace}>
            <Check
              color="#6366f1"
              size={16}
            />
            <Text style={styles.currentSpaceText}>Текущее: {currentSpace.name}</Text>
          </View>
        )}

        <View style={styles.searchRow}>
          <Search
            color="#9ca3af"
            size={16}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск пространств..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            color="#6366f1"
            style={{ marginTop: 12 }}
          />
        ) : (
          spaces.map((space) => (
            <TouchableOpacity
              key={space.id}
              style={[styles.spaceCard, currentSpace?.id === space.id && styles.spaceCardActive]}
              onPress={() =>
                space.is_member ? setSpace({ id: space.id, name: space.name }) : setJoinModal(space)
              }
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.spaceName}>{space.name}</Text>
                <Text style={styles.spaceMeta}>
                  {space.is_member ? 'Вы участник' : 'Войти по паролю'}
                </Text>
              </View>
              {currentSpace?.id === space.id && (
                <Check
                  color="#6366f1"
                  size={18}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Modal: создать пространство */}
      <Modal
        visible={createModal}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Создать пространство</Text>
            <Input
              label="Название"
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
            />
            <Input
              label="Пароль"
              value={createForm.password}
              secureTextEntry
              onChangeText={(v) => setCreateForm((f) => ({ ...f, password: v }))}
            />
            <Button
              title="Создать"
              onPress={handleCreate}
              loading={actionLoading}
            />
            <Button
              title="Отмена"
              variant="outline"
              onPress={() => setCreateModal(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal: войти в пространство */}
      <Modal
        visible={!!joinModal}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{joinModal?.name}</Text>
            <Input
              label="Пароль пространства"
              value={joinPassword}
              secureTextEntry
              onChangeText={setJoinPassword}
            />
            <Button
              title="Войти"
              onPress={handleJoin}
              loading={actionLoading}
            />
            <Button
              title="Отмена"
              variant="outline"
              onPress={() => {
                setJoinModal(null)
                setJoinPassword('')
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal: сменить пароль */}
      <Modal
        visible={passwordModal}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Смена пароля</Text>
            <Input
              label="Текущий пароль"
              value={pwForm.old}
              secureTextEntry
              onChangeText={(v) => setPwForm((f) => ({ ...f, old: v }))}
            />
            <Input
              label="Новый пароль"
              value={pwForm.new}
              secureTextEntry
              onChangeText={(v) => setPwForm((f) => ({ ...f, new: v }))}
            />
            <Input
              label="Подтверждение"
              value={pwForm.confirm}
              secureTextEntry
              onChangeText={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
            />
            <Button
              title="Изменить"
              onPress={handleChangePassword}
              loading={actionLoading}
            />
            <Button
              title="Отмена"
              variant="outline"
              onPress={() => setPasswordModal(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6366f1' },
  username: { fontSize: 16, fontWeight: '500', color: '#111827' },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 6 },
  currentSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  currentSpaceText: { color: '#6366f1', marginLeft: 6, fontWeight: '500', fontSize: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: '#111827' },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  spaceCardActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  spaceName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  spaceMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
})
