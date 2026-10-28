// Pantalla Inicio / Dashboard: KPIs y alertas financieras.
import { store } from './appState.js';
import { card, section, kpi, kpiGrid, progress, alert, empty, primaryBtn } from '../ui.js';
import { money, money0, todayMonthKey, todayISO, formatDate, round2 } from '../format.js';
import {
  availableBalance,
  budgetStatus,
  cardSummary,
  emergencyCoverageMonths,
  essentialMonthlyFromServices,
  essentialPending,
  freeMoney,
  msiMonthlyTotal,
  msiPendingTotal,
  netWorth,
  protectedFundsTotal,
  spentByCategory,
  totalCardDebt,
  totalFunds,
  monthSpent,
} from '../finance.js';

export function renderDashboard() {
  const data = store.data;
  const accounts = data.accounts;
  const cards = data.creditCards;
  const activeCards = cards.filter((c) => c.active);
  const saldo = availableBalance(accounts);
  const apartados = totalFunds(data.funds);
  const protegido = protectedFundsTotal(data.funds);
  const mes = todayMonthKey();
  const gastoMes = monthSpent(data.transactions, mes);
  // Cada tarjeta con corte configurado aporta su pago del ciclo.
  const summaries = activeCards.filter((c) => c.cutDay).map((c) => ({ card: c, ...cardSummary(data, c) }));
  const respaldo = round2(summaries.reduce((acc, s) => acc + s.compras, 0));
  const msiMes = msiMonthlyTotal(data.installmentPurchases);
  const proximoPago = round2(respaldo + msiMes);
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
  const proximoCorte = summaries
    .filter((s) => s.dates.daysToCut !== null)
    .sort((a, b) => a.dates.daysToCut - b.dates.daysToCut)[0];
  const spentMap = spentByCategory(data.transactions, mes);
  const excedidos = data.budgets
    .filter((b) => b.month === mes)
    .map((b) => ({ b, spent: spentMap.get(b.categoryId) || 0 }))
    .filter(({ b, spent }) => spent > b.plannedAmount);

  const alerts = [];
  if (respaldo > 0) alerts.push(alert(`Compras TDC del ciclo por pagar: ${money(respaldo)}`, 'info'));
  if (libre < 0) alerts.push(alert(`Tu dinero libre real es negativo (${money0(libre)})`, 'danger'));
  for (const s of summaries) {
    const { daysToCut, daysToDue } = s.dates;
    if (daysToCut >= 0 && daysToCut <= 7) {
      alerts.push(alert(`${s.card.name}: corte ${daysToCut === 0 ? 'hoy' : `en ${daysToCut} días`}`, 'info'));
    }
    if (daysToDue >= 0 && daysToDue <= 10) {
      alerts.push(alert(`${s.card.name}: límite de pago ${daysToDue === 0 ? 'hoy' : `en ${daysToDue} días`}`, 'warning'));
    }
  }
  if (emergencia && emergencia.targetAmount && emergencia.currentAmount < emergencia.targetAmount) {
    alerts.push(alert('Fondo de emergencia por debajo de la meta', 'warning'));
  }
  for (const { b, spent } of excedidos) {
    const cat = data.categories.find((c) => c.id === b.categoryId);
    alerts.push(alert(`Presupuesto excedido: ${cat?.name || 'categoría'}`, 'danger'));
  }
  if (alerts.length === 0) alerts.push(alert('Todo en orden. Sigue así 💪', 'success'));

  const emPct = emergencia?.targetAmount ? (emergencia.currentAmount / emergencia.targetAmount) * 100 : 0;

  return `
    <div class="p-4 pb-10">
      <div class="mb-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">${formatDate(todayISO())}</div>
        <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">Saldo disponible</div>
        <div class="text-4xl font-extrabold text-slate-900 dark:text-slate-50">${money(saldo)}</div>
        <div class="text-sm font-semibold ${libre < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">
          Dinero libre real: ${money(libre)}
        </div>
      </div>

      <div class="flex flex-col gap-2 mb-4">${alerts.join('')}</div>

      ${primaryBtn('+ Registrar movimiento', 'new-tx')}

      <div class="mt-4">
        ${kpiGrid([
          kpi('Total apartados', money(apartados)),
          kpi('Dinero protegido', money(protegido), { color: 'sky' }),
          kpi('Gasto del mes', money(gastoMes)),
          kpi('Deuda TDC', money(deudaTDC), { color: deudaTDC > 0 ? 'red' : 'emerald' }),
          kpi('Pago del próximo corte', money(proximoPago), { sub: `MSI: ${money(msiMes)}/mes` }),
          kpi('Compras TDC del ciclo', money(respaldo), { color: respaldo > 0 ? 'amber' : 'emerald', sub: proximoCorte ? `Corte ${proximoCorte.card.name}` : 'Sin corte configurado' }),
          kpi('Fondo de emergencia', money(emergencia?.currentAmount || 0), { sub: `Meta: ${money(emergencia?.targetAmount || 0)}` }),
          kpi('Patrimonio neto', money(patrimonio), { color: patrimonio >= 0 ? 'emerald' : 'red' }),
        ])}
      </div>

      ${emergencia ? section('Avance fondo de emergencia', `
        ${progress(emPct, 'bg-indigo-500')}
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          ${emPct.toFixed(0)}% · Cobertura: ${cobertura !== null ? `${cobertura} meses de gastos esenciales` : 'sin esenciales definidos'}
        </div>
      `) : ''}

      ${section('Resumen del mes', `
        <div class="text-xs text-slate-500 dark:text-slate-400">Gastos esenciales mensuales (servicios): ${money(esencialMensual)}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Gastos esenciales pendientes este mes: ${money(esencialPend)}</div>
      `)}
    </div>
  `;
}
