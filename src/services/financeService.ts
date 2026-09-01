// ============================================================
// Lógica financiera pura (sin dependencias de RN ni de la app).
// Módulo 100% testeable en Node (solo `import type`, sin imports
// de valor) para poder ejecutarse con `node --test`.
//
// Principio central: "Saldo bancario NO es igual a dinero libre".
// ============================================================
import type {
  Account,
  AccountType,
  CreditCard,
  FinancialSnapshot,
  Fund,
  InstallmentPurchase,
  Service,
  Transaction,
} from '../models/types';
import { addDaysISO, addMonths, round2, toISODate, toMonthKey } from '../utils/format.ts';

export { round2 as roundMoney };

// ---------- Ciclo de corte de tarjeta ----------

export interface CycleRange {
  /** Inicio del ciclo actual (día de corte) YYYY-MM-DD */
  start: string;
  /** Siguiente día de corte YYYY-MM-DD (exclusivo) */
  end: string;
}

/** Fecha ISO del siguiente día de corte (hoy o futuro). */
export function nextCutDate(cutDay: number, now: Date = new Date()): string {
  const day = Math.min(Math.max(cutDay, 1), 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (candidate.getTime() <= now.getTime()) {
    return toISODate(addMonths(candidate, 1));
  }
  return toISODate(candidate);
}

/** Fecha límite de pago: día 1 del mes siguiente al corte (patrón BBVA Azul). */
export function nextDueDate(cutDay: number, now: Date = new Date()): string {
  const cut = parseDate(nextCutDate(cutDay, now));
  return toISODate(new Date(cut.getFullYear(), cut.getMonth() + 1, 1));
}

/** Ciclo actual de la tarjeta: [último corte, próximo corte). */
export function currentCycleRange(cutDay: number, now: Date = new Date()): CycleRange {
  const nextCut = parseDate(nextCutDate(cutDay, now));
  const start = addMonths(nextCut, -1);
  return { start: toISODate(start), end: toISODate(nextCut) };
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Fecha ISO del próximo día de corte después de `iso`. */
export function nextCutAfter(iso: string, cutDay: number): string {
  const d = parseDate(iso);
  const day = Math.min(Math.max(cutDay, 1), 28);
  const candidate = new Date(d.getFullYear(), d.getMonth(), day);
  if (candidate.getTime() <= d.getTime()) {
    return toISODate(addMonths(candidate, 1));
  }
  return toISODate(candidate);
}

// ---------- Cuentas y apartados ----------

export function sumAccountBalances(
  accounts: Account[],
  types: AccountType[],
): number {
  return round2(
    accounts
      .filter((a) => a.active && types.includes(a.type))
      .reduce((acc, a) => acc + (Number.isFinite(a.balance) ? a.balance : 0), 0),
  );
}

/** Saldo disponible = cuentas débito + efectivo + ahorro. */
export function availableBalance(accounts: Account[]): number {
  return sumAccountBalances(accounts, ['debit', 'cash', 'savings']);
}

export function totalFunds(funds: Fund[]): number {
  return round2(
    funds.filter((f) => f.active).reduce((acc, f) => acc + f.currentAmount, 0),
  );
}

export function protectedFundsTotal(funds: Fund[]): number {
  return round2(
    funds.filter((f) => f.active && f.protected).reduce((acc, f) => acc + f.currentAmount, 0),
  );
}

// ---------- Respaldo de TDC ----------

/**
 * Monto a respaldar con efectivo: compras TDC del ciclo actual
 * (posteriores al último pago) menos pagos TDC del ciclo.
 * Regla: cada peso gastado con TDC debe tener un peso de efectivo respaldándolo.
 */
export function tdcBackingNeeded(
  transactions: Transaction[],
  creditAccountIds: string[],
  cycle: CycleRange,
): number {
  const credit = new Set(creditAccountIds);
  let purchases = 0;
  let lastPayment = cycle.start;
  for (const t of transactions) {
    if (!credit.has(t.accountId)) continue;
    if (t.type === 'creditPayment' && t.date >= cycle.start) {
      if (t.date > lastPayment) lastPayment = t.date;
    }
  }
  for (const t of transactions) {
    if (!credit.has(t.accountId)) continue;
    if (t.type !== 'expense' || !t.isCreditCardPurchase) continue;
    if (t.date < cycle.start || t.date >= cycle.end) continue;
    if (t.date <= lastPayment) continue; // ya cubierto por un pago posterior
    purchases += t.amount;
  }
  return round2(Math.max(0, purchases));
}

// ---------- MSI ----------

export function msiMonthlyTotal(installments: InstallmentPurchase[]): number {
  return round2(
    installments
      .filter((i) => i.active && i.pendingBalance > 0)
      .reduce((acc, i) => acc + i.monthlyPayment, 0),
  );
}

export function msiPendingTotal(installments: InstallmentPurchase[]): number {
  return round2(
    installments
      .filter((i) => i.active)
      .reduce((acc, i) => acc + i.pendingBalance, 0),
  );
}

export function msiCount(installments: InstallmentPurchase[]): number {
  return installments.filter((i) => i.active && i.pendingBalance > 0).length;
}

/** Pago proyectado del próximo corte: compras del ciclo sin respaldar + MSI del mes. */
export function nextTdcPayment(purchasesBacking: number, msiMonthly: number): number {
  return round2(purchasesBacking + msiMonthly);
}

/** Porcentaje del ingreso mensual comprometido por MSI (null si no hay ingreso estimado). */
export function msiIncomeRatio(msiMonthly: number, monthlyIncome?: number): number | null {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  return round2((msiMonthly / monthlyIncome) * 100);
}

// ---------- Dinero libre ----------

/**
 * Dinero libre real = saldo disponible - apartados - respaldo TDC - esenciales pendientes.
 * Puede ser negativo: significa que los compromisos superan el saldo.
 */
export function freeMoney(
  saldo: number,
  totalApartados: number,
  tdcBacking: number,
  esencialesPendientes: number,
): number {
  return round2(saldo - totalApartados - tdcBacking - esencialesPendientes);
}

// ---------- Gastos esenciales ----------

export function essentialMonthlyFromServices(services: Service[]): number {
  return round2(
    services
      .filter((s) => s.active && s.expectedMonthlyAmount > 0)
      .reduce((acc, s) => acc + s.expectedMonthlyAmount, 0),
  );
}

/**
 * Servicios con dueDay futuro en el mes actual que aún no están cubiertos
 * por gastos ya registrados de su categoría.
 */
export function essentialPending(
  services: Service[],
  transactions: Transaction[],
  now: Date = new Date(),
): number {
  const monthKey = toMonthKey(now);
  const today = now.getDate();
  const spentByCat = new Map<string, number>();
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

export function emergencyCoverageMonths(
  fundAmount: number,
  essentialMonthly: number,
): number | null {
  if (essentialMonthly <= 0) return null;
  return round2(fundAmount / essentialMonthly);
}

// ---------- Presupuesto ----------

export interface BudgetStatus {
  /** Porcentaje usado (Infinity si no hay presupuesto y sí hay gasto) */
  pct: number;
  /** verde < 75%, amarillo 75-100%, rojo > 100% */
  level: 'verde' | 'amarillo' | 'rojo';
}

export function budgetStatus(planned: number, actual: number): BudgetStatus {
  const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? Infinity : 0;
  const level = pct > 100 ? 'rojo' : pct >= 75 ? 'amarillo' : 'verde';
  return { pct: round2(pct), level };
}

// ---------- Gasto / ingreso mensual ----------

export function monthSpent(transactions: Transaction[], monthKey: string): number {
  return round2(
    transactions
      .filter((t) => t.type === 'expense' && toMonthKey(parseDate(t.date)) === monthKey)
      .reduce((acc, t) => acc + t.amount, 0),
  );
}

export function monthIncome(transactions: Transaction[], monthKey: string): number {
  return round2(
    transactions
      .filter((t) => t.type === 'income' && toMonthKey(parseDate(t.date)) === monthKey)
      .reduce((acc, t) => acc + t.amount, 0),
  );
}

/** Gasto por categoría en un mes (excluye transferencias y pagos TDC). */
export function spentByCategory(
  transactions: Transaction[],
  monthKey: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense' || toMonthKey(parseDate(t.date)) !== monthKey) continue;
    map.set(t.categoryId, round2((map.get(t.categoryId) || 0) + t.amount));
  }
  return map;
}

export function spentByGroup(
  transactions: Transaction[],
  monthKey: string,
  categories: { id: string; group: string }[],
): Map<string, number> {
  const byCat = spentByCategory(transactions, monthKey);
  const catGroup = new Map(categories.map((c) => [c.id, c.group]));
  const map = new Map<string, number>();
  for (const [catId, amount] of byCat) {
    const group = catGroup.get(catId) || 'Otros';
    map.set(group, round2((map.get(group) || 0) + amount));
  }
  return map;
}

// ---------- Patrimonio ----------

/** Patrimonio neto = activos - pasivos - deuda tarjetas - MSI pendiente. */
export function netWorth(
  assets: number,
  liabilities: number,
  creditCardDebt: number,
  installmentDebt: number,
): number {
  return round2(assets - liabilities - creditCardDebt - installmentDebt);
}

export function totalCardDebt(cards: CreditCard[]): number {
  return round2(
    cards.filter((c) => c.active).reduce((acc, c) => acc + c.currentBalance, 0),
  );
}

// ---------- Snapshot financiero ----------

export interface SnapshotInputs {
  date: string;
  cashAndAccounts: number;
  protectedFunds: number;
  creditCardDebt: number;
  installmentDebt: number;
  assets: number;
  liabilities: number;
}

export function buildSnapshot(inputs: SnapshotInputs): FinancialSnapshot {
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

// ---------- Fechas auxiliares ----------

/** Días hasta una fecha (para alertas de corte/límite). */
export function daysUntilISO(iso: string, now: Date = new Date()): number {
  const target = parseDate(iso);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target.getTime() - a) / 86400000);
}

export function addDays(iso: string, days: number): string {
  return addDaysISO(iso, days);
}
