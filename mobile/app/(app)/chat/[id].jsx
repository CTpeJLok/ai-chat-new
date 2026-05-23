import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { Send, FileText, Download } from 'lucide-react-native'
import { streamChat } from '../../../src/api/sse'
import { useSpaceStore } from '../../../src/stores/spaceStore'
import client from '../../../src/api/client'
import { API_URL } from '../../../src/api/client'
import storage from '../../../src/storage'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export default function ChatScreen() {
  const { id } = useLocalSearchParams()
  const { currentSpace } = useSpaceStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  useEffect(() => {
    client.get(`/chat/conversations/${id}/`).then((res) => {
      setMessages(res.data.messages)
      setLoading(false)
    })
  }, [id])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => {
    if (messages.length) scrollToBottom()
  }, [messages.length])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg = { id: Date.now(), role: 'user', content: text }
    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: '' }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    await streamChat({
      conversationId: Number(id),
      spaceId: currentSpace?.id,
      message: text,
      onSources: (sources) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, sources } : m)))
      },
      onChunk: (delta) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m))
        )
        scrollToBottom()
      },
      onDone: () => setStreaming(false),
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: 'Ошибка: ' + err } : m))
        )
        setStreaming(false)
      },
    })
  }

  if (loading)
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        color="#6366f1"
      />
    )

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: 'Диалог', headerShown: true }} />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Сообщение..."
          placeholderTextColor="#9ca3af"
          multiline
          onSubmitEditing={Platform.OS === 'web' ? sendMessage : undefined}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <ActivityIndicator
              color="#fff"
              size="small"
            />
          ) : (
            <Send
              color="#fff"
              size={18}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const hasSources = message.sources?.length > 0

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content || '...'}
        </Text>
      </View>

      {hasSources && (
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesTitle}>Источники:</Text>
          {message.sources.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function SourceItem({ source }) {
  const download = async () => {
    const token = await storage.getItem('access_token')

    if (Platform.OS === 'web') {
      const res = await fetch(`${API_URL}/files/${source.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = source.name
      a.click()
      return
    }

    const dest = FileSystem.documentDirectory + source.name
    try {
      const dl = await FileSystem.downloadAsync(`${API_URL}/files/${source.id}/download/`, dest, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri)
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message)
    }
  }

  return (
    <TouchableOpacity
      style={styles.sourceItem}
      onPress={download}
      activeOpacity={0.7}
    >
      <FileText
        color="#6366f1"
        size={14}
      />
      <Text
        style={styles.sourceName}
        numberOfLines={1}
      >
        {source.name}
      </Text>
      <Download
        color="#9ca3af"
        size={14}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: 8, alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  sourcesContainer: {
    maxWidth: '80%',
    marginTop: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
  },
  sourcesTitle: { fontSize: 11, color: '#9ca3af', marginBottom: 6, fontWeight: '500' },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sourceName: { flex: 1, fontSize: 13, color: '#374151' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: '#c7d2fe' },
})
