// Verifica que los datos reales del seed producen los números esperados
// (proyección del usuario: compras 3177.45 + MSI 1482 = 4659.45).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedData } from '../src/seed/seedData.ts';
import {
  currentCycleRange,
  essentialMonthlyFromServices,
  freeMoney,
  msiMonthlyTotal,
  nextTdcPayment,
  protectedFundsTotal,
  tdcBackingNeeded,
  totalFunds,
} from '../src/services/financeService.ts';
import { availableBalance } from '../src/services/financeService.ts';

const seed = buildSeedData();

test('seed: compras TDC del ciclo posterior al corte suman 3177.45', () => {
  const card = seed.creditCards[0];
  const cycle = currentCycleRange(card.cutDay, new Date(2026, 7, 31)); // 31-ago-2026
  const creditIds = seed.accounts.filter((a) => a.type === 'credit').map((a) => a.id);
  assert.equal(tdcBackingNeeded(seed.transactions, creditIds, cycle), 3177.45);
});

test('seed: MSI mensuales suman 1482 (336 + 628 + 518)', () => {
  assert.equal(msiMonthlyTotal(seed.installmentPurchases), 1482);
});

test('seed: pago proyectado del próximo corte = 4659.45 (dinámico)', () => {
  const card = seed.creditCards[0];
  const cycle = currentCycleRange(card.cutDay, new Date(2026, 7, 31));
  const creditIds = seed.accounts.filter((a) => a.type === 'credit').map((a) => a.id);
  const respaldo = tdcBackingNeeded(seed.transactions, creditIds, cycle);
  assert.equal(nextTdcPayment(respaldo, msiMonthlyTotal(seed.installmentPurchases)), 4659.45);
});

test('seed: apartados suman 16401 y protegidos 10000', () => {
  assert.equal(totalFunds(seed.funds), 16401);
  assert.equal(protectedFundsTotal(seed.funds), 10000);
});

test('seed: saldo disponible es 12074.73 (nómina BBVA)', () => {
  assert.equal(availableBalance(seed.accounts), 12074.73);
});

test('seed: dinero libre real es negativo porque apartados > saldo (fórmula pedida)', () => {
  const card = seed.creditCards[0];
  const cycle = currentCycleRange(card.cutDay, new Date(2026, 7, 31));
  const creditIds = seed.accounts.filter((a) => a.type === 'credit').map((a) => a.id);
  const libre = freeMoney(
    availableBalance(seed.accounts),
    totalFunds(seed.funds),
    tdcBackingNeeded(seed.transactions, creditIds, cycle),
    essentialMonthlyFromServices(seed.services.filter((s) => s.dueDay && s.dueDay >= 31)),
  );
  assert.ok(libre < 0);
});

test('seed: patrimonio neto inicial = 5925.50 (activos 45000 - TDC 20000.50 - MSI 19074)', () => {
  assert.equal(seed.snapshots[0].netWorth, 5925.5);
});
