// Pantalla Inicio / Dashboard: KPIs y alertas financieras.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import KpiCard from '../components/KpiCard';
import SectionCard from '../components/SectionCard';
import ProgressBar from '../components/ProgressBar';
import AlertBanner from '../components/AlertBanner';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { money, money0, todayMonthKey, formatDate } from '../utils/format';
import {
  availableBalance,
  budgetStatus,
  currentCycleRange,
  daysUntilISO,
  emergencyCoverageMonths,
  essentialMonthlyFromServices,
  essentialPending,
  freeMoney,
  msiMonthlyTotal,
  msiPendingTotal,
  netWorth,
  nextDueDate,
  nextTdcPayment,
  protectedFundsTotal,
  spentByCategory,
  tdcBackingNeeded,
  totalCardDebt,
  totalFunds,
  monthSpent,
} from '../services/financeService';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { data } = useAppData();
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const m = useMemo(() => {
    if (!data) return null;
    const accounts = data.accounts;
    const cards = data.creditCards;
    const card = cards.find((c) => c.active);
    const saldo = availableBalance(accounts);
    const apartados = totalFunds(data.funds);
    const protegido = protectedFundsTotal(data.funds);
    const mes = todayMonthKey();
    const gastoMes = monthSpent(data.transactions, mes);
    const creditIds = accounts.filter((a) => a.type === 'credit').map((a) => a.id);
    const ciclo = card ? currentCycleRange(card.cutDay) : null;
    const respaldo = ciclo ? tdcBackingNeeded(data.transactions, creditIds, ciclo) : 0;
    const msiMes = msiMonthlyTotal(data.installmentPurchases);
    const proximoPago = nextTdcPayment(respaldo, msiMes);
    const deudaTDC = totalCardDebt(cards);
    const esencialMensual = essentialMonthlyFromServices(data.services);
    const esencialPend = essentialPending(data.services, data.transactions);
    const libre = freeMoney(saldo, apartados, respaldo, esencialPend);
    const emergencia = data.funds.find((f) => f.id === 'f-emergencia' && f.active)
      || data.funds.find((f) => f.active && /emergencia/i.test(f.name));
    const cobertura = emergencyCoverageMonths(emergencia?.currentAmount || 0, esencialMensual);
    const patrimonio = netWorth(
      data.assets.reduce((a, x) => a + x.estimatedValue, 0),
      data.liabilities.reduce((a, x) => a + x.outstandingBalance, 0),
      deudaTDC,
      msiPendingTotal(data.installmentPurchases),
    );
    const diasCorte = card ? daysUntilISO(ciclo!.end) : null;
    const diasLimite = card ? daysUntilISO(nextDueDate(card.cutDay)) : null;
    const spentMap = spentByCategory(data.transactions, mes);
    const excedidos = data.budgets
      .filter((b) => b.month === mes)
      .map((b) => ({ b, spent: spentMap.get(b.categoryId) || 0 }))
      .filter(({ b, spent }) => spent > b.plannedAmount);

    const alerts: { msg: string; tone: 'warning' | 'danger' | 'info' | 'success' }[] = [];
    if (respaldo > 0) {
      alerts.push({ msg: `Tienes ${money(respaldo)} gastados con TDC sin respaldar`, tone: 'warning' });
    }
    if (libre < 0) {
      alerts.push({ msg: `Tu dinero libre real es negativo (${money0(libre)})`, tone: 'danger' });
    }
    if (diasCorte !== null && diasCorte >= 0 && diasCorte <= 7) {
      alerts.push({ msg: `Faltan ${diasCorte} días para el corte de la tarjeta`, tone: 'info' });
    }
    if (diasLimite !== null && diasLimite >= 0 && diasLimite <= 10) {
      alerts.push({ msg: `Faltan ${diasLimite} días para la fecha límite de pago`, tone: 'info' });
    }
    if (emergencia && emergencia.targetAmount && emergencia.currentAmount < emergencia.targetAmount) {
      alerts.push({ msg: 'Fondo de emergencia por debajo de la meta', tone: 'warning' });
    }
    for (const { b, spent } of excedidos) {
      const cat = data.categories.find((c) => c.id === b.categoryId);
      alerts.push({ msg: `Presupuesto excedido: ${cat?.name || 'categoría'}`, tone: 'danger' });
    }
    if (alerts.length === 0) {
      alerts.push({ msg: 'Todo en orden. Sigue así 💪', tone: 'success' });
    }
    return { saldo, apartados, protegido, gastoMes, libre, deudaTDC, proximoPago, msiMes, emergencia, cobertura, patrimonio, alerts, respaldo, esencialPend, esencialMensual };
  }, [data]);

  if (!data || !m) {
    return (
      <Screen>
        <EmptyState message="Cargando tus finanzas…" />
      </Screen>
    );
  }

  const emPct = m.emergencia?.targetAmount
    ? (m.emergencia.currentAmount / m.emergencia.targetAmount) * 100
    : 0;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.date, { color: theme.textMuted }]}>{formatDate(new Date().toISOString().slice(0, 10))}</Text>
        <Text style={[styles.heroLabel, { color: theme.textMuted }]}>Saldo disponible</Text>
        <Text style={[styles.heroValue, { color: theme.text }]} adjustsFontSizeToFit numberOfLines={1}>
          {money(m.saldo)}
        </Text>
        <Text style={[styles.heroSub, { color: theme.textMuted }]}>
          Dinero libre real: {money(m.libre)}
        </Text>
      </View>

      <View style={styles.alerts}>
        {m.alerts.map((a, i) => (
          <AlertBanner key={i} message={a.msg} tone={a.tone} />
        ))}
      </View>

      <Pressable
        onPress={() => navigation.navigate('NuevoMovimiento', {})}
        accessibilityRole="button"
        style={[styles.cta, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.ctaText}>+ Registrar movimiento</Text>
      </Pressable>

      <View style={styles.grid}>
        <KpiCard label="Total apartados" value={money(m.apartados)} />
        <KpiCard label="Dinero protegido" value={money(m.protegido)} color={theme.info} />
        <KpiCard label="Gasto del mes" value={money(m.gastoMes)} />
        <KpiCard label="Deuda TDC" value={money(m.deudaTDC)} color={m.deudaTDC > 0 ? theme.danger : theme.success} />
        <KpiCard label="Próximo pago TDC" value={money(m.proximoPago)} sub={`MSI: ${money(m.msiMes)}/mes`} />
        <KpiCard label="Respaldo TDC pendiente" value={money(m.respaldo)} sub="Compras del ciclo" color={m.respaldo > 0 ? theme.warning : theme.success} />
        <KpiCard label="Fondo de emergencia" value={money(m.emergencia?.currentAmount || 0)} sub={`Meta: ${money(m.emergencia?.targetAmount || 0)}`} />
        <KpiCard label="Patrimonio neto" value={money(m.patrimonio)} color={m.patrimonio >= 0 ? theme.success : theme.danger} />
      </View>

      {m.emergencia ? (
        <SectionCard title="Avance fondo de emergencia">
          <ProgressBar value={emPct} color={theme.primary} />
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {emPct.toFixed(0)}% · Cobertura: {m.cobertura !== null ? `${m.cobertura} meses de gastos esenciales` : 'sin esenciales definidos'}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard title="Resumen del mes">
        <Text style={[styles.sumRow, { color: theme.textMuted }]}>
          Gastos esenciales mensuales (servicios): {money(m.esencialMensual)}
        </Text>
        <Text style={[styles.sumRow, { color: theme.textMuted }]}>
          Gastos esenciales pendientes este mes: {money(m.esencialPend)}
        </Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.lg, gap: 2 },
  date: { fontSize: font.small },
  heroLabel: { fontSize: font.small, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.sm },
  heroValue: { fontSize: 34, fontWeight: '800' },
  heroSub: { fontSize: font.body, fontWeight: '600' },
  alerts: { gap: spacing.sm, marginBottom: spacing.lg },
  cta: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: font.body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  progressText: { fontSize: font.small },
  sumRow: { fontSize: font.small },
});
