import { Platform, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import storage from '../storage'
import { API_URL } from '../api/client'

export async function downloadFile(fileId, fileName) {
  const token = await storage.getItem('access_token')
  const url = `${API_URL}/files/${fileId}/download/`

  if (Platform.OS === 'web') {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fileName
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      Alert.alert('Ошибка', e.message)
    }
    return
  }

  // Android / iOS — качаем в кэш, открываем через Sharing
  const dest = FileSystem.cacheDirectory + encodeURIComponent(fileName)
  try {
    // Удалить старый файл если есть
    const info = await FileSystem.getInfoAsync(dest)
    if (info.exists) await FileSystem.deleteAsync(dest, { idempotent: true })

    const dl = await FileSystem.downloadAsync(url, dest, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (dl.status !== 200) {
      Alert.alert('Ошибка', `Сервер вернул ${dl.status}`)
      return
    }

    const canShare = await Sharing.isAvailableAsync()
    if (canShare) {
      await Sharing.shareAsync(dl.uri, {
        mimeType: getMimeType(fileName),
        dialogTitle: fileName,
        UTI: getUTI(fileName),
      })
    } else {
      Alert.alert('Файл загружен', `Сохранён во временную папку: ${fileName}`)
    }
  } catch (e) {
    Alert.alert('Ошибка скачивания', e.message)
  }
}

function getMimeType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    zip: 'application/zip',
  }
  return map[ext] || 'application/octet-stream'
}

function getUTI(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'com.adobe.pdf',
    doc: 'com.microsoft.word.doc',
    docx: 'org.openxmlformats.wordprocessingml.document',
    png: 'public.png',
    jpg: 'public.jpeg',
    jpeg: 'public.jpeg',
    txt: 'public.plain-text',
    zip: 'public.zip-archive',
  }
  return map[ext] || 'public.data'
}
