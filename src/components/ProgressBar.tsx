import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { clamp } from '../utils/format';
import { radius, spacing } from '../theme';

interface Props {
  /** 0-100 */
  value: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, color, height = 8 }: Props) {
  const theme = useTheme();
  const pct = clamp(Number.isFinite(value) ? value : 0, 0, 100);
  return (
    <View
      style={[styles.track, { backgroundColor: theme.cardAlt, height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${pct}%`,
            backgroundColor: color || theme.primary,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
