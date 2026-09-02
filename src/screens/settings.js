// Pantalla Configuración: exportar/importar, cuentas, tarjeta, categorías.
import { store, state } from './appState.js';
import { section, empty } from '../ui.js';
import { money } from '../format.js';

export function renderSettings() {
  const data = store.data;
  const card = data.creditCards.find((c) => c.active) || data.creditCards[0];

  return `
    <div class="p-4 pb-24">
      ${section('Datos', `
        <button data-action="install-app" class="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98] mb-2">Instalar la app en este dispositivo</button>
        <button data-action="export-json" class="w-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl py-3 active:scale-[0.98] mb-2">Exportar respaldo JSON</button>
        <button data-action="import-json" class="w-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl py-3 active:scale-[0.98] mb-2">Importar respaldo JSON</button>
        <button data-action="edit-income" class="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl py-3 active:scale-[0.98] mb-1">
          Ingreso mensual estimado: ${data.settings.monthlyIncome ? money(data.settings.monthlyIncome) : 'no definido'}
        </button>
        <div class="text-[11px] text-slate-500 dark:text-slate-400">El ingreso estimado solo se usa para % de MSI y tasa de ahorro.</div>
      `)}

      ${section('Cuentas', data.accounts.map((a) => `
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 py-2 last:border-0">
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-slate-900 dark:text-slate-100">${a.name}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 capitalize">${a.type} · ${a.institution || '—'}</div>
          </div>
          <span class="font-bold text-sm text-slate-900 dark:text-slate-100">${money(a.balance)}</span>
          <button data-action="account-edit" data-id="${a.id}" class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] px-2 py-1 rounded-lg">Editar</button>
        </div>
      `).join(''))}

      ${card ? section('Tarjeta de crédito', `
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-slate-900 dark:text-slate-100">${card.name}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">Corte día ${card.cutDay} · Línea ${money(card.creditLimit)} · ${card.points} pts</div>
          </div>
          <button data-action="card-edit" class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] px-2 py-1 rounded-lg">Editar</button>
        </div>
      `) : ''}

      ${section('Categorías', data.categories.map((c) => `
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 py-2 last:border-0">
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm ${c.active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'}">${c.name}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${c.group}</div>
          </div>
          <button data-action="category-toggle" data-id="${c.id}" role="switch" aria-checked="${c.active}"
            class="w-11 h-6 rounded-full p-0.5 transition ${c.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
            <span class="block w-5 h-5 bg-white rounded-full transition ${c.active ? 'ml-auto' : ''}"></span>
          </button>
        </div>
      `).join(''))}

      ${section('Zona de riesgo', `
        <button data-action="reset-data" class="w-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-xl py-3 active:scale-[0.98]">Borrar todos mis datos</button>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Borra TODO y deja la app en vacío (solo categorías). Exporta un respaldo antes.</div>
      `)}

      ${section('Seguridad', `
        <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          • Nunca se almacenan contraseñas, NIP, CVV o tokens bancarios.<br/>
          • No se piden números completos de tarjeta (solo los últimos 4).<br/>
          • Todos tus datos viven localmente en tu teléfono (v1).<br/>
          • Modo oscuro: sigue la configuración del sistema (toggle en el encabezado).
        </div>
      `)}
    </div>
  `;
}
