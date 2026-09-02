// Pantalla Movimientos: lista filtrable por mes, tipo y búsqueda.
import { store, state } from './appState.js';
import { section, txRow, empty, chip, chipRow, monthNav } from '../ui.js';
import { money, formatMonthKeyShort, shiftMonthKey } from '../format.js';
import { monthSpent, monthIncome } from '../finance.js';

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
  { value: 'creditPayment', label: 'Pagos TDC' },
];

export function renderMovements() {
  const data = store.data;
  const catName = (id) => data.categories.find((c) => c.id === id)?.name || '—';
  const q = state.query.trim().toLowerCase();

  const filtered = data.transactions
    .filter((t) => t.date.startsWith(state.month))
    .filter((t) => state.typeFilter === 'all' || t.type === state.typeFilter)
    .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.merchant || '').toLowerCase().includes(q))
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

  const spent = monthSpent(data.transactions, state.month);
  const income = monthIncome(data.transactions, state.month);

  return `
    <div class="p-4 pb-10">
      ${monthNav(state.month, formatMonthKeyShort(state.month))}

      <div class="flex justify-between mb-3">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Gastos: ${money(spent)}</span>
        <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ingresos: ${money(income)}</span>
      </div>

      <input id="search-input" type="search" value="${state.query}" placeholder="Buscar por descripción…"
        class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Buscar movimientos" />

      ${chipRow(TYPE_FILTERS.map((f) => chip(f.label, { selected: state.typeFilter === f.value, action: 'filter-type', payload: f.value })))}

      <div class="mt-3">
        <div id="movements-list">
          ${section(`Movimientos (${filtered.length})`,
            filtered.length === 0
              ? empty('Sin movimientos para este filtro', 'Toca + para registrar uno')
              : filtered.map((t) => txRow(t, catName(t.categoryId))).join(''),
          )}
        </div>
      </div>
    </div>
  `;
}
