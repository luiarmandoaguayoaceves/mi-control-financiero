// Pantalla Presupuesto: por mes, con semáforo verde/amarillo/rojo.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import ProgressBar from '../components/ProgressBar';
import ModalInput from '../components/ModalInput';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { money, shiftMonthKey, todayMonthKey, formatMonthKeyShort } from '../utils/format';
import { budgetStatus, spentByCategory } from '../services/financeService';
import type { Budget } from '../models/types';

const LEVEL_COLOR = { verde: '#0F9D58', amarillo: '#D97706', rojo: '#DC2626' } as const;

export default function BudgetScreen() {
  const { data, updateBudget } = useAppData();
  const theme = useTheme();
  const [month, setMonth] = useState(todayMonthKey());
  const [editing, setEditing] = useState<Budget | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const spent = spentByCategory(data.transactions, month);
    const catActive = new Set(data.categories.filter((c) => c.active).map((c) => c.id));
    return data.budgets
      .filter((b) => b.month === month && catActive.has(b.categoryId))
      .map((b) => {
        const actual = spent.get(b.categoryId) || 0;
        const status = budgetStatus(b.plannedAmount, actual);
        return {
          budget: b,
          catName: data.categories.find((c) => c.id === b.categoryId)?.name || '—',
          actual,
          status,
        };
      })
      .sort((a, b) => b.actual / Math.max(b.budget.plannedAmount, 1) - a.actual / Math.max(a.budget.plannedAmount, 1));
  }, [data, month]);

  const totalPlanned = rows.reduce((a, r) => a + r.budget.plannedAmount, 0);
  const totalSpent = rows.reduce((a, r) => a + r.actual, 0);

  const save = async (values: Record<string, string>) => {
    if (!editing) return;
    const planned = parseFloat((values.planned || '').replace(',', '.'));
    if (!Number.isFinite(planned) || planned < 0) return;
    await updateBudget({ ...editing, plannedAmount: planned });
  };

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  return (
    <Screen>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth((m) => shiftMonthKey(m, -1))} accessibilityRole="button" accessibilityLabel="Mes anterior">
          <Text style={[styles.arrow, { color: theme.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{formatMonthKeyShort(month)}</Text>
        <Pressable onPress={() => setMonth((m) => shiftMonthKey(m, 1))} accessibilityRole="button" accessibilityLabel="Mes siguiente">
          <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
        </Pressable>
      </View>

      <SectionCard title="Resumen">
        <View style={styles.sumRow}>
          <Text style={[styles.sumVal, { color: theme.text }]}>{money(totalSpent)}</Text>
          <Text style={[styles.sumMeta, { color: theme.textMuted }]}>gastado de {money(totalPlanned)} presupuestado</Text>
        </View>
        <ProgressBar value={totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0} color={budgetStatus(totalPlanned, totalSpent).level === 'rojo' ? theme.danger : theme.primary} />
      </SectionCard>

      <SectionCard title="Por categoría">
        {rows.length === 0 ? (
          <EmptyState message="Sin presupuesto para este mes" />
        ) : (
          rows.map((r) => {
            const color = LEVEL_COLOR[r.status.level];
            return (
              <View key={r.budget.id} style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={[styles.cat, { color: theme.text }]} numberOfLines={1}>
                    {r.catName}
                  </Text>
                  <Text style={[styles.pct, { color }]}>
                    {Number.isFinite(r.status.pct) ? `${r.status.pct.toFixed(0)}%` : '∞'}
                  </Text>
                  <Pressable
                    onPress={() => setEditing(r.budget)}
                    accessibilityRole="button"
                    style={[styles.editBtn, { backgroundColor: theme.cardAlt }]}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: font.tiny, fontWeight: '700' }}>Editar</Text>
                  </Pressable>
                </View>
                <ProgressBar
                  value={Number.isFinite(r.status.pct) ? r.status.pct : 100}
                  color={color}
                  height={6}
                />
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {money(r.actual)} de {money(r.budget.plannedAmount)} · disponible {money(r.budget.plannedAmount - r.actual)}
                </Text>
              </View>
            );
          })
        )}
      </SectionCard>

      <ModalInput
        visible={!!editing}
        title={editing ? `Presupuesto: ${data.categories.find((c) => c.id === editing.categoryId)?.name || ''}` : ''}
        fields={[
          { key: 'planned', label: 'Monto planeado ($)', keyboardType: 'decimal-pad', value: editing ? String(editing.plannedAmount) : '' },
        ]}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.sm },
  arrow: { fontSize: 30, fontWeight: '700', paddingHorizontal: spacing.md },
  monthLabel: { fontSize: font.subtitle, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  sumRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  sumVal: { fontSize: font.subtitle, fontWeight: '800' },
  sumMeta: { fontSize: font.small },
  row: { gap: spacing.xs, marginBottom: spacing.lg },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cat: { flex: 1, fontSize: font.body, fontWeight: '600' },
  pct: { fontSize: font.body, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  editBtn: { paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderRadius: 6 },
  meta: { fontSize: font.tiny },
});
