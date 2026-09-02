// Pantalla Metas: progreso, prioridad, edición.
import { store } from './appState.js';
import { section, progress, empty } from '../ui.js';
import { money } from '../format.js';

const PRIORITY_CLS = {
  alta: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  baja: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export function renderGoals() {
  const data = store.data;
  const goals = data.goals.filter((g) => g.active);

  return `
    <div class="p-4 pb-28">
      ${section('Metas y provisiones', goals.length === 0
        ? empty('Sin metas activas')
        : goals.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            return `
              <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm text-slate-900 dark:text-slate-100">${g.name}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 capitalize">${g.type} · prioridad ${g.priority}${g.deadline ? ` · para ${g.deadline}` : ''}</div>
                  </div>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${PRIORITY_CLS[g.priority] || PRIORITY_CLS.baja}">${g.priority}</span>
                </div>
                <div class="flex items-baseline gap-2 mt-2">
                  <span class="text-lg font-bold text-slate-900 dark:text-slate-100">${money(g.currentAmount)}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">de ${money(g.targetAmount)}</span>
                </div>
                <div class="mt-1">${progress(pct, 'bg-indigo-500')}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">${pct.toFixed(0)}% completado</div>
                ${g.notes ? `<div class="text-[11px] italic text-slate-500 dark:text-slate-400 mt-1">${g.notes}</div>` : ''}
                <button data-action="goal-edit" data-id="${g.id}" class="w-full mt-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-xl py-2 active:scale-[0.98]">Actualizar</button>
              </div>
            `;
          }).join(''))}
    </div>
  `;
}
