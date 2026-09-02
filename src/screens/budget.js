// Pantalla Presupuesto: por mes, semáforo verde/amarillo/rojo.
import { store, state } from './appState.js';
import { section, progress, monthNav, empty } from '../ui.js';
import { money, formatMonthKeyShort, shiftMonthKey } from '../format.js';
import { budgetStatus, spentByCategory } from '../finance.js';

const LEVEL_BAR = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-500',
};
const LEVEL_TEXT = {
  verde: 'text-emerald-600 dark:text-emerald-400',
  amarillo: 'text-amber-600 dark:text-amber-400',
  rojo: 'text-red-600 dark:text-red-400',
};

export function renderBudget() {
  const data = store.data;
  const month = state.budgetMonth;
  const spent = spentByCategory(data.transactions, month);
  const catActive = new Set(data.categories.filter((c) => c.active).map((c) => c.id));
  const rows = data.budgets
    .filter((b) => b.month === month && catActive.has(b.categoryId))
    .map((b) => {
      const actual = spent.get(b.categoryId) || 0;
      const status = budgetStatus(b.plannedAmount, actual);
      return {
        budget: b,
        catName: data.categories.find((c) => c.id === b.categoryId)?.name || '—',
        actual,
        status,
      };
    })
    .sort((a, b) => b.actual / Math.max(b.budget.plannedAmount, 1) - a.actual / Math.max(a.budget.plannedAmount, 1));

  const totalPlanned = rows.reduce((a, r) => a + r.budget.plannedAmount, 0);
  const totalSpent = rows.reduce((a, r) => a + r.actual, 0);
  const totalStatus = budgetStatus(totalPlanned, totalSpent);

  return `
    <div class="p-4 pb-28">
      ${monthNav(month, formatMonthKeyShort(month))}

      ${section('Resumen', `
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-extrabold text-slate-900 dark:text-slate-100">${money(totalSpent)}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">gastado de ${money(totalPlanned)} presupuestado</span>
        </div>
        <div class="mt-2">${progress(totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0, LEVEL_BAR[totalStatus.level])}</div>
      `)}

      ${section('Por categoría', rows.length === 0
        ? empty('Sin presupuesto para este mes')
        : rows.map((r) => `
            <div class="mb-4">
              <div class="flex items-center gap-2">
                <span class="flex-1 font-semibold text-sm truncate text-slate-900 dark:text-slate-100">${r.catName}</span>
                <span class="font-bold text-sm ${LEVEL_TEXT[r.status.level]}">${Number.isFinite(r.status.pct) ? `${r.status.pct.toFixed(0)}%` : '∞'}</span>
                <button data-action="budget-edit" data-id="${r.budget.id}" class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold px-2 py-1 rounded-lg">Editar</button>
              </div>
              <div class="mt-1">${progress(Number.isFinite(r.status.pct) ? r.status.pct : 100, LEVEL_BAR[r.status.level], 'h-1.5')}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${money(r.actual)} de ${money(r.budget.plannedAmount)} · disponible ${money(r.budget.plannedAmount - r.actual)}</div>
            </div>
          `).join(''))}
    </div>
  `;
}
