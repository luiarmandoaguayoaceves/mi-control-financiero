import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

interface Props {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function SectionCard({ title, children, action }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {(title || action) && (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : <View style={styles.flex} />}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: font.subtitle, fontWeight: '700' },
  flex: { flex: 1 },
});
