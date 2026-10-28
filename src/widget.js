// ============================================================
// Widget de la pantalla de inicio del celular (solo APK).
// Arma un resumen corto de 4 líneas y se lo pasa al plugin nativo
// HomeWidget, que lo guarda en SharedPreferences y refresca el widget.
// ============================================================
import { availableBalance, cardSummary, essentialPending, freeMoney, totalFunds } from './finance.js';
import { money, formatDateShort } from './format.js';
import { HomeWidget, isNativePlatform } from './native.js';

/** Resumen de 4 líneas para el widget (función pura, testeable). */
export function widgetSnapshot(data, now = new Date()) {
  const cards = (data?.creditCards || []).filter((c) => c.active && c.cutDay);
  const summaries = cards.map((c) => ({ card: c, ...cardSummary(data, c, now) }));
  const respaldo = summaries.reduce((acc, s) => acc + s.compras, 0);
  const msiMes = (data?.installmentPurchases || [])
    .filter((i) => i.active && i.pendingBalance > 0)
    .reduce((acc, i) => acc + i.monthlyPayment, 0);
  const saldo = availableBalance(data?.accounts || []);
  const apartados = totalFunds(data?.funds || []);
  const pendientes = essentialPending(data?.services || [], data?.transactions || [], now);
  const libre = freeMoney(saldo, apartados, respaldo, pendientes);

  const proximo = summaries.sort((a, b) => a.dates.daysToCut - b.dates.daysToCut)[0];
  const corte = proximo?.dates?.cutDate
    ? `Corte ${proximo.card.name}: ${formatDateShort(proximo.dates.cutDate)}`
    : 'Configura tu corte en la app';
  const pago = proximo?.dates?.dueDate
    ? `Pago ${formatDateShort(proximo.dates.dueDate)} · MSI ${money(msiMes)}`
    : `MSI ${money(msiMes)}/mes`;

  return {
    title: 'Mi Control Financiero',
    line1: `Saldo: ${money(saldo)}`,
    line2: `Libre: ${money(libre)}`,
    line3: corte,
    line4: pago,
    updated: `Actualizado ${formatDateShort(isoOf(now))}`,
  };
}

function isoOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Manda el resumen al widget nativo (no-op en el navegador). */
export async function updateHomeWidget(data, now = new Date()) {
  if (!isNativePlatform()) return { skipped: 'web' };
  try {
    await HomeWidget.update({ data: widgetSnapshot(data, now) });
    return { ok: true };
  } catch (e) {
    console.warn('No se pudo actualizar el widget', e);
    return { error: String(e?.message || e) };
  }
}
