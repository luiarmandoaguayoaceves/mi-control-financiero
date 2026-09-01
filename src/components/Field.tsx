import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  flex?: boolean;
}

export default function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, flex }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, flex && styles.flex]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, flexShrink: 1 },
  flex: { flex: 1 },
  label: { fontSize: font.small },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: font.body,
    minHeight: 42,
  },
});
