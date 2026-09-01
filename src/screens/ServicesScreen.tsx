// Pantalla Servicios: gastos fijos y suscripciones.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import ModalInput from '../components/ModalInput';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';
import { money } from '../utils/format';
import type { Service } from '../models/types';

const FIXED = ['Renta', 'Agua', 'Luz', 'Gas', 'Internet', 'Teléfono'];

export default function ServicesScreen() {
  const { data, updateService } = useAppData();
  const theme = useTheme();
  const [editing, setEditing] = useState<Service | null>(null);

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name || '—';
  const fixed = data.services.filter((s) => FIXED.some((n) => s.name.toLowerCase().includes(n.toLowerCase())));
  const subs = data.services.filter((s) => !FIXED.some((n) => s.name.toLowerCase().includes(n.toLowerCase())));

  const toggle = async (s: Service) => {
    await updateService({ ...s, active: !s.active });
  };

  const saveEdit = async (values: Record<string, string>) => {
    if (!editing) return;
    const expected = parseFloat((values.expected || '').replace(',', '.'));
    await updateService({
      ...editing,
      expectedMonthlyAmount: Number.isFinite(expected) && expected >= 0 ? expected : editing.expectedMonthlyAmount,
      dueDay: values.dueDay ? Math.min(28, Math.max(1, parseInt(values.dueDay, 10) || editing.dueDay || 1)) : undefined,
      notes: values.notes ?? editing.notes,
    });
  };

  const renderService = (s: Service) => {
    const variation = s.lastAmount && s.expectedMonthlyAmount > 0
      ? ((s.lastAmount - s.expectedMonthlyAmount) / s.expectedMonthlyAmount) * 100
      : null;
    return (
      <View key={s.id} style={[styles.svc, { borderColor: theme.border }]}>
        <View style={styles.svcHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.svcName, { color: theme.text, opacity: s.active ? 1 : 0.45 }]}>{s.name}</Text>
            <Text style={[styles.svcMeta, { color: theme.textMuted }]}>
              {catName(s.categoryId)}
              {s.dueDay ? ` · día ${s.dueDay}` : ''}
            </Text>
          </View>
          <Switch value={s.active} onValueChange={() => toggle(s)} accessibilityLabel={`Activar ${s.name}`} />
        </View>
        <View style={styles.svcRow}>
          <Text style={[styles.svcAmount, { color: theme.text, opacity: s.active ? 1 : 0.45 }]}>
            {money(s.expectedMonthlyAmount)}/mes
          </Text>
          <Text style={[styles.svcMeta, { color: theme.textMuted }]}>
            Último: {money(s.lastAmount || 0)}
            {variation !== null ? ` (${variation > 0 ? '+' : ''}${variation.toFixed(0)}%)` : ''}
          </Text>
          <Pressable onPress={() => setEditing(s)} accessibilityRole="button" style={[styles.editBtn, { backgroundColor: theme.primarySoft }]}>
            <Text style={{ color: theme.primary, fontSize: font.tiny, fontWeight: '700' }}>Editar</Text>
          </Pressable>
        </View>
        {s.notes ? <Text style={[styles.svcNotes, { color: theme.textMuted }]}>{s.notes}</Text> : null}
      </View>
    );
  };

  return (
    <Screen>
      <SectionCard title="Gastos fijos">
        {fixed.length === 0 ? <EmptyState message="Sin servicios fijos" /> : fixed.map(renderService)}
      </SectionCard>
      <SectionCard title="Suscripciones / digitales">
        {subs.length === 0 ? <EmptyState message="Sin suscripciones" /> : subs.map(renderService)}
      </SectionCard>

      <ModalInput
        visible={!!editing}
        title={editing ? `Editar: ${editing.name}` : ''}
        fields={[
          { key: 'expected', label: 'Monto mensual ($)', keyboardType: 'decimal-pad', value: editing ? String(editing.expectedMonthlyAmount) : '' },
          { key: 'dueDay', label: 'Día de cobro (1-28, vacío = ninguno)', keyboardType: 'numeric', value: editing?.dueDay ? String(editing.dueDay) : '' },
          { key: 'notes', label: 'Notas', value: editing?.notes || '' },
        ]}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  svc: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  svcHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  svcName: { fontSize: font.body, fontWeight: '700' },
  svcMeta: { fontSize: font.tiny },
  svcRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  svcAmount: { flex: 1, fontSize: font.body, fontWeight: '700' },
  svcNotes: { fontSize: font.tiny, fontStyle: 'italic' },
  editBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
});
