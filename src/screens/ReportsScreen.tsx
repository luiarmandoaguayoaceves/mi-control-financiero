// Pantalla Reportes: resumen mensual y gráficas simples.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import KpiCard from '../components/KpiCard';
import BarChart from '../components/BarChart';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { money, shiftMonthKey, todayMonthKey, formatMonthKeyShort } from '../utils/format';
import {
  monthIncome,
  monthSpent,
  spentByGroup,
  spentByCategory,
  netWorth,
  totalCardDebt,
  msiPendingTotal,
} from '../services/financeService';
import { GROUP_COLORS } from '../constants';

export default function ReportsScreen() {
  const { data } = useAppData();
  const theme = useTheme();
  const [month, setMonth] = useState(todayMonthKey());

  const m = useMemo(() => {
    if (!data) return null;
    const income = monthIncome(data.transactions, month);
    const spent = monthSpent(data.transactions, month);
    const groups = spentByGroup(data.transactions, month, data.categories);
    const byCat = spentByCategory(data.transactions, month);
    const catBars = [...byCat.entries()]
      .map(([catId, value]) => ({
        label: data.categories.find((c) => c.id === catId)?.name || '—',
        value,
        color: (data.categories.find((c) => c.id === catId)?.group
          ? GROUP_COLORS[data.categories.find((c) => c.id === catId)!.group]
          : theme.primary) as string,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    const necesidades = groups.get('Necesidad') || 0;
    const deseos = groups.get('Deseo') || 0;
    const ahorro = groups.get('Ahorro/Inversión') || 0;
    const deuda = groups.get('Deuda/Pago') || 0;
    const tasa = income > 0 ? (ahorro / income) * 100 : null;
    const patrimonio = netWorth(
      data.assets.reduce((a, x) => a + x.estimatedValue, 0),
      data.liabilities.reduce((a, x) => a + x.outstandingBalance, 0),
      totalCardDebt(data.creditCards),
      msiPendingTotal(data.installmentPurchases),
    );
    const prevMonthSnap = data.snapshots
      .filter((s) => s.date.slice(0, 7) < month)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return { income, spent, necesidades, deseos, ahorro, deuda, tasa, catBars, patrimonio, delta: prevMonthSnap ? patrimonio - prevMonthSnap.netWorth : null, groups };
  }, [data, month, theme.primary]);

  if (!data || !m) return <Screen><EmptyState message="Cargando…" /></Screen>;

  return (
    <Screen>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth((x) => shiftMonthKey(x, -1))} accessibilityRole="button" accessibilityLabel="Mes anterior">
          <Text style={[styles.arrow, { color: theme.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{formatMonthKeyShort(month)}</Text>
        <Pressable onPress={() => setMonth((x) => shiftMonthKey(x, 1))} accessibilityRole="button" accessibilityLabel="Mes siguiente">
          <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <KpiCard label="Ingreso" value={money(m.income)} color={theme.success} />
        <KpiCard label="Gasto total" value={money(m.spent)} color={theme.danger} />
        <KpiCard label="Necesidades" value={money(m.necesidades)} />
        <KpiCard label="Deseos" value={money(m.deseos)} color={theme.warning} />
        <KpiCard label="Ahorro/Inversión" value={money(m.ahorro)} color={theme.info} />
        <KpiCard label="Deuda/Pago" value={money(m.deuda)} color={theme.textMuted} />
        <KpiCard
          label="Tasa de ahorro"
          value={m.tasa !== null ? `${m.tasa.toFixed(1)}%` : '—'}
          sub={m.tasa === null ? 'Define un ingreso en Configuración' : undefined}
          color={m.tasa !== null && m.tasa >= 10 ? theme.success : theme.warning}
        />
        <KpiCard
          label="Patrimonio"
          value={money(m.patrimonio)}
          sub={m.delta !== null ? `${m.delta >= 0 ? '+' : ''}${money(m.delta)} vs mes anterior` : undefined}
          color={m.patrimonio >= 0 ? theme.success : theme.danger}
        />
      </View>

      <SectionCard title="Gasto por categoría">
        {m.catBars.length === 0 ? (
          <EmptyState message="Sin gastos este mes" />
        ) : (
          <BarChart data={m.catBars} formatValue={money} />
        )}
      </SectionCard>

      <SectionCard title="Gasto por grupo">
        {m.groups.size === 0 ? (
          <EmptyState message="Sin gastos este mes" />
        ) : (
          <BarChart
            data={[...m.groups.entries()].map(([label, value]) => ({
              label,
              value,
              color: GROUP_COLORS[label as keyof typeof GROUP_COLORS] || theme.primary,
            }))}
            formatValue={money}
          />
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.sm },
  arrow: { fontSize: 30, fontWeight: '700', paddingHorizontal: spacing.md },
  monthLabel: { fontSize: font.subtitle, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
});
