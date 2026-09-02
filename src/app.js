// ============================================================
// app.js — arranque, hash router, acciones (event delegation), tema.
// ============================================================
import { store, state } from './screens/appState.js';
import { load, subscribe, bootstrapFromFile, addTransaction, updateTransaction, deleteTransaction, fundMovement, updateCollection, removeFromCollection, updateSettings, importJSON, exportJSON, resetData } from './store.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderMovements } from './screens/movements.js';
import { renderCard } from './screens/card.js';
import { renderFunds } from './screens/funds.js';
import { renderMore } from './screens/more.js';
import { renderServices } from './screens/services.js';
import { renderGoals } from './screens/goals.js';
import { renderBudget } from './screens/budget.js';
import { renderAssets } from './screens/assets.js';
import { renderReports } from './screens/reports.js';
import { renderSettings } from './screens/settings.js';
import { renderModal } from './screens/modals.js';
import { txRow, empty as emptyHtml, shouldIgnoreBackdropClick } from './ui.js';
import { THEME_KEY, STORAGE_KEY } from './models.js';
import { todayISO, shiftMonthKey, parseAmount } from './format.js';

const app = document.getElementById('app');

// ---------- Tema oscuro ----------

function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  return dark;
}

let isDark = applyTheme();

// ---------- Router ----------

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'more' && parts[1]) {
    state.view = 'more';
    state.moreView = parts[1];
  } else if (['dashboard', 'movements', 'card', 'funds', 'more'].includes(parts[0])) {
    state.view = parts[0];
  } else {
    state.view = 'dashboard';
  }
}

function setHash(view) {
  if (view === 'more') {
    location.hash = `#/more/${state.moreView}`;
  } else {
    location.hash = `#/${view}`;
  }
}

// ---------- Render ----------

function viewHtml() {
  switch (state.view) {
    case 'movements': return renderMovements();
    case 'card': return renderCard();
    case 'funds': return renderFunds();
    case 'more':
      switch (state.moreView) {
        case 'services': return renderServices();
        case 'goals': return renderGoals();
        case 'budget': return renderBudget();
        case 'assets': return renderAssets();
        case 'reports': return renderReports();
        case 'settings': return renderSettings();
        default: return renderMore();
      }
    default: return renderDashboard();
  }
}

function navHtml() {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'movements', label: 'Movimientos', icon: '💸' },
    { id: 'card', label: 'Tarjeta', icon: '💳' },
    { id: 'funds', label: 'Apartados', icon: '🏦' },
    { id: 'more', label: 'Más', icon: '📊' },
  ];
  return `
    <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-40">
      <div class="grid grid-cols-5">
        ${tabs.map((t) => {
          const active = state.view === t.id;
          return `
            <button data-action="nav" data-payload="${t.id}" aria-label="${t.label}"
              class="flex flex-col items-center gap-0.5 py-2 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}">
              <span class="text-lg leading-none">${t.icon}</span>
              <span class="text-[10px] font-semibold">${t.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}

function headerHtml() {
  const titles = {
    dashboard: 'Mi Control Financiero',
    movements: 'Movimientos',
    card: 'Tarjeta',
    funds: 'Apartados',
    more: 'Más',
  };
  const title = state.view === 'more'
    ? ({ menu: 'Más', services: 'Servicios', goals: 'Metas', budget: 'Presupuesto', assets: 'Patrimonio', reports: 'Reportes', settings: 'Configuración' }[state.moreView] || 'Más')
    : titles[state.view];
  return `
    <header class="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <h1 class="text-base font-extrabold text-slate-900 dark:text-slate-50">${title}</h1>
        <div class="flex items-center gap-2">
          ${state.view === 'dashboard' || state.view === 'movements' ? `<button data-action="new-tx" class="bg-indigo-600 text-white w-8 h-8 rounded-full text-xl font-bold leading-none active:scale-90">+</button>` : ''}
          <button data-action="toggle-theme" aria-label="Cambiar tema" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-base">${isDark ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </header>
  `;
}

function toastHtml() {
  if (!state.toast) return '';
  return `
    <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg max-w-[90%]">
      ${state.toast}
    </div>
  `;
}

function render() {
  if (!store.data) return;
  app.innerHTML = `
    ${headerHtml()}
    <main class="flex-1">${viewHtml()}</main>
    ${navHtml()}
    ${renderModal()}
    ${toastHtml()}
  `;
}

function showToast(msg) {
  state.toast = msg;
  render();
  setTimeout(() => {
    state.toast = null;
    render();
  }, 2200);
}

// ---------- Acciones ----------

function shiftVisibleMonth(monthKey, delta) {
  const key = state.view === 'more'
    ? (state.moreView === 'budget' ? 'budgetMonth' : state.moreView === 'reports' ? 'reportsMonth' : null)
    : state.view === 'movements' ? 'month' : null;
  if (key) state[key] = shiftMonthKey(monthKey, delta);
  render();
}

function syncTxFormFromDom() {
  const modal = state.modal;
  if (!modal || modal.kind !== 'newTx') return;
  const val = (id) => document.getElementById(id)?.value;
  modal.form.description = val('tx-desc') ?? modal.form.description;
  modal.form.notes = val('tx-notes') ?? modal.form.notes;
  modal.form.amount = val('tx-amount') ?? modal.form.amount;
  modal.form.date = val('tx-date') ?? modal.form.date;
}

function saveTx() {
  const modal = state.modal;
  if (!modal || modal.kind !== 'newTx') return;
  syncTxFormFromDom();
  const f = modal.form;
  const data = store.data;
  const amt = parseAmount(f.amount);
  if (!amt) return showToast('Revisa el monto: debe ser mayor a cero');
  if (!f.description.trim()) return showToast('Escribe una descripción');
  const acc = data.accounts.find((a) => a.id === f.accountId) || data.accounts.find((a) => a.type !== 'credit' && a.active) || data.accounts[0];
  if (!acc) return showToast('Crea una cuenta primero');
  const isCardPurchase = f.type === 'expense' && f.isTdc && acc.type === 'credit';
  let cat = f.categoryId;
  if (f.type === 'income') cat = 'cat-ingreso';
  if (f.type === 'creditPayment') cat = 'cat-tdc-pago';
  if (f.type === 'transfer') cat = 'cat-otros';

  const input = {
    date: f.date || todayISO(),
    description: f.description.trim(),
    amount: amt,
    type: f.type,
    categoryId: cat,
    paymentMethod: f.paymentMethod,
    accountId: acc.id,
    fundId: f.fundId || undefined,
    toAccountId: f.type === 'transfer' ? f.toAccountId || undefined : undefined,
    isCreditCardPurchase: isCardPurchase,
    isPending: f.isPending,
    notes: f.notes?.trim() || undefined,
  };

  if (modal.id) {
    updateTransaction(modal.id, input);
    showToast('Movimiento actualizado');
  } else {
    addTransaction(input);
    showToast('Movimiento guardado');
  }
  state.modal = null;
  render();
}

function openConfirm(title, message, confirmAction, id) {
  state.modal = { kind: 'confirm', title, message, confirmAction, id };
  render();
}

function downloadExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mi-control-financiero-respaldo-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Respaldo exportado');
}

function onImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importJSON(String(reader.result));
      store.data = load();
      render();
      showToast('Respaldo importado');
    } catch (e) {
      showToast(e.message || 'El archivo no es un respaldo válido');
    }
  };
  reader.readAsText(file);
}

function handleAction(action, payload, el) {
  switch (action) {
    case 'nav':
      state.view = payload;
      if (payload === 'more' && !['menu', 'services', 'goals', 'budget', 'assets', 'reports', 'settings'].includes(state.moreView)) {
        state.moreView = 'menu';
      }
      setHash(payload);
      break;
    case 'goto':
      state.moreView = payload;
      state.view = 'more';
      setHash('more');
      break;
    case 'new-tx':
      state.modal = { kind: 'newTx', form: defaultTxForm() };
      render();
      break;
    case 'edit-tx':
      state.modal = { kind: 'newTx', id: el.dataset.id, form: defaultTxForm() };
      render();
      break;
    case 'tx-type':
      syncTxFormFromDom();
      state.modal.form.type = payload;
      render();
      break;
    case 'tx-category':
      syncTxFormFromDom();
      state.modal.form.categoryId = payload;
      render();
      break;
    case 'tx-method':
      syncTxFormFromDom();
      state.modal.form.paymentMethod = payload;
      render();
      break;
    case 'tx-account':
      syncTxFormFromDom();
      state.modal.form.accountId = payload;
      render();
      break;
    case 'tx-toaccount':
      syncTxFormFromDom();
      state.modal.form.toAccountId = payload;
      render();
      break;
    case 'tx-fund':
      syncTxFormFromDom();
      state.modal.form.fundId = state.modal.form.fundId === payload ? '' : payload;
      render();
      break;
    case 'tx-tdc':
      syncTxFormFromDom();
      state.modal.form.isTdc = !state.modal.form.isTdc;
      render();
      break;
    case 'tx-pending':
      syncTxFormFromDom();
      state.modal.form.isPending = !state.modal.form.isPending;
      render();
      break;
    case 'tx-save':
      saveTx();
      break;
    case 'tx-delete':
      openConfirm('Borrar movimiento', `¿Borrar "${store.data.transactions.find((t) => t.id === el.dataset.id)?.description}"?`, 'confirm-delete-tx', el.dataset.id);
      break;
    case 'confirm-delete-tx':
      deleteTransaction(el.dataset.id);
      state.modal = null;
      showToast('Movimiento borrado');
      render();
      break;
    case 'modal-close':
      state.modal = null;
      render();
      break;
    case 'modal-backdrop':
      state.modal = null;
      render();
      break;
    case 'month-prev':
      shiftVisibleMonth(payload, -1);
      break;
    case 'month-next':
      shiftVisibleMonth(payload, 1);
      break;
    case 'filter-type':
      state.typeFilter = payload;
      render();
      break;
    case 'fund-move':
      state.modal = { kind: 'fundMove', fundId: el.dataset.id, op: el.dataset.op };
      render();
      break;
    case 'fund-move-save': {
      const amt = parseAmount(document.getElementById('modal-amount')?.value);
      if (!amt) return showToast('Monto inválido');
      const op = state.modal.op;
      fundMovement(state.modal.fundId, amt, op);
      state.modal = null;
      showToast(op === 'withdraw' ? 'Retiro aplicado' : 'Ingreso aplicado');
      render();
      break;
    }
    case 'fund-edit':
      state.modal = { kind: 'editFund', fundId: el.dataset.id };
      render();
      break;
    case 'fund-edit-save': {
      const target = parseAmount(document.getElementById('modal-target')?.value);
      const fund = store.data.funds.find((f) => f.id === state.modal.fundId);
      if (fund) updateCollection('funds', { ...fund, targetAmount: target || undefined, purpose: document.getElementById('modal-purpose')?.value || undefined });
      state.modal = null;
      render();
      break;
    }
    case 'goal-edit':
      state.modal = { kind: 'editGoal', goalId: el.dataset.id };
      render();
      break;
    case 'goal-save': {
      const target = parseAmount(document.getElementById('modal-target')?.value);
      const current = parseAmount(document.getElementById('modal-current')?.value);
      const g = store.data.goals.find((x) => x.id === state.modal.goalId);
      if (g) updateCollection('goals', { ...g, targetAmount: target ?? g.targetAmount, currentAmount: current ?? g.currentAmount });
      state.modal = null;
      render();
      break;
    }
    case 'service-toggle': {
      const s = store.data.services.find((x) => x.id === el.dataset.id);
      if (s) updateCollection('services', { ...s, active: !s.active });
      break;
    }
    case 'service-edit':
      state.modal = { kind: 'editService', serviceId: el.dataset.id };
      render();
      break;
    case 'service-save': {
      const expected = parseAmount(document.getElementById('modal-expected')?.value);
      const dueDayRaw = parseInt(document.getElementById('modal-dueday')?.value, 10);
      const s = store.data.services.find((x) => x.id === state.modal.serviceId);
      if (s) updateCollection('services', {
        ...s,
        expectedMonthlyAmount: expected ?? s.expectedMonthlyAmount,
        dueDay: Number.isFinite(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 28 ? dueDayRaw : undefined,
        notes: document.getElementById('modal-notes')?.value || undefined,
      });
      state.modal = null;
      render();
      break;
    }
    case 'budget-edit':
      state.modal = { kind: 'editBudget', budgetId: el.dataset.id };
      render();
      break;
    case 'budget-save': {
      const planned = parseAmount(document.getElementById('modal-planned')?.value);
      const b = store.data.budgets.find((x) => x.id === state.modal.budgetId);
      if (b && planned !== null) updateCollection('budgets', { ...b, plannedAmount: planned });
      state.modal = null;
      render();
      break;
    }
    case 'asset-add':
      state.modal = { kind: 'asset', kind2: el.dataset.kind };
      render();
      break;
    case 'asset-edit':
      state.modal = { kind: 'asset', kind2: el.dataset.kind, id: el.dataset.id };
      render();
      break;
    case 'asset-delete': {
      const col = el.dataset.kind === 'asset' ? 'assets' : 'liabilities';
      const item = store.data[col].find((x) => x.id === el.dataset.id);
      openConfirm('Borrar', `¿Borrar "${item?.name}"?`, 'confirm-delete-asset', el.dataset.id);
      state.modal._col = col;
      break;
    }
    case 'confirm-delete-asset':
      removeFromCollection(state.modal._col, el.dataset.id);
      state.modal = null;
      showToast('Borrado');
      render();
      break;
    case 'asset-save': {
      const name = document.getElementById('modal-name')?.value?.trim();
      const value = parseAmount(document.getElementById('modal-value')?.value);
      if (!name) return showToast('Escribe un nombre');
      if (value === null) return showToast('Valor inválido');
      const kind = state.modal.kind2;
      const col = kind === 'asset' ? 'assets' : 'liabilities';
      const existing = state.modal.id ? store.data[col].find((x) => x.id === state.modal.id) : null;
      const type = document.getElementById('modal-type')?.value?.trim() || (kind === 'asset' ? 'Otro' : 'Préstamo');
      const notes = document.getElementById('modal-notes')?.value?.trim() || undefined;
      if (existing) {
        updateCollection(col, kind === 'asset'
          ? { ...existing, name, estimatedValue: value, type, notes }
          : { ...existing, name, outstandingBalance: value, type, notes });
      } else {
        updateCollection(col, kind === 'asset'
          ? { id: `as-${Date.now()}`, name, estimatedValue: value, type, notes }
          : { id: `li-${Date.now()}`, name, outstandingBalance: value, type, notes });
      }
      state.modal = null;
      render();
      break;
    }
    case 'account-edit':
      state.modal = { kind: 'editAccount', accountId: el.dataset.id };
      render();
      break;
    case 'account-save': {
      const name = document.getElementById('modal-name')?.value?.trim();
      const balance = parseAmount(document.getElementById('modal-balance')?.value);
      const a = store.data.accounts.find((x) => x.id === state.modal.accountId);
      if (a) updateCollection('accounts', { ...a, name: name || a.name, balance: balance ?? a.balance });
      state.modal = null;
      render();
      break;
    }
    case 'card-edit':
      state.modal = { kind: 'editCard' };
      render();
      break;
    case 'card-save': {
      const cut = parseInt(document.getElementById('modal-cutday')?.value, 10);
      const limit = parseAmount(document.getElementById('modal-limit')?.value);
      const c = store.data.creditCards.find((x) => x.active) || store.data.creditCards[0];
      if (c) updateCollection('creditCards', {
        ...c,
        cutDay: Number.isFinite(cut) && cut >= 1 && cut <= 28 ? cut : c.cutDay,
        creditLimit: limit ?? c.creditLimit,
        availableCredit: limit ? limit - c.currentBalance : c.availableCredit,
      });
      state.modal = null;
      render();
      break;
    }
    case 'edit-income':
      state.modal = { kind: 'editIncome' };
      render();
      break;
    case 'income-save': {
      const v = parseAmount(document.getElementById('modal-income')?.value);
      updateSettings({ monthlyIncome: v ?? undefined });
      state.modal = null;
      render();
      break;
    }
    case 'category-toggle': {
      const c = store.data.categories.find((x) => x.id === el.dataset.id);
      if (c) updateCollection('categories', { ...c, active: !c.active });
      break;
    }
    case 'export-json':
      downloadExport();
      break;
    case 'import-json': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => input.files?.[0] && onImportFile(input.files[0]);
      input.click();
      break;
    }
    case 'reset-data':
      openConfirm('Restablecer datos', 'Se borrarán todos tus datos y volverán los iniciales. Esta acción no se puede deshacer.', 'confirm-reset');
      break;
    case 'confirm-reset':
      store.data = resetData();
      state.modal = null;
      showToast('Datos restablecidos');
      render();
      break;
    case 'toggle-theme':
      isDark = !isDark;
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      render();
      break;
    default:
      break;
  }
}

function defaultTxForm() {
  const data = store.data;
  const acc = data.accounts.find((a) => a.type !== 'credit' && a.active) || data.accounts[0];
  return {
    type: 'expense',
    date: todayISO(),
    description: '',
    amount: '',
    categoryId: 'cat-despensa',
    paymentMethod: 'Tarjeta',
    accountId: acc?.id || '',
    toAccountId: '',
    fundId: '',
    isTdc: false,
    isPending: false,
    notes: '',
  };
}

// ---------- Eventos ----------

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  // El fondo del modal contiene al contenido: un clic en un campo/input
  // del modal no debe cerrarlo. Solo cierra cuando el clic ES el fondo.
  if (shouldIgnoreBackdropClick(e.target, btn)) return;
  e.preventDefault();
  handleAction(btn.dataset.action, btn.dataset.payload, btn);
});

app.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'search-input') {
    state.query = el.value;
    const list = document.getElementById('movements-list');
    if (list) {
      // Re-render solo la lista para no perder el foco del input
      const data = store.data;
      const catName = (id) => data.categories.find((c) => c.id === id)?.name || '—';
      const q = state.query.trim().toLowerCase();
      const filtered = data.transactions
        .filter((t) => t.date.startsWith(state.month))
        .filter((t) => state.typeFilter === 'all' || t.type === state.typeFilter)
        .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.merchant || '').toLowerCase().includes(q))
        .sort((a, b) => b.date.localeCompare(a.date));
      list.innerHTML = filtered.length === 0
        ? emptyHtml('Sin movimientos para este filtro')
        : filtered.map((t) => txRow(t, catName(t.categoryId))).join('');
    }
  }
});

app.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'tx-date') {
    const modal = state.modal;
    if (modal && modal.kind === 'newTx') {
      modal.form.date = el.value;
      render();
    }
  }
});

// ---------- PWA: registro del service worker ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => console.log('PWA lista: instalable y offline'))
      .catch((e) => console.warn('Service worker no registrado', e));
  });
}

// ---------- Arranque ----------

window.addEventListener('hashchange', () => {
  parseHash();
  render();
});

store.data = load();
parseHash();
render();
bootstrapFromFile().then(() => {
  store.data = load();
  render();
});
subscribe((data) => {
  store.data = data;
  render();
});
