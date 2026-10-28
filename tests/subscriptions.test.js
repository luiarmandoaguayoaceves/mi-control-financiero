// Cobros automáticos de suscripciones: motor puro (sin DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargeRecurring, nextChargeFor } from '../src/store.js';

function makeData(subs = []) {
  return {
    version: 1,
    settings: { currency: 'MXN', reminders: true },
    accounts: [
      { id: 'acc-nomina', name: 'Nómina', type: 'debit', balance: 10000, active: true },
      { id: 'acc-tdc-nu', name: 'Tarjeta Nu', type: 'credit', balance: 0, creditLimit: 20000, availableCredit: 20000, active: true, cardId: 'cc-nu' },
    ],
    creditCards: [
      { id: 'cc-nu', accountId: 'acc-tdc-nu', name: 'Tarjeta Nu', creditLimit: 20000, currentBalance: 0, cutDay: 6, paymentDueDay: 25, availableCredit: 20000, active: true },
    ],
    categories: [{ id: 'cat-suscripciones', name: 'Suscripciones', group: 'Necesidad', active: true }],
    funds: [],
    installmentPurchases: [],
    services: [],
    goals: [],
    budgets: [],
    subscriptions: subs,
    transactions: [],
    assets: [],
    liabilities: [],
    snapshots: [],
  };
}

const sub = (extra = {}) => ({
  id: 'sub-1',
  name: 'Netflix',
  amount: 219,
  dayOfMonth: 15,
  categoryId: 'cat-suscripciones',
  accountId: 'acc-nomina',
  active: true,
  nextChargeDate: '2026-11-15',
  ...extra,
});

test('nextChargeFor toma la siguiente fecha estrictamente futura', () => {
  assert.equal(nextChargeFor(15, new Date(2026, 9, 28)), '2026-11-15');
  assert.equal(nextChargeFor(15, new Date(2026, 9, 10)), '2026-10-15');
  assert.equal(nextChargeFor(15, new Date(2026, 9, 15)), '2026-11-15', 'el mismo día ya no se cobra');
  assert.equal(nextChargeFor(31, new Date(2026, 9, 28)), '2026-11-28', 'día fuera de rango se acota a 28');
});

test('chargeRecurring registra el gasto y avanza un mes el próximo cobro', () => {
  const data = makeData([sub()]);
  const { data: next, created } = chargeRecurring(data, '2026-11-16');

  assert.equal(created.length, 1);
  assert.equal(created[0].amount, 219);
  assert.equal(created[0].date, '2026-11-15');
  assert.match(created[0].description, /Netflix \(suscripción\)/);
  assert.equal(next.transactions.length, 1, 'movimiento agregado');
  assert.equal(next.accounts.find((a) => a.id === 'acc-nomina').balance, 9781, 'sale de la cuenta');
  assert.equal(next.subscriptions[0].nextChargeDate, '2026-12-15', 'avanza al siguiente mes');
});

test('chargeRecurring es idempotente: correrlo dos veces no duplica el cargo', () => {
  const first = chargeRecurring(makeData([sub()]), '2026-11-16');
  const second = chargeRecurring(first.data, '2026-11-16');
  assert.equal(second.created.length, 0, 'nada nuevo que cobrar');
  assert.equal(second.data.transactions.length, 1, 'sigue habiendo un solo movimiento');
  assert.equal(second.data.accounts.find((a) => a.id === 'acc-nomina').balance, 9781);
});

test('chargeRecurring recupera varios meses atrasados y respeta pausadas', () => {
  const atrasada = sub({ nextChargeDate: '2026-09-15', id: 'sub-2' });
  const pausada = sub({ id: 'sub-3', active: false, nextChargeDate: '2026-09-15' });
  const { data: next, created } = chargeRecurring(makeData([atrasada, pausada]), '2026-11-20');

  assert.equal(created.length, 3, 'sep, oct y nov');
  assert.deepEqual(created.map((tx) => tx.date), ['2026-09-15', '2026-10-15', '2026-11-15']);
  assert.equal(next.subscriptions.find((s) => s.id === 'sub-2').nextChargeDate, '2026-12-15');
  assert.equal(next.subscriptions.find((s) => s.id === 'sub-3').nextChargeDate, '2026-09-15', 'pausada sin cambios');
});

test('chargeRecurring con tarjeta sube la deuda de esa tarjeta, no la cuenta', () => {
  const conTarjeta = sub({
    cardId: 'cc-nu',
    accountId: 'acc-tdc-nu',
    isCreditCardPurchase: true,
    nextChargeDate: '2026-11-15',
  });
  const { data: next, created } = chargeRecurring(makeData([conTarjeta]), '2026-11-20');
  assert.equal(created.length, 1);
  assert.equal(next.creditCards[0].currentBalance, 219);
  assert.equal(next.accounts.find((a) => a.id === 'acc-nomina').balance, 10000, 'la cuenta no se toca');
});

test('chargeRecurring ignora suscripciones sin monto o sin cuenta', () => {
  const sinMonto = sub({ id: 'sub-4', amount: 0 });
  const sinCuenta = sub({ id: 'sub-5', accountId: '' });
  const { created } = chargeRecurring(makeData([sinMonto, sinCuenta]), '2026-11-20');
  assert.equal(created.length, 0);
});
