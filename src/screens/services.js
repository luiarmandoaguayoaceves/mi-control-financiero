// Pantalla Servicios: gastos fijos y suscripciones.
import { store } from './appState.js';
import { section, empty } from '../ui.js';
import { money } from '../format.js';

const FIXED = ['Renta', 'Agua', 'Luz', 'Gas', 'Internet', 'Teléfono'];

export function renderServices() {
  const data = store.data;
  const catName = (id) => data.categories.find((c) => c.id === id)?.name || '—';
  const fixed = data.services.filter((s) => FIXED.some((n) => s.name.toLowerCase().includes(n.toLowerCase())));
  const subs = data.services.filter((s) => !FIXED.some((n) => s.name.toLowerCase().includes(n.toLowerCase())));

  const renderService = (s) => {
    const variation = s.lastAmount && s.expectedMonthlyAmount > 0
      ? ((s.lastAmount - s.expectedMonthlyAmount) / s.expectedMonthlyAmount) * 100
      : null;
    return `
      <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-3">
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm ${s.active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'}">${s.name}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${catName(s.categoryId)}${s.dueDay ? ` · día ${s.dueDay}` : ''}</div>
          </div>
          <button data-action="service-toggle" data-id="${s.id}" role="switch" aria-checked="${s.active}"
            class="w-11 h-6 rounded-full p-0.5 transition ${s.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
            <span class="block w-5 h-5 bg-white rounded-full transition ${s.active ? 'ml-auto' : ''}"></span>
          </button>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <span class="flex-1 font-bold text-sm ${s.active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'}">${money(s.expectedMonthlyAmount)}/mes</span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">Último: ${money(s.lastAmount || 0)}${variation !== null ? ` (${variation > 0 ? '+' : ''}${variation.toFixed(0)}%)` : ''}</span>
          <button data-action="service-edit" data-id="${s.id}" class="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold px-2 py-1 rounded-lg">Editar</button>
        </div>
        ${s.notes ? `<div class="text-[11px] italic text-slate-500 dark:text-slate-400 mt-1">${s.notes}</div>` : ''}
      </div>
    `;
  };

  return `
    <div class="p-4 pb-28">
      ${section('Gastos fijos', fixed.length === 0 ? empty('Sin servicios fijos') : fixed.map(renderService).join(''))}
      ${section('Suscripciones / digitales', subs.length === 0 ? empty('Sin suscripciones') : subs.map(renderService).join(''))}
    </div>
  `;
}
