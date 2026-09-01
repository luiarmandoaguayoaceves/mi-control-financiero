import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: string;
  /** Color del valor (acento semántico) */
  color?: string;
  sub?: string;
  /** Ocupa media fila (grid de 2 columnas) */
  half?: boolean;
  accessibilityLabel?: string;
}

export default function KpiCard({ label, value, color, sub, half = true, accessibilityLabel }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        half && styles.half,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      accessibilityLabel={accessibilityLabel || `${label}: ${value}`}
    >
      <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: color || theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 2,
  },
  half: { flex: 1, minWidth: 0 },
  label: { fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: font.subtitle, fontWeight: '700' },
  sub: { fontSize: font.small },
});
