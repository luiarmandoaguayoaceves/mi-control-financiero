// Tests de utilidades de formato y parseo de montos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  money,
  parseAmount,
  parseAmountOrZero,
  todayISO,
  todayMonthKey,
  shiftMonthKey,
  daysUntil,
} from '../src/format.js';

test('money formatea MXN con 2 decimales', () => {
  assert.equal(money(1234.5), '$1,234.50');
  assert.equal(money(0), '$0.00');
});

test('parseAmount exige monto mayor a cero', () => {
  assert.equal(parseAmount('600'), 600);
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
});

test('parseAmountOrZero permite cero (presupuestos, metas, saldos)', () => {
  assert.equal(parseAmountOrZero('0'), 0);
  assert.equal(parseAmountOrZero('0.00'), 0);
  assert.equal(parseAmountOrZero('500'), 500);
  assert.equal(parseAmountOrZero(''), null);
  assert.equal(parseAmountOrZero('abc'), null);
});

test('fechas: hoy, meses y días', () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(todayMonthKey(), /^\d{4}-\d{2}$/);
  assert.equal(shiftMonthKey('2026-08', 1), '2026-09');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(daysUntil('2026-09-10', new Date(2026, 8, 1)), 9);
});
