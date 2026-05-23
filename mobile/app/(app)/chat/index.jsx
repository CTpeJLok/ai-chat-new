import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Plus, MessageCircle, Trash2 } from 'lucide-react-native'
import { useSpaceStore } from '../../../src/stores/spaceStore'
import client from '../../../src/api/client'
import { confirm } from '../../../src/utils/confirm'

export default function ChatListScreen() {
  const { currentSpace } = useSpaceStore()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!currentSpace) {
      setLoading(false)
      return
    }
    try {
      const res = await client.get('/chat/conversations/', {
        params: { space_id: currentSpace.id },
      })
      setConversations(res.data)
    } catch {}
    setLoading(false)
  }, [currentSpace])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const createConversation = async () => {
    if (!currentSpace) {
      Alert.alert('Выберите пространство', 'Перейдите в Настройки и выберите пространство')
      return
    }
    try {
      const res = await client.post('/chat/conversations/', { space: currentSpace.id })
      router.push(`/(app)/chat/${res.data.id}`)
    } catch {}
  }

  const deleteConversation = async (id) => {
    const ok = await confirm('Удалить диалог?')
    if (!ok) return
    try {
      await client.delete(`/chat/conversations/${id}/`)
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch {}
  }

  if (!currentSpace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Выберите пространство в Настройках</Text>
      </View>
    )
  }

  if (loading)
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        color="#6366f1"
      />
    )

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentSpace.name}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={createConversation}
        >
          <Plus
            color="#fff"
            size={20}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет диалогов. Нажмите + чтобы начать</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(app)/chat/${item.id}`)}
            activeOpacity={0.7}
          >
            <MessageCircle
              color="#6366f1"
              size={20}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString('ru')}
                {' · '}
                {item.messages_count} сообщ.
              </Text>
              {item.last_message && (
                <Text
                  style={styles.cardPreview}
                  numberOfLines={1}
                >
                  {item.last_message.role === 'user' ? 'Вы: ' : 'ИИ: '}
                  {item.last_message.content}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => deleteConversation(item.id)}
              hitSlop={8}
            >
              <Trash2
                color="#d1d5db"
                size={18}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardDate: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  cardPreview: { fontSize: 14, color: '#374151' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#9ca3af', textAlign: 'center', fontSize: 15 },
})
