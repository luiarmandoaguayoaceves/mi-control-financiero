// Recordatorios de corte y pago: lógica pura (sin plugin nativo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueDateForCut, reminderPlan } from '../src/reminders.js';

test('dueDateForCut respeta el día de pago de cada tarjeta', () => {
  // Corte 5, pago 25: misma vuelta del mes
  assert.equal(dueDateForCut(new Date(2026, 10, 5), 25).getDate(), 25);
  assert.equal(dueDateForCut(new Date(2026, 10, 5), 25).getMonth(), 10);
  // Corte 12, pago 2: el pago cae el mes siguiente
  const due = dueDateForCut(new Date(2026, 10, 12), 2);
  assert.equal(due.getDate(), 2);
  assert.equal(due.getMonth(), 11);
  // Sin día configurado se usa el día 1 del mes siguiente (BBVA Azul)
  assert.equal(dueDateForCut(new Date(2026, 10, 12), null).getDate(), 1);
});

test('reminderPlan genera avisos de corte y pago por tarjeta, sin fechas pasadas', () => {
  const now = new Date(2026, 9, 28, 12, 0, 0); // 28 oct 2026, mediodía
  const cards = [
    { id: 'cc-nu', name: 'Tarjeta Nu', active: true, cutDay: 5, paymentDueDay: 25 },
    { id: 'cc-mp', name: 'Mercado Pago', active: true, cutDay: null, paymentDueDay: null },
    { id: 'cc-off', name: 'Inactiva', active: false, cutDay: 10, paymentDueDay: 20 },
  ];
  const plan = reminderPlan(cards, now, 2);

  assert.ok(plan.length > 0, 'hay recordatorios programados');
  assert.ok(plan.every((p) => p.at.getTime() > now.getTime()), 'ninguno en el pasado');
  assert.ok(plan.every((p) => p.cardId === 'cc-nu'), 'solo tarjetas con corte configurado');
  assert.deepEqual(new Set(plan.map((p) => p.id)).size, plan.length, 'ids únicos');

  const cortes = plan.filter((p) => p.kind === 'corte');
  const pagos = plan.filter((p) => p.kind === 'pago');
  assert.ok(cortes.length >= 2 && pagos.length >= 2, 'avisos de corte y de pago');
  assert.ok(plan.every((p) => p.at.getHours() === 9), 'llegan a las 9:00');
  assert.ok(plan[0].title.length > 0 && plan[0].body.includes('Tarjeta Nu') === false, 'cuerpo informativo');
});
