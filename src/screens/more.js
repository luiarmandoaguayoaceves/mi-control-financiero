// Menú "Más": acceso a las pantallas secundarias.
import { state } from './appState.js';

const ITEMS = [
  { view: 'budget', label: 'Presupuesto', emoji: '🎯', desc: 'Semáforo por categoría' },
  { view: 'services', label: 'Servicios', emoji: '🧾', desc: 'Gastos fijos y suscripciones' },
  { view: 'goals', label: 'Metas', emoji: '🎓', desc: 'Emergencia, provisiones, inversión' },
  { view: 'assets', label: 'Patrimonio', emoji: '📈', desc: 'Activos, pasivos y evolución' },
  { view: 'reports', label: 'Reportes', emoji: '📊', desc: 'Resumen mensual y gráficas' },
  { view: 'settings', label: 'Configuración', emoji: '⚙️', desc: 'Cuentas, categorías, exportar' },
];

export function renderMore() {
  return `
    <div class="p-4 pb-10">
      ${ITEMS.map((item) => `
        <button data-action="goto" data-payload="${item.view}"
          class="w-full flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-3 text-left active:scale-[0.99] active:bg-slate-50 dark:active:bg-slate-800/50">
          <span class="text-2xl">${item.emoji}</span>
          <span class="flex-1">
            <span class="block font-bold text-sm text-slate-900 dark:text-slate-100">${item.label}</span>
            <span class="block text-[11px] text-slate-500 dark:text-slate-400">${item.desc}</span>
          </span>
          <span class="text-slate-400 dark:text-slate-500 text-xl">›</span>
        </button>
      `).join('')}
    </div>
  `;
}
