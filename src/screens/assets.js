// Pantalla Patrimonio: activos, pasivos, patrimonio neto y evolución.
import { store, state } from './appState.js';
import { section, barChart, empty } from '../ui.js';
import { money, formatMonthKeyShort, toMonthKey } from '../format.js';
import { netWorth, totalCardDebt, msiPendingTotal } from '../finance.js';

export function renderAssets() {
  const data = store.data;
  const totalAssets = data.assets.reduce((a, x) => a + x.estimatedValue, 0);
  const totalLiabilities = data.liabilities.reduce((a, x) => a + x.outstandingBalance, 0);
  const cardDebt = totalCardDebt(data.creditCards);
  const instDebt = msiPendingTotal(data.installmentPurchases);
  const net = netWorth(totalAssets, totalLiabilities, cardDebt, instDebt);

  const evolution = data.snapshots
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      label: formatMonthKeyShort(toMonthKey(new Date(s.date + 'T00:00:00'))),
      value: s.netWorth,
    }));

  const renderItem = (kind, item) => `
    <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 py-2 last:border-0">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm text-slate-900 dark:text-slate-100">${item.name}</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${item.type}${item.notes ? ` · ${item.notes}` : ''}</div>
      </div>
      <span class="font-bold text-sm ${kind === 'asset' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${money(kind === 'asset' ? item.estimatedValue : item.outstandingBalance)}</span>
      <button data-action="asset-edit" data-kind="${kind}" data-id="${item.id}" class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] px-2 py-1 rounded-lg">Editar</button>
      <button data-action="asset-delete" data-kind="${kind}" data-id="${item.id}" class="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-[11px] px-2 py-1 rounded-lg">Borrar</button>
    </div>
  `;

  return `
    <div class="p-4 pb-28">
      ${section('Patrimonio neto', `
        <div class="text-3xl font-extrabold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${money(net)}</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Activos ${money(totalAssets)} − Pasivos ${money(totalLiabilities)} − TDC ${money(cardDebt)} − MSI ${money(instDebt)}
        </div>
      `)}

      ${section('Activos', data.assets.length === 0 ? empty('Sin activos registrados') : data.assets.map((a) => renderItem('asset', a)).join(''),
        `<button data-action="asset-add" data-kind="asset" class="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg">+ Agregar</button>`)}
      ${section('Pasivos', data.liabilities.length === 0 ? empty('Sin pasivos registrados') : data.liabilities.map((l) => renderItem('liability', l)).join(''),
        `<button data-action="asset-add" data-kind="liability" class="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg">+ Agregar</button>`)}
      ${section('Evolución del patrimonio', evolution.length === 0 ? empty('Aún no hay histórico') : barChart(evolution, money))}
    </div>
  `;
}
