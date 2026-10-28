// ============================================================
// Recordatorios de fechas de corte y de límite de pago.
// Lógica PURA (testeable en Node) + programación en el APK con el plugin
// LocalNotifications de Capacitor. En el navegador no hace nada: las
// notificaciones del sistema solo existen dentro del APK.
// ============================================================
import { formatDateShort } from './format.js';
import { LocalNotifications, isNativePlatform } from './native.js';

const HOUR = 9; // los avisos llegan a las 9:00, hora local del teléfono

function atNine(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), HOUR, 0, 0);
}

function shiftDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Fecha límite de pago que corresponde a una fecha de corte. */
export function dueDateForCut(cutDate, paymentDueDay) {
  const day = Number(paymentDueDay);
  const dueDay = Number.isFinite(day) && day >= 1 && day <= 28 ? day : 1;
  let due = new Date(cutDate.getFullYear(), cutDate.getMonth(), dueDay);
  if (due.getTime() <= cutDate.getTime()) {
    due = new Date(cutDate.getFullYear(), cutDate.getMonth() + 1, dueDay);
  }
  return due;
}

/**
 * Plan de recordatorios de los próximos `months` meses, para todas las
 * tarjetas activas con día de corte configurado:
 *  - corte: aviso 2 días antes y el mismo día
 *  - límite de pago: aviso 3 días antes y el mismo día
 * Los ids son deterministas (1..399) para poder cancelar y reprogramar sin
 * duplicar avisos.
 */
export function reminderPlan(cards = [], now = new Date(), months = 3) {
  const plan = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const active = cards.filter((c) => c.active && c.cutDay);

  active.forEach((card, cardIndex) => {
    if (cardIndex > 2) return; // ids acotados a 399
    const cutDay = Math.min(Math.max(Number(card.cutDay) || 1, 1), 28);
    for (let m = 0; m < months; m += 1) {
      const monthRef = new Date(today.getFullYear(), today.getMonth() + m, 1);
      const cut = new Date(monthRef.getFullYear(), monthRef.getMonth(), cutDay);
      const due = dueDateForCut(cut, card.paymentDueDay);
      const base = cardIndex * 100 + m * 10;

      const push = (id, kind, date, title, body) => {
        if (date < today) return;
        const at = atNine(date);
        if (at.getTime() <= now.getTime()) return;
        plan.push({ id, kind, cardId: card.id, cardName: card.name, at, title, body });
      };

      push(
        base + 1,
        'corte',
        shiftDays(cut, -2),
        `Corte en 2 días · ${card.name}`,
        `Tu corte es el ${formatDateShort(isoOf(cut))}. Revisa tus compras del ciclo.`,
      );
      push(
        base + 2,
        'corte',
        cut,
        `Corte hoy · ${card.name}`,
        `Hoy corta ${card.name}. A partir de mañana las compras van al siguiente ciclo.`,
      );
      push(
        base + 3,
        'pago',
        shiftDays(due, -3),
        `Pago en 3 días · ${card.name}`,
        `Tu límite de pago es el ${formatDateShort(isoOf(due))}. Aparta el dinero.`,
      );
      push(
        base + 4,
        'pago',
        due,
        `Pago hoy · ${card.name}`,
        `Hoy vence el pago de ${card.name}. Evita intereses.`,
      );
    }
  });

  return plan.sort((a, b) => a.at - b.at);
}

function isoOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Reprograma los recordatorios del sistema (solo APK). Cancela los avisos
 * previos con nuestros ids y vuelve a agendar los próximos 3 meses.
 * Devuelve un resumen para poder probarlo/registrarlo.
 */
export async function syncReminders(data, { now = new Date() } = {}) {
  if (!isNativePlatform()) return { skipped: 'web' };
  const plugin = LocalNotifications;

  const enabled = data?.settings?.reminders !== false;
  try {
    const pending = await plugin.getPending();
    const ours = (pending?.notifications || [])
      .filter((n) => n.id >= 1 && n.id < 400)
      .map((n) => ({ id: n.id }));
    if (ours.length) await plugin.cancel({ notifications: ours });

    if (!enabled) return { cancelled: ours.length, scheduled: 0 };

    let permission = await plugin.checkPermissions();
    if (permission?.display !== 'granted') permission = await plugin.requestPermissions();
    if (permission?.display !== 'granted') return { skipped: 'permission', cancelled: ours.length };

    const plan = reminderPlan(data?.creditCards || [], now);
    if (!plan.length) return { cancelled: ours.length, scheduled: 0 };

    await plugin.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
      })),
    });
    return { cancelled: ours.length, scheduled: plan.length };
  } catch (e) {
    console.warn('No se pudieron programar los recordatorios', e);
    return { error: String(e?.message || e) };
  }
}
