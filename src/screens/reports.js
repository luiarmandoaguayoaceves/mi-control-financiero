// Pantalla Reportes: resumen mensual y gráficas simples.
import { store, state } from './appState.js';
import { section, kpi, kpiGrid, barChart, monthNav, empty } from '../ui.js';
import { money, formatMonthKeyShort, shiftMonthKey } from '../format.js';
import { monthIncome, monthSpent, spentByGroup, spentByCategory, netWorth, totalCardDebt, msiPendingTotal } from '../finance.js';
import { GROUP_COLORS } from '../models.js';

export function renderReports() {
  const data = store.data;
  const month = state.reportsMonth;
  const income = monthIncome(data.transactions, month);
  const spent = monthSpent(data.transactions, month);
  const groups = spentByGroup(data.transactions, month, data.categories);
  const byCat = spentByCategory(data.transactions, month);
  const catBars = [...byCat.entries()]
    .map(([catId, value]) => ({
      label: data.categories.find((c) => c.id === catId)?.name || '—',
      value,
      color: GROUP_COLORS[data.categories.find((c) => c.id === catId)?.group] || '#6366F1',
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
  const delta = prevMonthSnap ? patrimonio - prevMonthSnap.netWorth : null;

  return `
    <div class="p-4 pb-28">
      ${monthNav(month, formatMonthKeyShort(month))}

      ${kpiGrid([
        kpi('Ingreso', money(income), { color: 'emerald' }),
        kpi('Gasto total', money(spent), { color: 'red' }),
        kpi('Necesidades', money(necesidades)),
        kpi('Deseos', money(deseos), { color: 'amber' }),
        kpi('Ahorro/Inversión', money(ahorro), { color: 'sky' }),
        kpi('Deuda/Pago', money(deuda), { color: 'slate' }),
        kpi('Tasa de ahorro', tasa !== null ? `${tasa.toFixed(1)}%` : '—', {
          color: tasa !== null && tasa >= 10 ? 'emerald' : 'amber',
          sub: tasa === null ? 'Define un ingreso en Configuración' : '',
        }),
        kpi('Patrimonio', money(patrimonio), {
          color: patrimonio >= 0 ? 'emerald' : 'red',
          sub: delta !== null ? `${delta >= 0 ? '+' : ''}${money(delta)} vs mes anterior` : '',
        }),
      ])}

      <div class="mt-4">
        ${section('Gasto por categoría', catBars.length === 0 ? empty('Sin gastos este mes') : barChart(catBars, money))}
        ${section('Gasto por grupo', groups.size === 0 ? empty('Sin gastos este mes') : barChart(
          [...groups.entries()].map(([label, value]) => ({ label, value, color: GROUP_COLORS[label] || '#6366F1' })),
          money,
        ))}
      </div>
    </div>
  `;
}
