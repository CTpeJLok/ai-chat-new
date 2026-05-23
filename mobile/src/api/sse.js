import storage from '../storage'
import { API_URL } from './client'

export async function streamChat({ conversationId, spaceId, message, onChunk, onDone, onError }) {
  const token = await storage.getItem('access_token')

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
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone?.()
          return
        }
        try {
          const { delta, error } = JSON.parse(payload)
          if (error) {
            onError?.(error)
            return
          }
          if (delta) onChunk(delta)
        } catch {}
      }
    }
    onDone?.()
  } catch (e) {
    onError?.(e.message)
  }
}
