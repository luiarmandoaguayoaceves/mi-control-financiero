// Pantalla Metas: progreso, prioridad, edición.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import ProgressBar from '../components/ProgressBar';
import ModalInput from '../components/ModalInput';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';
import { money } from '../utils/format';
import type { Goal } from '../models/types';

const PRIORITY_COLOR: Record<Goal['priority'], string> = {
  alta: '#DC2626',
  media: '#D97706',
  baja: '#6B7280',
};

export default function GoalsScreen() {
  const { data, updateGoal } = useAppData();
  const theme = useTheme();
  const [editing, setEditing] = useState<Goal | null>(null);

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const goals = data.goals.filter((g) => g.active);

  const save = async (values: Record<string, string>) => {
    if (!editing) return;
    const target = parseFloat((values.target || '').replace(',', '.'));
    const current = parseFloat((values.current || '').replace(',', '.'));
    await updateGoal({
      ...editing,
      targetAmount: Number.isFinite(target) && target >= 0 ? target : editing.targetAmount,
      currentAmount: Number.isFinite(current) && current >= 0 ? current : editing.currentAmount,
    });
  };

  return (
    <Screen>
      <SectionCard title="Metas y provisiones">
        {goals.length === 0 ? (
          <EmptyState message="Sin metas activas" />
        ) : (
          goals.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            return (
              <View key={g.id} style={[styles.goal, { borderColor: theme.border }]}>
                <View style={styles.goalHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: theme.text }]}>{g.name}</Text>
                    <Text style={[styles.goalMeta, { color: theme.textMuted }]}>
                      {g.type} · prioridad {g.priority}
                      {g.deadline ? ` · para ${g.deadline}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.priBadge, { backgroundColor: PRIORITY_COLOR[g.priority] + '22' }]}>
                    <Text style={{ color: PRIORITY_COLOR[g.priority], fontSize: font.tiny, fontWeight: '700' }}>{g.priority}</Text>
                  </View>
                </View>
                <View style={styles.goalAmounts}>
                  <Text style={[styles.goalCurrent, { color: theme.text }]}>{money(g.currentAmount)}</Text>
                  <Text style={[styles.goalMeta, { color: theme.textMuted }]}>de {money(g.targetAmount)}</Text>
                </View>
                <ProgressBar value={pct} color={theme.primary} />
                <Text style={[styles.goalMeta, { color: theme.textMuted }]}>{pct.toFixed(0)}% completado</Text>
                {g.notes ? <Text style={[styles.goalNotes, { color: theme.textMuted }]}>{g.notes}</Text> : null}
                <Pressable
                  onPress={() => setEditing(g)}
                  accessibilityRole="button"
                  style={[styles.editBtn, { backgroundColor: theme.primarySoft }]}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>Actualizar</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </SectionCard>

      <ModalInput
        visible={!!editing}
        title={editing ? `Meta: ${editing.name}` : ''}
        fields={[
          { key: 'target', label: 'Monto meta ($)', keyboardType: 'decimal-pad', value: editing ? String(editing.targetAmount) : '' },
          { key: 'current', label: 'Avance actual ($)', keyboardType: 'decimal-pad', value: editing ? String(editing.currentAmount) : '' },
        ]}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalName: { fontSize: font.body, fontWeight: '700' },
  goalMeta: { fontSize: font.tiny, textTransform: 'capitalize' },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  goalCurrent: { fontSize: font.subtitle, fontWeight: '700' },
  goalNotes: { fontSize: font.tiny, fontStyle: 'italic' },
  editBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  priBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
});
