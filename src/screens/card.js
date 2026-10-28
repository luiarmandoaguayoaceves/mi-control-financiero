// Pantalla Tarjeta: resumen por tarjeta (corte, límite de pago), pago
// proyectado del corte y compras a MSI.
import { store, state } from './appState.js';
import { section, kpi, kpiGrid, progress, alert, empty, chip, chipRow } from '../ui.js';
import { money, money0, formatDateShort } from '../format.js';
import { cardSummary, msiCount, msiIncomeRatio, msiPendingTotal } from '../finance.js';

function fechaConDias(iso, dias) {
  if (!iso) return 'sin configurar';
  const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  return `${formatDateShort(iso)} · ${cuando}`;
}

export function renderCard() {
  const data = store.data;
  const cards = data.creditCards.filter((c) => c.active);
  if (!cards.length) {
    return `<div class="p-4 pb-10">${empty('Sin tarjetas registradas', 'Agrega una en Configuración → Tarjetas de crédito')}</div>`;
  }
  const card = cards.find((c) => c.id === state.cardId) || cards[0];
  const summary = cardSummary(data, card);
  const dates = summary.dates;
  const respaldo = summary.compras;
  const msi = summary.msi;
  const msiMes = summary.msiMes;
  const ratio = msiIncomeRatio(msiMes, data.settings.monthlyIncome);
  const pago = summary.pago;
  const usoPct = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;

  const selector = cards.length > 1
    ? `<div class="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
        ${cards.map((c) => chip(c.name, { selected: c.id === card.id, action: 'card-select', payload: c.id })).join('')}
      </div>`
    : '';

  return `
    <div class="p-4 pb-10">
      ${selector}

      ${section(card.name, `
        <div class="flex justify-between items-center gap-2">
          <span class="text-xs text-slate-500 dark:text-slate-400 truncate">${card.bank || 'Tarjeta de crédito'}</span>
          <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">${card.points || 0} pts</span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-50">${money(card.currentBalance)}</div>
        <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">saldo utilizado</div>
        ${progress(usoPct, usoPct > 80 ? 'bg-red-500' : 'bg-indigo-500')}
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Línea: ${money0(card.creditLimit)} · Disponible: ${money0(card.availableCredit)}</div>
        ${dates.cycle ? `
          <div class="grid grid-cols-2 gap-2 mt-3">
            <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Fecha de corte</div>
              <div class="text-sm font-bold text-slate-900 dark:text-slate-100">${fechaConDias(dates.cutDate, dates.daysToCut)}</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Límite de pago</div>
              <div class="text-sm font-bold text-slate-900 dark:text-slate-100">${fechaConDias(dates.dueDate, dates.daysToDue)}</div>
            </div>
          </div>
        ` : alert('Esta tarjeta aún no tiene día de corte ni límite de pago. Toca “Editar” para ponerlos y activar los recordatorios.', 'info')}
        <div class="flex gap-2 mt-3">
          <button data-action="card-edit" data-id="${card.id}" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl active:scale-[0.98]">Editar tarjeta</button>
          <button data-action="card-add" class="flex-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold py-2.5 rounded-xl active:scale-[0.98]">+ Agregar tarjeta</button>
        </div>
      `)}

      <div class="mt-4">
        ${kpiGrid([
          kpi('Pago del corte', money(pago), { color: 'indigo', sub: dates.cutDate ? `Corte ${formatDateShort(dates.cutDate)}` : 'Configura el corte' }),
          kpi('Compras del ciclo', money(respaldo), { color: 'amber', sub: 'De contado (sin MSI)' }),
          kpi('MSI mensuales', money(msiMes), { sub: `${msiCount(msi)} compras activas` }),
          kpi('Saldo MSI pendiente', money(msiPendingTotal(msi)), { color: 'slate', sub: 'No es el pago del corte' }),
        ])}
      </div>

      <div class="flex flex-col gap-2 mt-4">
        ${ratio !== null && ratio > 20
          ? alert(`Las mensualidades MSI comprometen ${ratio}% de tu ingreso mensual estimado.`, 'warning')
          : ratio !== null
            ? alert(`MSI = ${ratio}% del ingreso mensual estimado`, 'info')
            : ''}
        ${alert('Las compras a MSI no se pagan completas en el corte: solo la mensualidad del mes.', 'info')}
      </div>

      <div class="mt-4">
        ${section(`Compras a MSI (${msi.length})`,
          msi.length === 0
            ? empty('Sin compras MSI activas', 'Registra tus productos a meses con “+ Agregar”')
            : msi.map((i) => {
              const done = (i.currentPaymentNumber / i.totalMonths) * 100;
              return `
                <div class="mb-4">
                  <div class="flex justify-between items-center gap-2">
                    <span class="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">${i.description}</span>
                    <span class="font-bold text-sm whitespace-nowrap">${money(i.monthlyPayment)}/mes</span>
                  </div>
                  <div class="mt-1">${progress(done, 'bg-indigo-500', 'h-1.5')}</div>
                  <div class="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>Pago ${i.currentPaymentNumber} de ${i.totalMonths} · ${i.interestRate === 0 ? '0% interés' : `${i.interestRate}%`}</span>
                    <span>Saldo: ${money(i.pendingBalance)}</span>
                  </div>
                  <div class="flex gap-2 mt-2">
                    <button data-action="msi-pay" data-id="${i.id}"
                      class="flex-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold py-1.5 rounded-lg active:scale-95">
                      ✓ Pagar mensualidad ${i.currentPaymentNumber}
                    </button>
                    <button data-action="msi-edit" data-id="${i.id}"
                      class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">Editar</button>
                  </div>
                </div>
              `;
            }).join(''),
          `<button data-action="msi-add" class="bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95">+ Agregar</button>`)}
      </div>
    </div>
  `;
}
