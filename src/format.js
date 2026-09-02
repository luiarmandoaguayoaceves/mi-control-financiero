// Utilidades de formato: moneda MXN, fechas es-MX, claves de mes.
// Módulo puro (sin DOM ni localStorage) para poder probarse en Node.

const nf = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/** 1234.5 -> "$1,234.50" (es-MX) */
export function money(amount) {
  const v = Number.isFinite(amount) ? amount : 0;
  return `$${nf.format(v)}`;
}

/** 1234.5 -> "$1,235" (sin decimales, para KPIs grandes) */
export function money0(amount) {
  const v = Number.isFinite(amount) ? amount : 0;
  return `$${nf0.format(v)}`;
}

/** 1234.5 -> "1,234.50" sin signo de moneda */
export function number2(n) {
  return nf.format(Number.isFinite(n) ? n : 0);
}

const pad = (n) => String(n).padStart(2, '0');

/** Date local -> 'YYYY-MM-DD' */
export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date local -> 'YYYY-MM' */
export function toMonthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Hoy local como 'YYYY-MM-DD' */
export function todayISO() {
  return toISODate(new Date());
}

export function todayMonthKey() {
  return toMonthKey(new Date());
}

/** 'YYYY-MM-DD' -> Date local (evita el desfase UTC) */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 'YYYY-MM-DD' -> '14 ago 2026' (es-MX) */
export function formatDate(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 'YYYY-MM-DD' -> 'sáb 14 ago' */
export function formatDateShort(iso) {
  const d = parseISODate(iso);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** 'YYYY-MM' -> 'ago 2026' (corto) */
export function formatMonthKeyShort(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

/** Días naturales desde hoy hasta la fecha ISO (negativo si ya pasó). */
export function daysUntil(iso, now = new Date()) {
  const target = parseISODate(iso);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = target.getTime();
  return Math.round((b - a) / 86400000);
}

/** Suma días a una fecha ISO. */
export function addDaysISO(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Suma meses a un Date (clamping de fin de mes). */
export function addMonths(d, months) {
  const res = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(d.getDate(), lastDay));
  return res;
}

/** Mes anterior/posterior: 'YYYY-MM' -> 'YYYY-MM' */
export function shiftMonthKey(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return toMonthKey(d);
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Redondea a 2 decimales evitando errores de coma flotante. */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Parsea un monto desde texto (acepta "1,234.56" y "1234.56"). Requiere > 0. */
export function parseAmount(s) {
  const clean = String(s || '').replace(/\$|,/g, '').trim();
  if (!clean) return null;
  const n = parseFloat(clean.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}

/** Parsea un monto >= 0 (el 0 es válido: presupuestos, metas, saldos).
 *  Devuelve null solo si está vacío o no es número. */
export function parseAmountOrZero(s) {
  const clean = String(s || '').replace(/\$|,/g, '').trim();
  if (clean === '') return null;
  const n = parseFloat(clean.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? round2(n) : null;
}
