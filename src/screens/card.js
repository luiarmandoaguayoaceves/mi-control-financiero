// Pantalla Tarjeta: resumen TDC, proyección de pago y compras MSI.
import { store } from './appState.js';
import { section, kpi, kpiGrid, progress, alert, empty } from '../ui.js';
import { money, money0 } from '../format.js';
import {
  currentCycleRange,
  daysUntilISO,
  msiCount,
  msiIncomeRatio,
  msiMonthlyTotal,
  msiPendingTotal,
  nextDueDate,
  nextTdcPayment,
  tdcBackingNeeded,
} from '../finance.js';

export function renderCard() {
  const data = store.data;
  const card = data.creditCards.find((c) => c.active) || data.creditCards[0];
  if (!card) return empty('No hay tarjeta registrada', 'Agrégala en Configuración');

  const creditIds = data.accounts.filter((a) => a.type === 'credit').map((a) => a.id);
  const ciclo = currentCycleRange(card.cutDay);
  const respaldo = tdcBackingNeeded(data.transactions, creditIds, ciclo);
  const msiMes = msiMonthlyTotal(data.installmentPurchases);
  const ratio = msiIncomeRatio(msiMes, data.settings.monthlyIncome);
  const pago = nextTdcPayment(respaldo, msiMes);
  const diasCorte = daysUntilISO(ciclo.end);
  const diasLimite = daysUntilISO(nextDueDate(card.cutDay));
  const msi = data.installmentPurchases.filter((i) => i.active && i.pendingBalance > 0);
  const usoPct = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;

  return `
    <div class="p-4 pb-28">
      ${section(card.name, `
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-500 dark:text-slate-400">${card.bank} · •••• Azul</span>
          <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">${card.points} pts</span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 dark:text-slate-50">${money(card.currentBalance)}</div>
        <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">saldo utilizado</div>
        ${progress(usoPct, usoPct > 80 ? 'bg-red-500' : 'bg-indigo-500')}
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Línea: ${money0(card.creditLimit)} · Disponible: ${money0(card.availableCredit)}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Corte: día ${card.cutDay} (${diasCorte >= 0 ? `en ${diasCorte} días` : 'este mes'}) · Límite de pago: ${diasLimite >= 0 ? `en ${diasLimite} días` : '—'}</div>
        ${card.notes ? `<div class="text-[11px] italic text-slate-500 dark:text-slate-400 mt-2">${card.notes}</div>` : ''}
      `)}

      <div class="mt-4">
        ${kpiGrid([
          kpi('Pago proyectado', money(pago), { color: 'indigo', sub: 'Próximo corte (dinámico)' }),
          kpi('Compras sin respaldar', money(respaldo), { color: respaldo > 0 ? 'amber' : 'emerald', sub: 'Deben cubrirse con efectivo' }),
          kpi('MSI mensuales', money(msiMes), { sub: `${msiCount(data.installmentPurchases)} compras activas` }),
          kpi('Saldo MSI pendiente', money(msiPendingTotal(data.installmentPurchases)), { color: 'slate', sub: 'No es el pago del corte' }),
        ])}
      </div>

      <div class="flex flex-col gap-2 mt-4">
        ${ratio !== null && ratio > 20
          ? alert(`Las mensualidades MSI comprometen ${ratio}% de tu ingreso mensual estimado.`, 'warning')
          : ratio !== null
            ? alert(`MSI = ${ratio}% del ingreso mensual estimado`, 'info')
            : ''}
        ${alert('El saldo total NO es el pago requerido: parte pertenece a MSI futuros.', 'info')}
      </div>

      <div class="mt-4">
        ${section(`Compras a MSI (${msi.length})`, msi.length === 0
          ? empty('Sin compras MSI activas')
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
                </div>
              `;
            }).join(''))}
      </div>
    </div>
  `;
}
