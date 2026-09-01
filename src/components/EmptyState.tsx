import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';

interface Props {
  message: string;
  hint?: string;
}

export default function EmptyState({ message, hint }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel={message}>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xl * 2, alignItems: 'center', gap: spacing.sm },
  message: { fontSize: font.body, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: font.small, textAlign: 'center' },
});
