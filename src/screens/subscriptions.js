// Pestaña "Más" → Suscripciones: pagos recurrentes que se registran solos.
// Cada suscripción guarda día de cobro, monto y de dónde se cobra (cuenta o
// TDC). El motor de cobros vive en store.js (chargeRecurring / runRecurringCharges).
import { store } from './appState.js';
import { section, empty, badge, switchRow } from '../ui.js';
import { money, formatDateShort } from '../format.js';

function fuente(sub, data) {
  if (sub.cardId) {
    const card = data.creditCards.find((c) => c.id === sub.cardId);
    if (card) return card.name;
  }
  const acc = data.accounts.find((a) => a.id === sub.accountId);
  return acc?.name || 'sin cuenta';
}

export function renderSubscriptions() {
  const data = store.data;
  const subs = (data.subscriptions || []).slice().sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return String(a.nextChargeDate || '').localeCompare(String(b.nextChargeDate || ''));
  });
  const activas = subs.filter((s) => s.active);
  const totalMes = activas.reduce((acc, s) => acc + (s.amount || 0), 0);
  const proxima = activas.filter((s) => s.nextChargeDate).sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate))[0];

  return `
    <div class="p-4 pb-10">
      ${section('Suscripciones y pagos recurrentes', `
        <div class="flex justify-between items-baseline">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-slate-50">${money(totalMes)}</span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">${activas.length} activas</span>
        </div>
        <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">al mes</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          ${proxima
            ? `Próximo cobro: <b>${proxima.name}</b> el ${formatDateShort(proxima.nextChargeDate)} · ${money(proxima.amount)}`
            : 'Sin cobros programados'}
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Se registran solos como gasto cuando abres la app en la fecha de cobro (o después).
        </div>
      `, `<button data-action="sub-add" class="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95">+ Nueva</button>`)}

      ${subs.length === 0
        ? empty('Aún no tienes suscripciones', 'Toca «+ Nueva» para agregar Netflix, Spotify, renta o cualquier pago recurrente')
        : subs.map((s) => `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 mb-3">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">${s.name}</span>
                  ${s.active ? '' : badge('Pausada', 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Día ${s.dayOfMonth} · ${fuente(s, data)} · ${s.categoryId ? (data.categories.find((c) => c.id === s.categoryId)?.name || '') : ''}
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="font-bold text-sm text-slate-900 dark:text-slate-100">${money(s.amount)}</div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400">
                  ${s.active ? (s.nextChargeDate ? `cobra ${formatDateShort(s.nextChargeDate)}` : 'sin fecha') : 'en pausa'}
                </div>
              </div>
            </div>
            ${switchRow({
              label: s.active ? 'Activa' : 'Pausada',
              sub: s.active ? 'Se cobra automáticamente cada mes' : 'No se hacen cobros',
              action: 'sub-toggle',
              on: s.active,
              payload: s.id,
            })}
            <div class="flex gap-2 mt-2">
              <button data-action="sub-edit" data-id="${s.id}" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl py-2 active:scale-[0.98]">Editar</button>
              <button data-action="sub-delete" data-id="${s.id}" class="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl px-4 active:scale-[0.98]">Borrar</button>
            </div>
          </div>
        `).join('')}

      ${section('Cómo funciona', `
        <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          • Cada suscripción tiene un día de cobro (1–28) y se registra como gasto en la cuenta o
          tarjeta que elijas.<br/>
          • Si abres la app varios días después, recupera los cobros pendientes de los meses que
          pasaron (sin duplicar los ya registrados).<br/>
          • Pausar una suscripción detiene los cobros sin borrar el historial.
        </div>
      `)}
    </div>
  `;
}
