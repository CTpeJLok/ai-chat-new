import { create } from 'zustand'
import storage from '../storage'
import client from '../api/client'

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  init: async () => {
    const token = await storage.getItem('access_token')
    if (token) {
      try {
        const res = await client.get('/auth/me/')
        set({ user: res.data, isLoading: false })
      } catch {
        set({ user: null, isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },

  login: async (username, password) => {
    const res = await client.post('/auth/login/', { username, password })
    await storage.setItem('access_token', res.data.access)
    await storage.setItem('refresh_token', res.data.refresh)
    set({ user: res.data.user })
  },

  register: async (username, password) => {
    const res = await client.post('/auth/register/', { username, password })
    await storage.setItem('access_token', res.data.access)
    await storage.setItem('refresh_token', res.data.refresh)
    set({ user: res.data.user })
  },

  logout: async () => {
    await storage.multiRemove(['access_token', 'refresh_token'])
    set({ user: null })
  },
}))
