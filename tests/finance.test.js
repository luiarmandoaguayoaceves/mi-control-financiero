// Tests de la lógica financiera pura (node --test, sin dependencias).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceInstallmentPayment,
  budgetStatus,
  createInstallment,
  currentCycleRange,
  emergencyCoverageMonths,
  essentialMonthlyFromServices,
  essentialPending,
  freeMoney,
  msiIncomeRatio,
  msiMonthlyTotal,
  msiPendingTotal,
  netWorth,
  nextCutDate,
  nextDueDate,
  nextTdcPayment,
  protectedFundsTotal,
  roundMoney,
  spentByCategory,
  sumAccountBalances,
  tdcBackingNeeded,
  totalFunds,
  monthIncome,
  monthSpent,
} from '../src/finance.js';

function tx(partial) {
  return {
    description: 'x',
    type: 'expense',
    categoryId: 'c1',
    paymentMethod: 'Tarjeta',
    accountId: 'a1',
    isCreditCardPurchase: false,
    isPending: false,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

// ---------- Dinero libre ----------

test('freeMoney resta apartados, respaldo TDC y esenciales pendientes del saldo', () => {
  assert.equal(freeMoney(1000, 300, 200, 100), 400);
});

test('freeMoney puede ser negativo cuando los compromisos superan el saldo', () => {
  assert.equal(freeMoney(500, 600, 100, 0), -200);
});

// ---------- Cuentas y apartados ----------

test('sumAccountBalances suma solo cuentas débito/efectivo/ahorro', () => {
  const accounts = [
    { id: 'a1', name: 'Nomina', institution: 'BBVA', type: 'debit', balance: 1000, active: true },
    { id: 'a2', name: 'Efectivo', institution: '', type: 'cash', balance: 200, active: true },
    { id: 'a3', name: 'Ahorro', institution: 'BBVA', type: 'savings', balance: 300, active: true },
    { id: 'a4', name: 'TDC', institution: 'BBVA', type: 'credit', balance: 5000, active: true },
  ];
  assert.equal(sumAccountBalances(accounts, ['debit', 'cash', 'savings']), 1500);
});

test('totalFunds y protectedFundsTotal distinguen apartados protegidos', () => {
  const funds = [
    { id: 'f1', name: 'Renta', currentAmount: 2500, protected: true, active: true },
    { id: 'f2', name: 'Equip depa', currentAmount: 6401, protected: false, active: true },
    { id: 'f3', name: 'Inactivo', currentAmount: 999, protected: true, active: false },
  ];
  assert.equal(totalFunds(funds), 8901);
  assert.equal(protectedFundsTotal(funds), 2500);
});

// ---------- Ciclo de corte TDC ----------

test('currentCycleRange inicia el ciclo el día de corte y termina el siguiente corte', () => {
  const now = new Date(2026, 7, 31); // 31 ago 2026
  const cycle = currentCycleRange(12, now);
  assert.equal(cycle.start, '2026-08-12');
  assert.equal(cycle.end, '2026-09-12');
});

test('currentCycleRange cambia de ciclo después del día de corte', () => {
  const now = new Date(2026, 8, 13); // 13 sep 2026
  const cycle = currentCycleRange(12, now);
  assert.equal(cycle.start, '2026-09-12');
  assert.equal(cycle.end, '2026-10-12');
});

test('nextCutDate y nextDueDate calculan fechas futuras de corte y límite', () => {
  const now = new Date(2026, 7, 31); // 31 ago 2026
  assert.equal(nextCutDate(12, now), '2026-09-12');
  // Sin día de pago configurado: día 1 del mes siguiente al corte (BBVA Azul)
  assert.equal(nextDueDate(12, null, now), '2026-10-01');
  // Con día de pago propio de la tarjeta (Nu/Mercado Pago)
  assert.equal(nextDueDate(5, 25, new Date(2026, 7, 31)), '2026-09-25');
  assert.equal(nextDueDate(12, 2, new Date(2026, 7, 31)), '2026-10-02');
});

test('las compras a MSI no se pagan completas en el corte', () => {
  const cycle = { start: '2026-08-12', end: '2026-09-12' };
  const txs = [
    { accountId: 'a1', type: 'expense', isCreditCardPurchase: true, amount: 1000, date: '2026-08-20' },
    { accountId: 'a1', type: 'expense', isCreditCardPurchase: true, isMsi: true, amount: 12000, date: '2026-08-21' },
  ];
  assert.equal(tdcBackingNeeded(txs, ['a1'], cycle), 1000);
});

// ---------- Respaldo TDC ----------

test('tdcBackingNeeded suma compras TDC del ciclo actual sin respaldar', () => {
  const cycle = { start: '2026-08-12', end: '2026-09-12' };
  const transactions = [
    tx({ id: 't1', date: '2026-08-20', amount: 600, isCreditCardPurchase: true }),
    tx({ id: 't2', date: '2026-08-25', amount: 100, isCreditCardPurchase: true }),
    tx({ id: 't3', date: '2026-08-10', amount: 900, isCreditCardPurchase: true }), // ciclo anterior
    tx({ id: 't4', date: '2026-08-21', amount: 50, isCreditCardPurchase: false }), // débito
  ];
  assert.equal(tdcBackingNeeded(transactions, ['a1'], cycle), 700);
});

test('tdcBackingNeeded descuenta pagos de TDC del mismo ciclo y no baja de cero', () => {
  const cycle = { start: '2026-08-12', end: '2026-09-12' };
  const transactions = [
    tx({ id: 't1', date: '2026-08-20', amount: 600, isCreditCardPurchase: true }),
    tx({ id: 't2', date: '2026-08-28', amount: 800, type: 'creditPayment', isCreditCardPurchase: false }),
  ];
  assert.equal(tdcBackingNeeded(transactions, ['a1'], cycle), 0);
});

test('tdcBackingNeeded ignora compras de cuentas que no son de crédito', () => {
  const cycle = { start: '2026-08-12', end: '2026-09-12' };
  const transactions = [
    tx({ id: 't1', date: '2026-08-20', amount: 600, isCreditCardPurchase: true, accountId: 'a-debito' }),
  ];
  assert.equal(tdcBackingNeeded(transactions, ['a-tdc'], cycle), 0);
});

// ---------- MSI ----------

test('msiMonthlyTotal suma las mensualidades activas', () => {
  const items = [
    { id: 'i1', cardId: 'c', description: 'Emma', originalAmount: 4025.33, pendingBalance: 3360, monthlyPayment: 336, totalMonths: 12, currentPaymentNumber: 2, interestRate: 0, startDate: '2026-07-15', active: true },
    { id: 'i2', cardId: 'c', description: 'Refri', originalAmount: 7529.8, pendingBalance: 6908, monthlyPayment: 628, totalMonths: 12, currentPaymentNumber: 1, interestRate: 0, startDate: '2026-08-05', active: true },
    { id: 'i3', cardId: 'c', description: 'LG', originalAmount: 9314.19, pendingBalance: 8806, monthlyPayment: 518, totalMonths: 18, currentPaymentNumber: 1, interestRate: 0, startDate: '2026-08-05', active: true },
    { id: 'i4', cardId: 'c', description: 'Liquidada', originalAmount: 1000, pendingBalance: 0, monthlyPayment: 100, totalMonths: 10, currentPaymentNumber: 10, interestRate: 0, startDate: '2026-01-01', active: false },
  ];
  assert.equal(msiMonthlyTotal(items), 1482);
  assert.equal(msiPendingTotal(items), 19074);
});

test('nextTdcPayment proyecta compras del ciclo + MSI del mes', () => {
  assert.equal(nextTdcPayment(3177.45, 1482), 4659.45);
});

test('msiIncomeRatio devuelve porcentaje o null sin ingreso estimado', () => {
  assert.equal(msiIncomeRatio(1482, 20000), 7.41);
  assert.equal(msiIncomeRatio(1482, undefined), null);
});

// ---------- Registro y avance de compras MSI ----------

test('createInstallment: compra nueva sin pagos arranca en pago 1 con todo el plazo pendiente', () => {
  const item = createInstallment({ description: 'Emma Sleep', monthlyPayment: 336, totalMonths: 12, paidCount: 0 });
  assert.equal(item.currentPaymentNumber, 1);
  assert.equal(item.pendingBalance, 4032);
  assert.equal(item.active, true);
  assert.equal(item.interestRate, 0);
});

test('createInstallment: con pagos previos adelanta el pago y descuenta del pendiente', () => {
  const item = createInstallment({ description: 'Refri Walmart', monthlyPayment: 628, totalMonths: 12, paidCount: 1 });
  assert.equal(item.currentPaymentNumber, 2);
  assert.equal(item.pendingBalance, 6908);
  assert.equal(item.active, true);
});

test('createInstallment: con todas las mensualidades pagadas queda liquidada', () => {
  const item = createInstallment({ description: 'Liquidada', monthlyPayment: 100, totalMonths: 10, paidCount: 10 });
  assert.equal(item.active, false);
  assert.equal(item.pendingBalance, 0);
});

test('createInstallment: pagadas negativas se tratan como cero y mayores al plazo se liquidan', () => {
  const neg = createInstallment({ description: 'x', monthlyPayment: 100, totalMonths: 6, paidCount: -3 });
  assert.equal(neg.currentPaymentNumber, 1);
  assert.equal(neg.pendingBalance, 600);
  const over = createInstallment({ description: 'x', monthlyPayment: 100, totalMonths: 6, paidCount: 99 });
  assert.equal(over.active, false);
  assert.equal(over.pendingBalance, 0);
});

test('advanceInstallmentPayment: registrar un pago avanza y descuenta una mensualidad', () => {
  const item = createInstallment({ description: 'Emma', monthlyPayment: 336, totalMonths: 12, paidCount: 1 });
  assert.equal(item.pendingBalance, 3696);
  const next = advanceInstallmentPayment(item);
  assert.equal(next.currentPaymentNumber, 3);
  assert.equal(next.pendingBalance, 3360);
  assert.equal(next.active, true);
});

test('advanceInstallmentPayment: la última mensualidad liquida la compra', () => {
  const item = createInstallment({ description: 'Emma', monthlyPayment: 336, totalMonths: 12, paidCount: 11 });
  const next = advanceInstallmentPayment(item);
  assert.equal(next.active, false);
  assert.equal(next.pendingBalance, 0);
  assert.equal(next.currentPaymentNumber, 12);
});

test('advanceInstallmentPayment: no cambia compras inactivas o con pendiente cero', () => {
  const done = createInstallment({ description: 'x', monthlyPayment: 100, totalMonths: 12, paidCount: 12 });
  assert.deepEqual(advanceInstallmentPayment(done), done);
  const inactiva = { ...createInstallment({ description: 'x', monthlyPayment: 100, totalMonths: 12 }), active: false };
  assert.deepEqual(advanceInstallmentPayment(inactiva), inactiva);
});

test('advanceInstallmentPayment: nunca deja pendiente negativo con datos raros', () => {
  const raro = { ...createInstallment({ description: 'x', monthlyPayment: 500, totalMonths: 12, paidCount: 0 }), pendingBalance: 300 };
  assert.equal(advanceInstallmentPayment(raro).pendingBalance, 0);
});

// ---------- Emergencia y esenciales ----------

test('essentialMonthlyFromServices suma solo servicios activos', () => {
  const services = [
    { id: 's1', name: 'Renta', expectedMonthlyAmount: 5000, categoryId: 'c1', active: true },
    { id: 's2', name: 'AWS', expectedMonthlyAmount: 800, categoryId: 'c2', active: false },
  ];
  assert.equal(essentialMonthlyFromServices(services), 5000);
});

test('emergencyCoverageMonths divide fondo entre gastos esenciales mensuales', () => {
  assert.equal(emergencyCoverageMonths(4000, 7010), 0.57);
  assert.equal(emergencyCoverageMonths(4000, 0), null);
});

test('essentialPending suma servicios con dueDay futuro no cubiertos por gasto del mes', () => {
  const now = new Date(2026, 8, 3); // 3 sep 2026
  const services = [
    { id: 's1', name: 'Renta', expectedMonthlyAmount: 5000, dueDay: 5, categoryId: 'c-renta', active: true },
    { id: 's2', name: 'Agua', expectedMonthlyAmount: 186, dueDay: 15, categoryId: 'c-agua', active: true },
    { id: 's3', name: 'Luz (vencida)', expectedMonthlyAmount: 300, dueDay: 2, categoryId: 'c-luz', active: true },
  ];
  const transactions = [
    tx({ id: 't1', date: '2026-09-01', amount: 5000, categoryId: 'c-renta' }), // renta ya pagada
  ];
  assert.equal(essentialPending(services, transactions, now), 186);
});

// ---------- Presupuesto ----------

test('budgetStatus aplica semáforo verde/amarillo/rojo', () => {
  assert.equal(budgetStatus(1000, 500).level, 'verde');
  assert.equal(budgetStatus(1000, 749).level, 'verde');
  assert.equal(budgetStatus(1000, 750).level, 'amarillo');
  assert.equal(budgetStatus(1000, 1000).level, 'amarillo');
  assert.equal(budgetStatus(1000, 1001).level, 'rojo');
  assert.equal(budgetStatus(1000, 500).pct, 50);
});

test('budgetStatus sin presupuesto: sin gasto es verde, con gasto es rojo', () => {
  assert.equal(budgetStatus(0, 0).level, 'verde');
  assert.equal(budgetStatus(0, 100).level, 'rojo');
});

// ---------- Gasto / ingreso mensual ----------

test('monthSpent suma solo gastos del mes (excluye transferencias y pagos TDC)', () => {
  const transactions = [
    tx({ id: 't1', date: '2026-08-14', amount: 399 }),
    tx({ id: 't2', date: '2026-08-28', amount: 8644.18, type: 'creditPayment' }),
    tx({ id: 't3', date: '2026-08-29', amount: 1000, type: 'transfer' }),
    tx({ id: 't4', date: '2026-09-01', amount: 500 }),
    tx({ id: 't5', date: '2026-08-30', amount: 1000, type: 'income' }),
  ];
  assert.equal(monthSpent(transactions, '2026-08'), 399);
  assert.equal(monthIncome(transactions, '2026-08'), 1000);
});

test('spentByCategory agrupa gastos por categoría en el mes', () => {
  const transactions = [
    tx({ id: 't1', date: '2026-08-14', amount: 399, categoryId: 'c-sus' }),
    tx({ id: 't2', date: '2026-08-15', amount: 747.55, categoryId: 'c-despensa' }),
    tx({ id: 't3', date: '2026-08-20', amount: 400, categoryId: 'c-sus' }),
  ];
  const map = spentByCategory(transactions, '2026-08');
  assert.equal(map.get('c-sus'), 799);
  assert.equal(map.get('c-despensa'), 747.55);
  assert.equal(map.get('c-renta'), undefined);
});

// ---------- Patrimonio ----------

test('netWorth resta pasivos, deuda de tarjetas y MSI pendiente a los activos', () => {
  assert.equal(netWorth(45000, 5000, 20000.5, 19074), 925.5);
});

// ---------- Redondeo ----------

test('roundMoney redondea a centavos', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(1234.567), 1234.57);
});
