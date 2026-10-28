// Resumen del widget de pantalla de inicio: función pura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widgetSnapshot } from '../src/widget.js';

function fixture() {
  return {
    settings: { currency: 'MXN' },
    accounts: [
      { id: 'a1', name: 'Nómina', type: 'debit', balance: 10000, active: true },
      { id: 'a2', name: 'TDC Nu', type: 'credit', balance: 3000, active: true, cardId: 'cc-nu' },
    ],
    creditCards: [
      { id: 'cc-nu', accountId: 'a2', name: 'Tarjeta Nu', cutDay: 5, paymentDueDay: 25, active: true },
    ],
    funds: [{ id: 'f1', name: 'Renta', currentAmount: 2000, protected: true, active: true }],
    installmentPurchases: [
      { id: 'i1', cardId: 'cc-nu', description: 'Audífonos', monthlyPayment: 450, totalMonths: 12, currentPaymentNumber: 3, pendingBalance: 4500, active: true },
    ],
    services: [],
    transactions: [],
  };
}

test('widgetSnapshot arma las 4 líneas del widget con datos reales', () => {
  const now = new Date(2026, 9, 28, 10, 0, 0);
  const snap = widgetSnapshot(fixture(), now);
  assert.match(snap.line1, /Saldo: \$10,000\.00/);
  assert.match(snap.line2, /Libre: /);
  assert.match(snap.line3, /Corte Tarjeta Nu/);
  assert.match(snap.line4, /MSI \$450\.00/);
  assert.equal(snap.title, 'Mi Control Financiero');
});

test('widgetSnapshot no inventa corte cuando la tarjeta no lo tiene configurado', () => {
  const data = fixture();
  data.creditCards[0].cutDay = null;
  const snap = widgetSnapshot(data, new Date(2026, 9, 28, 10, 0, 0));
  assert.match(snap.line3, /Configura tu corte/);
});
