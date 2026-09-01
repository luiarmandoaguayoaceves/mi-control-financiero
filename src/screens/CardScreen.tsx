// Pantalla Tarjeta: resumen TDC, proyección de pago y compras MSI.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import KpiCard from '../components/KpiCard';
import ProgressBar from '../components/ProgressBar';
import AlertBanner from '../components/AlertBanner';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { money, money0 } from '../utils/format';
import {
  currentCycleRange,
  daysUntilISO,
  msiCount,
  msiIncomeRatio,
  msiMonthlyTotal,
  msiPendingTotal,
  nextDueDate,
  nextTdcPayment,
  tdcBackingNeeded,
} from '../services/financeService';

export default function CardScreen() {
  const { data } = useAppData();
  const theme = useTheme();

  const m = useMemo(() => {
    if (!data) return null;
    const card = data.creditCards.find((c) => c.active) || data.creditCards[0];
    if (!card) return null;
    const creditIds = data.accounts.filter((a) => a.type === 'credit').map((a) => a.id);
    const ciclo = currentCycleRange(card.cutDay);
    const respaldo = tdcBackingNeeded(data.transactions, creditIds, ciclo);
    const msiMes = msiMonthlyTotal(data.installmentPurchases);
    const ratio = msiIncomeRatio(msiMes, data.settings.monthlyIncome);
    return {
      card,
      ciclo,
      respaldo,
      msiMes,
      ratio,
      msiTotal: msiPendingTotal(data.installmentPurchases),
      msiN: msiCount(data.installmentPurchases),
      pago: nextTdcPayment(respaldo, msiMes),
      diasCorte: daysUntilISO(ciclo.end),
      diasLimite: daysUntilISO(nextDueDate(card.cutDay)),
      msi: data.installmentPurchases.filter((i) => i.active && i.pendingBalance > 0),
    };
  }, [data]);

  if (!data || !m) {
    return (
      <Screen>
        <EmptyState message="No hay tarjeta registrada" hint="Agrégala en Configuración" />
      </Screen>
    );
  }

  const { card } = m;
  const usoPct = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;

  return (
    <Screen>
      <SectionCard title={card.name}>
        <View style={styles.cardHeader}>
          <Text style={[styles.bank, { color: theme.textMuted }]}>{card.bank} · •••• Azul</Text>
          <Text style={[styles.points, { color: theme.primary }]}>{card.points} pts</Text>
        </View>
        <Text style={[styles.balance, { color: theme.text }]} adjustsFontSizeToFit numberOfLines={1}>
          {money(card.currentBalance)}
        </Text>
        <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>saldo utilizado</Text>
        <ProgressBar value={usoPct} color={usoPct > 80 ? theme.danger : theme.primary} />
        <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
          Línea: {money0(card.creditLimit)} · Disponible: {money0(card.availableCredit)}
        </Text>
        <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
          Corte: día {card.cutDay} ({m.diasCorte >= 0 ? `en ${m.diasCorte} días` : 'este mes'}) · Límite de pago: {m.diasLimite >= 0 ? `en ${m.diasLimite} días` : '—'}
        </Text>
        {card.notes ? <Text style={[styles.notes, { color: theme.textMuted }]}>{card.notes}</Text> : null}
      </SectionCard>

      <View style={styles.grid}>
        <KpiCard label="Pago proyectado" value={money(m.pago)} sub="Próximo corte (dinámico)" color={theme.primary} />
        <KpiCard label="Compras sin respaldar" value={money(m.respaldo)} sub="Deben cubrirse con efectivo" color={m.respaldo > 0 ? theme.warning : theme.success} />
        <KpiCard label="MSI mensuales" value={money(m.msiMes)} sub={`${m.msiN} compras activas`} />
        <KpiCard label="Saldo MSI pendiente" value={money(m.msiTotal)} sub="No es el pago del corte" color={theme.textMuted} />
      </View>

      {m.ratio !== null && m.ratio > 20 ? (
        <AlertBanner
          message={`Las mensualidades MSI comprometen ${m.ratio}% de tu ingreso mensual estimado.`}
          tone="warning"
        />
      ) : m.ratio !== null ? (
        <AlertBanner message={`MSI = ${m.ratio}% del ingreso mensual estimado`} tone="info" />
      ) : null}

      <AlertBanner
        message="El saldo total NO es el pago requerido: parte pertenece a MSI futuros."
        tone="info"
      />

      <SectionCard title={`Compras a MSI (${m.msi.length})`}>
        {m.msi.length === 0 ? (
          <EmptyState message="Sin compras MSI activas" />
        ) : (
          m.msi.map((i) => {
            const done = (i.currentPaymentNumber / i.totalMonths) * 100;
            return (
              <View key={i.id} style={styles.msiRow}>
                <View style={styles.msiHead}>
                  <Text style={[styles.msiDesc, { color: theme.text }]} numberOfLines={1}>
                    {i.description}
                  </Text>
                  <Text style={[styles.msiPay, { color: theme.text }]}>{money(i.monthlyPayment)}/mes</Text>
                </View>
                <ProgressBar value={done} color={theme.primary} height={6} />
                <View style={styles.msiMeta}>
                  <Text style={[styles.msiMetaText, { color: theme.textMuted }]}>
                    Pago {i.currentPaymentNumber} de {i.totalMonths} · {i.interestRate === 0 ? '0% interés' : `${i.interestRate}%`}
                  </Text>
                  <Text style={[styles.msiMetaText, { color: theme.textMuted }]}>Saldo: {money(i.pendingBalance)}</Text>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bank: { fontSize: font.small },
  points: { fontSize: font.small, fontWeight: '700' },
  balance: { fontSize: 32, fontWeight: '800', marginTop: spacing.sm },
  balanceLabel: { fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm },
  cardMeta: { fontSize: font.small, marginTop: spacing.xs },
  notes: { fontSize: font.tiny, marginTop: spacing.sm, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  msiRow: { gap: spacing.xs, marginBottom: spacing.lg },
  msiHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  msiDesc: { flex: 1, fontSize: font.body, fontWeight: '600' },
  msiPay: { fontSize: font.body, fontWeight: '700' },
  msiMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  msiMetaText: { fontSize: font.tiny },
});
