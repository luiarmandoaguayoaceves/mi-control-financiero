// Smoke test: renderiza todas las pantallas (con stub de navegador) y
// verifica la contabilidad de extremo a extremo sin necesitar un browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- Stub mínimo de navegador (localStorage) ---
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const { load, addTransaction, deleteTransaction, getData, fundMovement, bootstrapFromFile } = await import('../src/store.js');
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
const { shouldIgnoreBackdropClick } = await import('../src/ui.js');
const { state } = await import('../src/screens/appState.js');

test('modal: un clic en el contenido no cierra el modal (solo el fondo)', () => {
  const backdrop = { dataset: { action: 'modal-backdrop' } };
  const input = { tagName: 'INPUT' };
  // Clic directo sobre el fondo -> se cierra (no se ignora)
  assert.equal(shouldIgnoreBackdropClick(backdrop, backdrop), false);
  // Clic que sube desde el input -> se ignora (no cierra)
  assert.equal(shouldIgnoreBackdropClick(input, backdrop), true);
  // Clic en un botón real (con su propio data-action) -> no es backdrop
  const cancelBtn = { dataset: { action: 'modal-close' } };
  assert.equal(shouldIgnoreBackdropClick(input, cancelBtn), false);
});

test('bootstrap: sin datos locales y sin archivo, persiste el seed', async () => {
  // fetch relativo no existe en Node -> cae al seed y lo persiste en localStorage
  await bootstrapFromFile();
  const raw = mem.get('mcf_app_data_v1');
  assert.ok(raw, 'debe persistir datos en localStorage');
  assert.ok(JSON.parse(raw).transactions.length === 10, 'debe ser el seed (10 movimientos)');
});

test('dashboard renderiza el saldo real del seed', () => {
  const html = renderDashboard();
  assert.ok(html.includes('$12,074.73'), 'debe mostrar el saldo de nómina');
  assert.ok(html.includes('Dinero libre real'), 'debe mostrar dinero libre');
  assert.ok(html.includes('TDC sin respaldar'), 'debe alertar el respaldo pendiente');
  assert.ok(html.includes('$4,659.45'), 'pago proyectado 4659.45');
});

test('tarjeta muestra línea, saldo, MSI y pago proyectado', () => {
  const html = renderCard();
  assert.ok(html.includes('$111,700'), 'línea de crédito');
  assert.ok(html.includes('$20,000.50'), 'saldo utilizado');
  assert.ok(html.includes('$1,482.00'), 'MSI mensuales');
  assert.ok(html.includes('Emma Sleep'), 'compra MSI');
  assert.ok(html.includes('MSI futuros'), 'nota de que el saldo no es el pago');
});

test('apartados muestran total 16401 y protegidos 10000', () => {
  const html = renderFunds();
  assert.ok(html.includes('$16,401.00'));
  assert.ok(html.includes('$10,000.00 protegidos'));
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
    date: '2026-09-01', description: 'Prueba débito', amount: 100,
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
    date: '2026-09-01', description: 'Prueba TDC', amount: 600,
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
  state.modal = { kind: 'newTx', form: { type: 'expense', date: '2026-09-01', description: '', amount: '', categoryId: 'cat-despensa', paymentMethod: 'Tarjeta', accountId: 'acc-nomina', toAccountId: '', fundId: '', isTdc: false, isPending: false, notes: '' } };
  const html = renderModal();
  assert.ok(html.includes('Nuevo movimiento'));
  assert.ok(html.includes('Monto'));
  assert.ok(html.includes('Compra con tarjeta de crédito'));
  state.modal = null;
});
