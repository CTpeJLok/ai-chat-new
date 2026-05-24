import storage from '../storage'
import { API_URL } from './client'
import { Platform } from 'react-native'
import EventSource from 'react-native-sse'

export async function streamChat({
  conversationId,
  spaceId,
  message,
  onChunk,
  onSources,
  onDone,
  onError,
}) {
  const token = await storage.getItem('access_token')

  // Web — fetch + ReadableStream
  if (Platform.OS === 'web') {
    try {
      const response = await fetch(`${API_URL}/chat/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          space_id: spaceId,
          message,
        }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            onDone?.()
            return
          }
          try {
            const parsed = JSON.parse(payload)
            if (parsed.sources) {
              onSources?.(parsed.sources)
              continue
            }
            if (parsed.error) {
              onError?.(parsed.error)
              return
            }
            if (parsed.delta) onChunk(parsed.delta)
          } catch {}
        }
      }
      onDone?.()
    } catch (e) {
      onError?.(e.message)
    }
    return
  }

  // Android / iOS — react-native-sse
  // SSE работает только с GET, поэтому сначала POST чтобы создать сообщение,
  // потом слушаем через отдельный SSE endpoint
  return new Promise(async (resolve) => {
    try {
      const es = new EventSource(`${API_URL}/chat/stream/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          space_id: spaceId,
          message,
        }),
        pollingInterval: 0,
      })

      es.addEventListener('message', (event) => {
        const payload = event.data?.trim()
        if (!payload) return
        if (payload === '[DONE]') {
          es.close()
          onDone?.()
          resolve()
          return
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.sources) {
            onSources?.(parsed.sources)
            return
          }
          if (parsed.error) {
            onError?.(parsed.error)
            es.close()
            resolve()
            return
          }
          if (parsed.delta) onChunk(parsed.delta)
        } catch {}
      })

      es.addEventListener('error', (e) => {
        es.close()
        onError?.(e.message || 'SSE error')
        resolve()
      })
    } catch (e) {
      onError?.(e.message)
      resolve()
    }
  })
}
