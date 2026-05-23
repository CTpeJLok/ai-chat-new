import { Alert, Platform } from 'react-native'

export function confirm(message) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message))
  }
  return new Promise((resolve) =>
    Alert.alert('Подтверждение', message, [
      { text: 'Отмена', onPress: () => resolve(false) },
      { text: 'Да', style: 'destructive', onPress: () => resolve(true) },
    ])
  )
}
