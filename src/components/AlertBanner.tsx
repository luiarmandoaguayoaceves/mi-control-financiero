import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

interface Props {
  message: string;
  tone?: 'warning' | 'danger' | 'info' | 'success';
}

/** Banners de alerta del Dashboard. */
export default function AlertBanner({ message, tone = 'warning' }: Props) {
  const theme = useTheme();
  const bg = tone === 'danger' ? theme.dangerSoft : tone === 'info' ? theme.infoSoft : tone === 'success' ? theme.successSoft : theme.warningSoft;
  const fg = tone === 'danger' ? theme.danger : tone === 'info' ? theme.info : tone === 'success' ? theme.success : theme.warning;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, fontSize: font.small, fontWeight: '600' },
});
