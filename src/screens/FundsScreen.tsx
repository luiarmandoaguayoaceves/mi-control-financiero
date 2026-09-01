// Pantalla Apartados: ver, ingresar/retirar, proteger.
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
import { totalFunds, protectedFundsTotal } from '../services/financeService';
import type { Fund } from '../models/types';

type ModalState =
  | { kind: 'move'; fund: Fund; op: 'deposit' | 'withdraw' }
  | { kind: 'edit'; fund: Fund }
  | null;

export default function FundsScreen() {
  const { data, fundMovement, updateFund } = useAppData();
  const theme = useTheme();
  const [modal, setModal] = useState<ModalState>(null);

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const funds = data.funds.filter((f) => f.active);
  const total = totalFunds(data.funds);
  const protegido = protectedFundsTotal(data.funds);

  const handleMove = async (values: Record<string, string>) => {
    if (!modal || modal.kind !== 'move') return;
    const amt = parseFloat((values.amount || '').replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return;
    await fundMovement(modal.fund.id, amt, modal.op);
  };

  const handleEdit = async (values: Record<string, string>) => {
    if (!modal || modal.kind !== 'edit') return;
    const target = parseFloat((values.target || '').replace(',', '.'));
    await updateFund({
      ...modal.fund,
      targetAmount: Number.isFinite(target) && target > 0 ? target : undefined,
      purpose: values.purpose ?? modal.fund.purpose,
    });
  };

  return (
    <Screen>
      <SectionCard title="Total en apartados">
        <View style={styles.totalRow}>
          <Text style={[styles.total, { color: theme.text }]}>{money(total)}</Text>
          <Text style={[styles.protected, { color: theme.info }]}>{money(protegido)} protegidos</Text>
        </View>
      </SectionCard>

      {funds.map((f) => {
        const pct = f.targetAmount ? (f.currentAmount / f.targetAmount) * 100 : null;
        return (
          <SectionCard
            key={f.id}
            title={f.name}
            action={
              f.protected ? (
                <View style={[styles.badge, { backgroundColor: theme.infoSoft }]}>
                  <Text style={[styles.badgeText, { color: theme.info }]}>Protegido</Text>
                </View>
              ) : undefined
            }
          >
            <View style={styles.fundRow}>
              <Text style={[styles.amount, { color: theme.text }]}>{money(f.currentAmount)}</Text>
              {f.targetAmount ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>meta {money(f.targetAmount)}</Text>
              ) : null}
            </View>
            {pct !== null ? <ProgressBar value={pct} color={theme.primary} /> : null}
            {f.purpose ? <Text style={[styles.meta, { color: theme.textMuted }]}>{f.purpose}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                onPress={() => setModal({ kind: 'move', fund: f, op: 'deposit' })}
                accessibilityRole="button"
                style={[styles.btn, { backgroundColor: theme.successSoft }]}
              >
                <Text style={{ color: theme.success, fontWeight: '700' }}>Ingresar</Text>
              </Pressable>
              <Pressable
                onPress={() => setModal({ kind: 'move', fund: f, op: 'withdraw' })}
                accessibilityRole="button"
                style={[styles.btn, { backgroundColor: theme.warningSoft }]}
              >
                <Text style={{ color: theme.warning, fontWeight: '700' }}>Retirar</Text>
              </Pressable>
              <Pressable
                onPress={() => setModal({ kind: 'edit', fund: f })}
                accessibilityRole="button"
                style={[styles.btn, { backgroundColor: theme.cardAlt }]}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Meta</Text>
              </Pressable>
            </View>
          </SectionCard>
        );
      })}

      <ModalInput
        visible={modal?.kind === 'move'}
        title={modal?.kind === 'move' ? `${modal.op === 'deposit' ? 'Ingresar a' : 'Retirar de'} ${modal.fund.name}` : ''}
        fields={[
          { key: 'amount', label: 'Monto', keyboardType: 'decimal-pad', placeholder: '0.00' },
        ]}
        submitLabel={modal?.kind === 'move' ? (modal.op === 'deposit' ? 'Ingresar' : 'Retirar') : 'Aplicar'}
        onClose={() => setModal(null)}
        onSave={handleMove}
      />
      <ModalInput
        visible={modal?.kind === 'edit'}
        title={modal?.kind === 'edit' ? `Meta: ${modal.fund.name}` : ''}
        fields={[
          { key: 'target', label: 'Monto meta (vacío = sin meta)', keyboardType: 'decimal-pad', value: modal?.kind === 'edit' && modal.fund.targetAmount ? String(modal.fund.targetAmount) : '' },
          { key: 'purpose', label: 'Propósito', value: modal?.kind === 'edit' ? modal.fund.purpose : '' },
        ]}
        onClose={() => setModal(null)}
        onSave={handleEdit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { fontSize: 28, fontWeight: '800' },
  protected: { fontSize: font.small, fontWeight: '600' },
  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { fontSize: font.subtitle, fontWeight: '700' },
  meta: { fontSize: font.small },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
});
