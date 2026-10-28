// Pestaña "Más" → Tarjetas de crédito: alta, edición y baja de TDC con sus
// fechas de corte y de límite de pago.
import { store } from './appState.js';
import { section, empty, badge } from '../ui.js';
import { money, money0, formatDateShort } from '../format.js';
import { cardDates } from '../finance.js';

export function renderCards() {
  const data = store.data;
  const cards = data.creditCards;

  const totalDeuda = cards.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
  const sinFecha = cards.filter((c) => !c.cutDay);

  return `
    <div class="p-4 pb-10">
      ${section('Tarjetas de crédito', `
        <div class="flex justify-between items-baseline">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-slate-50">${money(totalDeuda)}</span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">${cards.length} tarjetas</span>
        </div>
        <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">deuda total</div>
        ${sinFecha.length ? `<div class="text-[11px] text-amber-600 dark:text-amber-400 mt-2">${sinFecha.length} sin fecha de corte: complétala para tener recordatorios y pago del corte.</div>` : ''}
      `, `<button data-action="card-add" class="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">+ Nueva</button>`)}

      ${cards.map((c) => {
        const dates = cardDates(c);
        return section(c.name, `
          <div class="flex justify-between items-center gap-2">
            <span class="text-xs text-slate-500 dark:text-slate-400 truncate">${c.bank || 'Tarjeta de crédito'}</span>
            ${c.cutDay ? badge(`Corte ${c.cutDay}`, 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400') : badge('Sin corte', 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400')}
          </div>
          <div class="flex justify-between items-baseline mt-2">
            <span class="text-lg font-bold text-slate-900 dark:text-slate-100">${money(c.currentBalance)}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">Línea ${money0(c.creditLimit)}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Corte</div>
              <div class="text-xs font-bold text-slate-900 dark:text-slate-100">${dates.cutDate ? formatDateShort(dates.cutDate) : 'sin configurar'}</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Límite de pago</div>
              <div class="text-xs font-bold text-slate-900 dark:text-slate-100">${dates.dueDate ? formatDateShort(dates.dueDate) : 'día 1 del mes siguiente'}</div>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button data-action="card-edit" data-id="${c.id}" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl py-2.5 active:scale-[0.98]">Editar</button>
            ${cards.length > 1 ? `<button data-action="card-delete" data-id="${c.id}" class="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl px-4 active:scale-[0.98]">Borrar</button>` : ''}
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">El saldo lo mueven los movimientos; no se escribe a mano.</div>
        `);
      }).join('')}

      ${cards.length === 0 ? empty('Sin tarjetas', 'Agrega tu primera tarjeta con “+ Nueva”') : ''}
    </div>
  `;
}
