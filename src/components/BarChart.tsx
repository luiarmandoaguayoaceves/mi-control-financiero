import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarDatum[];
  /** Formateador del valor (default: número) */
  formatValue?: (v: number) => string;
}

/** Gráfica de barras simple (sin librerías externas). */
export default function BarChart({ data, formatValue = (v) => String(v) }: Props) {
  const theme = useTheme();
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <View style={styles.wrap} accessibilityLabel="Gráfica de barras">
      {data.map((d, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={styles.barArea}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max(4, (Math.abs(d.value) / max) * 100)}%`,
                  backgroundColor: d.color || theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
            {formatValue(d.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 90, fontSize: font.small },
  barArea: { flex: 1, height: 14, justifyContent: 'center' },
  bar: { height: 10, borderRadius: radius.sm },
  value: { width: 80, fontSize: font.small, textAlign: 'right' },
});
