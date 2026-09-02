// Pantalla Inicio / Dashboard: KPIs y alertas financieras.
import { store } from './appState.js';
import { card, section, kpi, kpiGrid, progress, alert, empty, primaryBtn } from '../ui.js';
import { money, money0, todayMonthKey, formatDate } from '../format.js';
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
} from '../finance.js';

export function renderDashboard() {
  const data = store.data;
  const accounts = data.accounts;
  const cards = data.creditCards;
  const card_ = cards.find((c) => c.active);
  const saldo = availableBalance(accounts);
  const apartados = totalFunds(data.funds);
  const protegido = protectedFundsTotal(data.funds);
  const mes = todayMonthKey();
  const gastoMes = monthSpent(data.transactions, mes);
  const creditIds = accounts.filter((a) => a.type === 'credit').map((a) => a.id);
  const ciclo = card_ ? currentCycleRange(card_.cutDay) : null;
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
  const diasCorte = card_ ? daysUntilISO(ciclo.end) : null;
  const diasLimite = card_ ? daysUntilISO(nextDueDate(card_.cutDay)) : null;
  const spentMap = spentByCategory(data.transactions, mes);
  const excedidos = data.budgets
    .filter((b) => b.month === mes)
    .map((b) => ({ b, spent: spentMap.get(b.categoryId) || 0 }))
    .filter(({ b, spent }) => spent > b.plannedAmount);

  const alerts = [];
  if (respaldo > 0) alerts.push(alert(`Tienes ${money(respaldo)} gastados con TDC sin respaldar`, 'warning'));
  if (libre < 0) alerts.push(alert(`Tu dinero libre real es negativo (${money0(libre)})`, 'danger'));
  if (diasCorte !== null && diasCorte >= 0 && diasCorte <= 7) alerts.push(alert(`Faltan ${diasCorte} días para el corte de la tarjeta`, 'info'));
  if (diasLimite !== null && diasLimite >= 0 && diasLimite <= 10) alerts.push(alert(`Faltan ${diasLimite} días para la fecha límite de pago`, 'info'));
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
    <div class="p-4 pb-24">
      <div class="mb-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">${formatDate(new Date().toISOString().slice(0, 10))}</div>
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
          kpi('Próximo pago TDC', money(proximoPago), { sub: `MSI: ${money(msiMes)}/mes` }),
          kpi('Respaldo TDC pendiente', money(respaldo), { color: respaldo > 0 ? 'amber' : 'emerald', sub: 'Compras del ciclo' }),
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
