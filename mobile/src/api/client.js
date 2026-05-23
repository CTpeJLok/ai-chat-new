import axios from 'axios'
import storage from '../storage'

export const API_URL = 'http://127.0.0.1:8080/api'

const client = axios.create({ baseURL: API_URL })

client.interceptors.request.use(async (config) => {
  const token = await storage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await storage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
          await storage.setItem('access_token', res.data.access)
          error.config.headers.Authorization = `Bearer ${res.data.access}`
          return client.request(error.config)
        } catch {
          await storage.multiRemove(['access_token', 'refresh_token'])
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client
