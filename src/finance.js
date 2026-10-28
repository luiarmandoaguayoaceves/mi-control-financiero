// ============================================================
// Lógica financiera PURA (sin DOM, sin localStorage): testeable en Node.
// Principio central: "Saldo bancario NO es igual a dinero libre".
// ============================================================
import { addDaysISO, addMonths, round2, toISODate, toMonthKey, now as nowFn } from './format.js';

export { round2 as roundMoney };

// ---------- Ciclo de corte de tarjeta ----------

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Fecha ISO del siguiente día de corte (hoy o futuro). */
export function nextCutDate(cutDay, now = nowFn()) {
  const day = Math.min(Math.max(cutDay, 1), 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (candidate.getTime() <= now.getTime()) {
    return toISODate(addMonths(candidate, 1));
  }
  return toISODate(candidate);
}

/**
 * Fecha límite de pago. Si la tarjeta define `paymentDueDay` (día del mes en
 * que vence el pago), se toma la primera ocurrencia DESPUÉS del próximo corte
 * (Nu y Mercado Pago tienen fechas propias). Sin dato, se conserva la regla
 * vieja (día 1 del mes siguiente al corte, patrón BBVA Azul).
 */
export function nextDueDate(cutDay, paymentDueDay = null, now = nowFn()) {
  const cut = parseDate(nextCutDate(cutDay, now));
  const day = Number(paymentDueDay);
  if (!Number.isFinite(day) || day < 1 || day > 28) {
    return toISODate(new Date(cut.getFullYear(), cut.getMonth() + 1, 1));
  }
  let due = new Date(cut.getFullYear(), cut.getMonth(), day);
  if (due.getTime() <= cut.getTime()) due = new Date(cut.getFullYear(), cut.getMonth() + 1, day);
  return toISODate(due);
}

/** Fechas y conteos de una tarjeta; null en lo que no esté configurado. */
export function cardDates(card, now = nowFn()) {
  if (!card || !card.cutDay) {
    return { cutDate: null, dueDate: null, daysToCut: null, daysToDue: null, cycle: null };
  }
  const cycle = currentCycleRange(card.cutDay, now);
  const dueDate = nextDueDate(card.cutDay, card.paymentDueDay, now);
  return {
    cutDate: cycle.end,
    dueDate,
    daysToCut: daysUntilISO(cycle.end, now),
    daysToDue: daysUntilISO(dueDate, now),
    cycle,
  };
}

/**
 * Resumen de una tarjeta: fechas del corte, compras de contado del ciclo,
 * MSI que le pertenecen y el pago proyectado de su corte. Los MSI viejos sin
 * cardId se asignan a la primera tarjeta.
 */
export function cardSummary(data, card, now = nowFn()) {
  const firstCardId = data.creditCards[0]?.id;
  const creditIds = data.accounts
    .filter((a) => a.type === 'credit' && (a.cardId === card.id || a.id === card.accountId))
    .map((a) => a.id);
  const dates = cardDates(card, now);
  const compras = dates.cycle ? tdcBackingNeeded(data.transactions, creditIds, dates.cycle) : 0;
  const msi = data.installmentPurchases.filter(
    (i) => i.active && i.pendingBalance > 0 && (i.cardId || firstCardId) === card.id,
  );
  const msiMes = msiMonthlyTotal(msi);
  return { dates, compras, msi, msiMes, creditIds, pago: nextTdcPayment(compras, msiMes) };
}

/** Ciclo actual de la tarjeta: [último corte, próximo corte). */
export function currentCycleRange(cutDay, now = nowFn()) {
  const nextCut = parseDate(nextCutDate(cutDay, now));
  const start = addMonths(nextCut, -1);
  return { start: toISODate(start), end: toISODate(nextCut) };
}

/** Días hasta una fecha (para alertas de corte/límite). */
export function daysUntilISO(iso, now = nowFn()) {
  const target = parseDate(iso);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target.getTime() - a) / 86400000);
}

export function addDays(iso, days) {
  return addDaysISO(iso, days);
}

// ---------- Cuentas y apartados ----------

export function sumAccountBalances(accounts, types) {
  return round2(
    accounts
      .filter((a) => a.active && types.includes(a.type))
      .reduce((acc, a) => acc + (Number.isFinite(a.balance) ? a.balance : 0), 0),
  );
}

/** Saldo disponible = cuentas débito + efectivo + ahorro. */
export function availableBalance(accounts) {
  return sumAccountBalances(accounts, ['debit', 'cash', 'savings']);
}

export function totalFunds(funds) {
  return round2(funds.filter((f) => f.active).reduce((acc, f) => acc + f.currentAmount, 0));
}

export function protectedFundsTotal(funds) {
  return round2(
    funds.filter((f) => f.active && f.protected).reduce((acc, f) => acc + f.currentAmount, 0),
  );
}

// ---------- Respaldo de TDC ----------

/**
 * Monto a pagar en el corte por compras de contado: compras TDC del ciclo
 * actual posteriores al último pago. Las compras a MSI NO entran aquí: de
 * ellas solo se paga la mensualidad (ver msiMonthlyTotal), nunca el total
 * en la fecha de corte.
 */
export function tdcBackingNeeded(transactions, creditAccountIds, cycle) {
  const credit = new Set(creditAccountIds);
  let lastPayment = cycle.start;
  for (const t of transactions) {
    if (!credit.has(t.accountId)) continue;
    if (t.type === 'creditPayment' && t.date >= cycle.start) {
      if (t.date > lastPayment) lastPayment = t.date;
    }
  }
  let purchases = 0;
  for (const t of transactions) {
    if (!credit.has(t.accountId)) continue;
    if (t.type !== 'expense' || !t.isCreditCardPurchase) continue;
    if (t.isMsi) continue; // a meses: se paga la mensualidad, no el total en el corte
    if (t.date < cycle.start || t.date >= cycle.end) continue;
    if (t.date <= lastPayment) continue; // ya cubierto por un pago posterior
    purchases += t.amount;
  }
  return round2(Math.max(0, purchases));
}

// ---------- MSI ----------

export function msiMonthlyTotal(installments) {
  return round2(
    installments
      .filter((i) => i.active && i.pendingBalance > 0)
      .reduce((acc, i) => acc + i.monthlyPayment, 0),
  );
}

export function msiPendingTotal(installments) {
  return round2(installments.filter((i) => i.active).reduce((acc, i) => acc + i.pendingBalance, 0));
}

export function msiCount(installments) {
  return installments.filter((i) => i.active && i.pendingBalance > 0).length;
}

/** Pago proyectado del próximo corte: compras del ciclo sin respaldar + MSI del mes. */
export function nextTdcPayment(purchasesBacking, msiMonthly) {
  return round2(purchasesBacking + msiMonthly);
}

/** Porcentaje del ingreso mensual comprometido por MSI (null si no hay ingreso). */
export function msiIncomeRatio(msiMonthly, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  return round2((msiMonthly / monthlyIncome) * 100);
}

/**
 * Construye el registro de una compra MSI desde el formulario.
 * La única entrada del usuario es cuántas mensualidades ya cubrió:
 * el pago siguiente (currentPaymentNumber) y el saldo pendiente
 * (= mensualidad × meses restantes) se derivan solos.
 */
export function createInstallment({ description = '', monthlyPayment = 0, totalMonths = 1, paidCount = 0, interestRate = 0 } = {}) {
  const M = Math.max(1, Math.round(Number(totalMonths) || 1));
  const p = Math.min(Math.max(0, Math.round(Number(paidCount) || 0)), M);
  const active = p < M;
  return {
    description: String(description).trim(),
    monthlyPayment: round2(Number(monthlyPayment) || 0),
    totalMonths: M,
    currentPaymentNumber: active ? p + 1 : M,
    pendingBalance: round2(monthlyPayment * (M - p)),
    interestRate: Number(interestRate) || 0,
    active,
  };
}

/** Registra el pago de una mensualidad: avanza el pago y descuenta del pendiente. */
export function advanceInstallmentPayment(item) {
  if (!item || !item.active || item.pendingBalance <= 0) return { ...item };
  const isLast = item.currentPaymentNumber >= item.totalMonths;
  if (isLast) {
    return { ...item, active: false, pendingBalance: 0, currentPaymentNumber: item.totalMonths };
  }
  return {
    ...item,
    currentPaymentNumber: item.currentPaymentNumber + 1,
    pendingBalance: round2(Math.max(0, item.pendingBalance - item.monthlyPayment)),
  };
}

// ---------- Dinero libre ----------

/**
 * Dinero libre real = saldo disponible - apartados - respaldo TDC - esenciales pendientes.
 * Puede ser negativo: significa que los compromisos superan el saldo.
 */
export function freeMoney(saldo, totalApartados, tdcBacking, esencialesPendientes) {
  return round2(saldo - totalApartados - tdcBacking - esencialesPendientes);
}

// ---------- Gastos esenciales ----------

export function essentialMonthlyFromServices(services) {
  return round2(
    services
      .filter((s) => s.active && s.expectedMonthlyAmount > 0)
      .reduce((acc, s) => acc + s.expectedMonthlyAmount, 0),
  );
}

/** Servicios con dueDay futuro en el mes actual no cubiertos por gastos ya registrados. */
export function essentialPending(services, transactions, now = nowFn()) {
  const monthKey = toMonthKey(now);
  const today = now.getDate();
  const spentByCat = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense' || toMonthKey(parseDate(t.date)) !== monthKey) continue;
    spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) || 0) + t.amount);
  }
  let total = 0;
  for (const s of services) {
    if (!s.active || !s.dueDay || s.dueDay < today) continue;
    const spent = spentByCat.get(s.categoryId) || 0;
    total += Math.max(0, s.expectedMonthlyAmount - spent);
  }
  return round2(total);
}

// ---------- Fondo de emergencia ----------

export function emergencyCoverageMonths(fundAmount, essentialMonthly) {
  if (essentialMonthly <= 0) return null;
  return round2(fundAmount / essentialMonthly);
}

// ---------- Presupuesto ----------

/** verde < 75%, amarillo 75-100%, rojo > 100% */
export function budgetStatus(planned, actual) {
  const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? Infinity : 0;
  const level = pct > 100 ? 'rojo' : pct >= 75 ? 'amarillo' : 'verde';
  return { pct: round2(pct), level };
}

// ---------- Gasto / ingreso mensual ----------

export function monthSpent(transactions, monthKey) {
  return round2(
    transactions
      .filter((t) => t.type === 'expense' && toMonthKey(parseDate(t.date)) === monthKey)
      .reduce((acc, t) => acc + t.amount, 0),
  );
}

export function monthIncome(transactions, monthKey) {
  return round2(
    transactions
      .filter((t) => t.type === 'income' && toMonthKey(parseDate(t.date)) === monthKey)
      .reduce((acc, t) => acc + t.amount, 0),
  );
}

/** Gasto por categoría en un mes (excluye transferencias y pagos TDC). */
export function spentByCategory(transactions, monthKey) {
  const map = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense' || toMonthKey(parseDate(t.date)) !== monthKey) continue;
    map.set(t.categoryId, round2((map.get(t.categoryId) || 0) + t.amount));
  }
  return map;
}

export function spentByGroup(transactions, monthKey, categories) {
  const byCat = spentByCategory(transactions, monthKey);
  const catGroup = new Map(categories.map((c) => [c.id, c.group]));
  const map = new Map();
  for (const [catId, amount] of byCat) {
    const group = catGroup.get(catId) || 'Otros';
    map.set(group, round2((map.get(group) || 0) + amount));
  }
  return map;
}

// ---------- Patrimonio ----------

/** Patrimonio neto = activos - pasivos - deuda tarjetas - MSI pendiente. */
export function netWorth(assets, liabilities, creditCardDebt, installmentDebt) {
  return round2(assets - liabilities - creditCardDebt - installmentDebt);
}

export function totalCardDebt(cards) {
  return round2(cards.filter((c) => c.active).reduce((acc, c) => acc + c.currentBalance, 0));
}

// ---------- Snapshot financiero ----------

export function buildSnapshot(inputs) {
  return {
    date: inputs.date,
    cashAndAccounts: round2(inputs.cashAndAccounts),
    protectedFunds: round2(inputs.protectedFunds),
    creditCardDebt: round2(inputs.creditCardDebt),
    installmentDebt: round2(inputs.installmentDebt),
    assets: round2(inputs.assets),
    liabilities: round2(inputs.liabilities),
    netWorth: netWorth(
      inputs.assets,
      inputs.liabilities,
      inputs.creditCardDebt,
      inputs.installmentDebt,
    ),
  };
}
