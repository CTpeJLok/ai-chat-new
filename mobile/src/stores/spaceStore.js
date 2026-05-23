import { create } from 'zustand'
import storage from '../storage'

export const useSpaceStore = create((set) => ({
  currentSpace: null,

  init: async () => {
    const raw = await storage.getItem('current_space')
    if (raw) set({ currentSpace: JSON.parse(raw) })
  },

  setSpace: async (space) => {
    await storage.setItem('current_space', JSON.stringify(space))
    set({ currentSpace: space })
  },

  clearSpace: async () => {
    await storage.removeItem('current_space')
    set({ currentSpace: null })
  },
}))
