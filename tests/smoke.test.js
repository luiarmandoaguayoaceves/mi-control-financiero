// Smoke test: renderiza todas las pantallas (con stub de navegador) y
// verifica la contabilidad de extremo a extremo sin necesitar un browser.
// La app NO tiene datos semilla: los tests usan un fixture propio.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- Stub mínimo de navegador (localStorage) ---
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

import { todayISO, addDaysISO } from '../src/format.js';
import { currentCycleRange } from '../src/finance.js';

/** Fecha dentro del ciclo de corte actual (día 1 después del corte). */
const CYCLE_TX_DATE = addDaysISO(currentCycleRange(12, new Date()).start, 1);

/** Fixture de prueba: datos con los mismos ids que usan las acciones. */
function makeFixture() {
  return {
    version: 1,
    settings: { currency: 'MXN' },
    accounts: [
      { id: 'acc-nomina', name: 'Nómina BBVA', institution: 'BBVA', type: 'debit', balance: 12074.73, active: true },
      { id: 'acc-tdc-azul', name: 'Tarjeta BBVA Azul', institution: 'BBVA', type: 'credit', balance: 20000.5, creditLimit: 111700, availableCredit: 91699.5, active: true },
    ],
    creditCards: [
      { id: 'cc-azul', name: 'Tarjeta BBVA Azul', bank: 'BBVA', creditLimit: 111700, currentBalance: 20000.5, cutDay: 12, currentNoInterestPayment: 0, availableCredit: 91699.5, points: 268, active: true },
    ],
    categories: [
      { id: 'cat-despensa', name: 'Despensa', group: 'Necesidad', active: true },
      { id: 'cat-suscripciones', name: 'Suscripciones', group: 'Necesidad', active: true },
      { id: 'cat-renta', name: 'Renta', group: 'Necesidad', active: true },
      { id: 'cat-ingreso', name: 'Ingreso', group: 'Ingreso', active: true },
      { id: 'cat-tdc-pago', name: 'TDC pago', group: 'Deuda/Pago', active: true },
      { id: 'cat-otros', name: 'Otros', group: 'Necesidad', active: true },
    ],
    funds: [
      { id: 'f-emergencia', name: 'Fondo de emergencia', currentAmount: 4000, targetAmount: 39000, protected: true, active: true },
      { id: 'f-renta', name: 'Renta', currentAmount: 2500, protected: true, active: true },
    ],
    installmentPurchases: [],
    services: [],
    goals: [],
    budgets: [],
    transactions: [
      { id: 'tx-test-1', date: CYCLE_TX_DATE, description: 'ChatGPT', amount: 399, type: 'expense', categoryId: 'cat-suscripciones', paymentMethod: 'Tarjeta', accountId: 'acc-tdc-azul', isCreditCardPurchase: true, isPending: false, createdAt: '', updatedAt: '' },
    ],
    assets: [],
    liabilities: [],
    snapshots: [],
  };
}

mem.set('mcf_app_data_v1', JSON.stringify(makeFixture()));

const { load, emptyData, addTransaction, deleteTransaction, getData, fundMovement } = await import('../src/store.js');
const { store } = await import('../src/screens/appState.js');
store.data = load();

const { renderDashboard } = await import('../src/screens/dashboard.js');
const { renderMovements } = await import('../src/screens/movements.js');
const { renderCard } = await import('../src/screens/card.js');
const { renderFunds } = await import('../src/screens/funds.js');
const { renderServices } = await import('../src/screens/services.js');
const { renderGoals } = await import('../src/screens/goals.js');
const { renderBudget } = await import('../src/screens/budget.js');
const { renderAssets } = await import('../src/screens/assets.js');
const { renderReports } = await import('../src/screens/reports.js');
const { renderSettings } = await import('../src/screens/settings.js');
const { renderMore } = await import('../src/screens/more.js');
const { renderModal } = await import('../src/screens/modals.js');
const { shouldIgnoreBackdropClick, installPromptState, installBannerHtml } = await import('../src/ui.js');
const { state } = await import('../src/screens/appState.js');

test('arranque vacío: la app NO tiene datos semilla', () => {
  const empty = emptyData();
  assert.equal(empty.transactions.length, 0, 'sin movimientos');
  assert.equal(empty.services.length, 0);
  assert.equal(empty.goals.length, 0);
  assert.equal(empty.budgets.length, 0);
  assert.equal(empty.assets.length, 0);
  assert.equal(empty.snapshots.length, 0);
  assert.equal(empty.accounts.length, 3, 'solo estructura de cuentas');
  assert.ok(empty.accounts.every((a) => a.balance === 0), 'cuentas en $0');
  assert.equal(empty.categories.length, 23, 'categorías por defecto (la app las necesita)');
  assert.ok(empty.funds.every((f) => f.currentAmount === 0), 'apartados en $0');
});

test('garantía: un despliegue nunca toca tus datos locales (localStorage prevalece)', () => {
  // Simula que el usuario modificó datos (fondo de emergencia 4000 -> 4500)
  const modified = makeFixture();
  modified.funds = modified.funds.map((f) =>
    f.id === 'f-emergencia' ? { ...f, currentAmount: 4500 } : f,
  );
  mem.set('mcf_app_data_v1', JSON.stringify(modified));
  const loaded = JSON.parse(mem.get('mcf_app_data_v1'));
  assert.equal(loaded.funds.find((f) => f.id === 'f-emergencia').currentAmount, 4500);
  // El arranque vacío tiene $0: no se re-aplica sobre datos guardados
  assert.equal(emptyData().funds.find((f) => f.id === 'f-emergencia').currentAmount, 0);
});

test('aviso de instalación PWA: botón solo con beforeinstallprompt', () => {
  assert.deepEqual(installPromptState({ deferred: true }), { showButton: true, showIosHint: false });
  assert.deepEqual(installPromptState({ deferred: false }), { showButton: false, showIosHint: false });
  assert.deepEqual(installPromptState({ deferred: true, hidden: true }), { showButton: false, showIosHint: false });
  assert.deepEqual(installPromptState({ deferred: true, standalone: true }), { showButton: false, showIosHint: false });
  assert.deepEqual(installPromptState({ isIOS: true }), { showButton: false, showIosHint: true });
});

test('aviso de instalación PWA: render del banner', () => {
  assert.ok(installBannerHtml({ showButton: true }).includes('data-action="install-app"'));
  assert.ok(installBannerHtml({ showIosHint: true }).includes('Agregar a pantalla de inicio'));
  assert.equal(installBannerHtml({}), '');
  assert.equal(installBannerHtml({ showButton: false, showIosHint: false }), '');
});

test('modal: un clic en el contenido no cierra el modal (solo el fondo)', () => {
  const backdrop = { dataset: { action: 'modal-backdrop' } };
  const input = { tagName: 'INPUT' };
  assert.equal(shouldIgnoreBackdropClick(backdrop, backdrop), false);
  assert.equal(shouldIgnoreBackdropClick(input, backdrop), true);
  const cancelBtn = { dataset: { action: 'modal-close' } };
  assert.equal(shouldIgnoreBackdropClick(input, cancelBtn), false);
});

test('dashboard renderiza saldo, dinero libre y alerta de respaldo TDC', () => {
  const html = renderDashboard();
  assert.ok(html.includes('$12,074.73'), 'saldo de la cuenta');
  assert.ok(html.includes('Dinero libre real'), 'dinero libre');
  assert.ok(html.includes('TDC sin respaldar'), 'alerta de respaldo pendiente');
  assert.ok(html.includes('$399.00'), 'pago proyectado = respaldo 399 + MSI 0');
  assert.ok(html.includes('$6,500.00'), 'total apartados del fixture');
});

test('tarjeta muestra línea, saldo y estado vacío de MSI', () => {
  const html = renderCard();
  assert.ok(html.includes('$111,700'), 'línea de crédito');
  assert.ok(html.includes('$20,000.50'), 'saldo utilizado');
  assert.ok(html.includes('$0.00'), 'MSI mensuales en cero');
  assert.ok(html.includes('Sin compras MSI activas'), 'sin MSI registrados');
  assert.ok(html.includes('MSI futuros'), 'nota: el saldo no es el pago requerido');
});

test('apartados muestran total y protegidos del fixture', () => {
  const html = renderFunds();
  assert.ok(html.includes('$6,500.00'));
  assert.ok(html.includes('$6,500.00 protegidos'));
});

test('todas las pantallas renderizan sin excepciones', () => {
  const renders = {
    movements: renderMovements,
    services: renderServices,
    goals: renderGoals,
    budget: renderBudget,
    assets: renderAssets,
    reports: renderReports,
    settings: renderSettings,
    more: renderMore,
  };
  for (const [name, fn] of Object.entries(renders)) {
    assert.doesNotThrow(() => fn(), `pantalla ${name} no debe fallar`);
    assert.ok(fn().length > 100, `pantalla ${name} debe producir HTML`);
  }
});

test('contabilidad: gasto con débito baja el saldo y se revierte al borrar', () => {
  const before = getData().accounts.find((a) => a.id === 'acc-nomina').balance;
  const tx = addTransaction({
    date: todayISO(), description: 'Prueba débito', amount: 100,
    type: 'expense', categoryId: 'cat-despensa', paymentMethod: 'Débito',
    accountId: 'acc-nomina', isCreditCardPurchase: false, isPending: false,
  });
  const after = getData().accounts.find((a) => a.id === 'acc-nomina').balance;
  assert.equal(after, Math.round((before - 100) * 100) / 100);
  deleteTransaction(tx.id);
  const restored = getData().accounts.find((a) => a.id === 'acc-nomina').balance;
  assert.equal(restored, before);
});

test('contabilidad: compra TDC sube el saldo de la tarjeta', () => {
  const before = getData().creditCards.find((c) => c.id === 'cc-azul').currentBalance;
  const tx = addTransaction({
    date: todayISO(), description: 'Prueba TDC', amount: 600,
    type: 'expense', categoryId: 'cat-despensa', paymentMethod: 'Tarjeta',
    accountId: 'acc-tdc-azul', isCreditCardPurchase: true, isPending: false,
  });
  const after = getData().creditCards.find((c) => c.id === 'cc-azul').currentBalance;
  assert.equal(after, Math.round((before + 600) * 100) / 100);
  deleteTransaction(tx.id);
});

test('contabilidad: ingreso a apartado incrementa el fondo', () => {
  const before = getData().funds.find((f) => f.id === 'f-emergencia').currentAmount;
  fundMovement('f-emergencia', 500, 'deposit');
  const after = getData().funds.find((f) => f.id === 'f-emergencia').currentAmount;
  assert.equal(after, before + 500);
});

test('modal de nuevo movimiento renderiza el formulario', () => {
  state.modal = { kind: 'newTx', form: { type: 'expense', date: todayISO(), description: '', amount: '', categoryId: 'cat-despensa', paymentMethod: 'Tarjeta', accountId: 'acc-nomina', toAccountId: '', fundId: '', isTdc: false, isPending: false, notes: '' } };
  const html = renderModal();
  assert.ok(html.includes('Nuevo movimiento'));
  assert.ok(html.includes('Monto'));
  assert.ok(html.includes('Compra con tarjeta de crédito'));
  state.modal = null;
});
