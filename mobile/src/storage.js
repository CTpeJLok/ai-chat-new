import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const webStorage = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  multiRemove: (keys) => Promise.resolve(keys.forEach((k) => localStorage.removeItem(k))),
}

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage
export default storage
