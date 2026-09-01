// Pantalla Movimientos: lista filtrable por mes, tipo, búsqueda.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import TxRow from '../components/TxRow';
import EmptyState from '../components/EmptyState';
import { Chip, ChipRow } from '../components/Chip';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { money, shiftMonthKey, todayMonthKey, formatMonthKeyShort } from '../utils/format';
import { monthSpent, monthIncome } from '../services/financeService';
import type { RootStackParamList } from '../navigation';
import type { TransactionType } from '../models/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TYPE_FILTERS: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
  { value: 'creditPayment', label: 'Pagos TDC' },
];

export default function MovementsScreen() {
  const { data } = useAppData();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [month, setMonth] = useState(todayMonthKey());
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [query, setQuery] = useState('');

  const catName = (id: string) => data?.categories.find((c) => c.id === id)?.name || '—';

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.transactions
      .filter((t) => t.date.startsWith(month))
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.merchant || '').toLowerCase().includes(q))
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [data, month, typeFilter, query]);

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const spent = monthSpent(data.transactions, month);
  const income = monthIncome(data.transactions, month);

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

      <View style={styles.summary}>
        <Text style={[styles.sumText, { color: theme.textMuted }]}>Gastos: {money(spent)}</Text>
        <Text style={[styles.sumText, { color: theme.success }]}>Ingresos: {money(income)}</Text>
      </View>

      <TextInput
        style={[styles.search, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        placeholder="Buscar por descripción…"
        placeholderTextColor={theme.textMuted}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Buscar movimientos"
      />

      <ChipRow>
        {TYPE_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={typeFilter === f.value} onPress={() => setTypeFilter(f.value)} />
        ))}
      </ChipRow>

      <SectionCard title={`Movimientos (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState message="Sin movimientos para este filtro" hint="Toca + para registrar uno" />
        ) : (
          filtered.map((t) => (
            <TxRow
              key={t.id}
              tx={t}
              categoryName={catName(t.categoryId)}
              onPress={() => navigation.navigate('NuevoMovimiento', { id: t.id })}
            />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.sm },
  arrow: { fontSize: 30, fontWeight: '700', paddingHorizontal: spacing.md },
  monthLabel: { fontSize: font.subtitle, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  sumText: { fontSize: font.small, fontWeight: '600' },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
    fontSize: font.body,
  },
});
