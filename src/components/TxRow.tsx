import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Transaction } from '../models/types';
import { useTheme } from '../hooks/useTheme';
import { money, formatDateShort } from '../utils/format';
import { font, spacing } from '../theme';

const TYPE_LABEL: Record<Transaction['type'], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  creditPayment: 'Pago TDC',
};

interface Props {
  tx: Transaction;
  categoryName: string;
  onPress?: () => void;
}

export default function TxRow({ tx, categoryName, onPress }: Props) {
  const theme = useTheme();
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const isCreditPay = tx.type === 'creditPayment';
  const amountColor = isIncome ? theme.success : isTransfer || isCreditPay ? theme.textMuted : theme.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tx.description}, ${money(tx.amount)}, ${categoryName}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.main}>
        <View style={styles.line}>
          <Text style={[styles.desc, { color: theme.text }]} numberOfLines={1}>
            {tx.description}
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIncome ? '+' : isTransfer || isCreditPay ? '' : '-'}
            {money(tx.amount)}
          </Text>
        </View>
        <View style={styles.line}>
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {formatDateShort(tx.date)} · {categoryName}
            {tx.isPending ? ' · Pendiente' : ''}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>{TYPE_LABEL[tx.type]}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.25)',
  },
  main: { gap: 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  desc: { flex: 1, fontSize: font.body, fontWeight: '600' },
  amount: { fontSize: font.body, fontWeight: '700' },
  meta: { flex: 1, fontSize: font.tiny },
});
