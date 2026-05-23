import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'

export default function Button({ title, onPress, loading, variant = 'primary', style }) {
  return (
    <TouchableOpacity
      style={[styles.btn, styles[variant], style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6366f1'} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  primary: { backgroundColor: '#6366f1' },
  outline: { borderWidth: 1, borderColor: '#6366f1' },
  danger: { backgroundColor: '#ef4444' },
  text: { fontSize: 15, fontWeight: '600' },
  text_primary: { color: '#fff' },
  text_outline: { color: '#6366f1' },
  text_danger: { color: '#fff' },
})
