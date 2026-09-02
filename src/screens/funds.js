// Pantalla Apartados: ver, ingresar/retirar, editar meta.
import { store, state } from './appState.js';
import { section, progress, badge, empty } from '../ui.js';
import { money } from '../format.js';
import { totalFunds, protectedFundsTotal } from '../finance.js';

export function renderFunds() {
  const data = store.data;
  const funds = data.funds.filter((f) => f.active);
  const total = totalFunds(data.funds);
  const protegido = protectedFundsTotal(data.funds);

  return `
    <div class="p-4 pb-10">
      ${section('Total en apartados', `
        <div class="flex justify-between items-baseline">
          <span class="text-3xl font-extrabold text-slate-900 dark:text-slate-50">${money(total)}</span>
          <span class="text-xs font-semibold text-sky-600 dark:text-sky-400">${money(protegido)} protegidos</span>
        </div>
      `)}

      ${funds.map((f) => {
        const pct = f.targetAmount ? (f.currentAmount / f.targetAmount) * 100 : null;
        return section(f.name, `
          <div class="flex justify-between items-baseline">
            <span class="text-lg font-bold text-slate-900 dark:text-slate-100">${money(f.currentAmount)}</span>
            ${f.targetAmount ? `<span class="text-xs text-slate-500 dark:text-slate-400">meta ${money(f.targetAmount)}</span>` : ''}
          </div>
          ${pct !== null ? `<div class="mt-2">${progress(pct, 'bg-indigo-500')}</div>` : ''}
          ${f.purpose ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${f.purpose}</div>` : ''}
          <div class="flex gap-2 mt-3">
            <button data-action="fund-move" data-id="${f.id}" data-op="deposit" class="flex-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-sm rounded-xl py-2 active:scale-[0.98]">Ingresar</button>
            <button data-action="fund-move" data-id="${f.id}" data-op="withdraw" class="flex-1 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-bold text-sm rounded-xl py-2 active:scale-[0.98]">Retirar</button>
            <button data-action="fund-edit" data-id="${f.id}" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-sm rounded-xl py-2 active:scale-[0.98]">Meta</button>
          </div>
        `, f.protected ? badge('Protegido', 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400') : '');
      }).join('')}
    </div>
  `;
}
