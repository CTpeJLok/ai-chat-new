import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Upload, Download, Trash2, File } from 'lucide-react-native'
import { useSpaceStore } from '../../src/stores/spaceStore'
import client from '../../src/api/client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../../src/api/client'
import { confirm } from '../../src/utils/confirm'
import { downloadFile } from '../../src/utils/downloadFile'

export default function FilesScreen() {
  const { currentSpace } = useSpaceStore()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!currentSpace) {
      setLoading(false)
      return
    }
    try {
      const res = await client.get(`/spaces/${currentSpace.id}/files/`)
      setFiles(res.data)
    } catch {}
    setLoading(false)
  }, [currentSpace])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const upload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (result.canceled) return

    setUploading(true)
    const asset = result.assets[0]

    try {
      const formData = new FormData()

      if (Platform.OS === 'web') {
        // На вебе DocumentPicker возвращает File объект
        const fileObj = asset.file // нативный File браузера
        if (fileObj) {
          formData.append('file', fileObj, asset.name)
        } else {
          // Fallback: fetch по uri и конвертируем в blob
          const res = await fetch(asset.uri)
          const blob = await res.blob()
          formData.append('file', blob, asset.name)
        }
      } else {
        // Native: передаём объект с uri
        formData.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        })
      }

      await client.post(`/spaces/${currentSpace.id}/files/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      load()
    } catch (e) {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message
      Alert.alert('Ошибка загрузки', msg)
    } finally {
      setUploading(false)
    }
  }

  const download = (file) => downloadFile(file.id, file.name)

  const deleteFile = async (file) => {
    const ok = await confirm(`Удалить файл "${file.name}"?`)
    if (!ok) return
    try {
      await client.delete(`/files/${file.id}/`)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (e) {
      Alert.alert('Ошибка', e.response?.data ? JSON.stringify(e.response.data) : e.message)
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (!currentSpace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Выберите пространство в Настройках</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{currentSpace.name} · Файлы</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={upload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator
              color="#fff"
              size="small"
            />
          ) : (
            <Upload
              color="#fff"
              size={18}
            />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ flex: 1 }}
          color="#6366f1"
        />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Нет файлов. Нажмите ↑ чтобы загрузить</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <File
                color="#6366f1"
                size={20}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={styles.fileName}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatSize(item.size)} · {item.uploaded_by_username}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => download(item)}
                hitSlop={8}
                style={{ marginRight: 12 }}
              >
                <Download
                  color="#6b7280"
                  size={18}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteFile(item)}
                hitSlop={8}
              >
                <Trash2
                  color="#d1d5db"
                  size={18}
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
  uploadBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 8 },
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
  fileName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  fileMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#9ca3af', textAlign: 'center', fontSize: 15 },
})
