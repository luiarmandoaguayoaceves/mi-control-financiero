// Render de modales (nuevo/editar movimiento, apartados, metas, confirmación…).
import { store, state } from './appState.js';
import { esc, chip, chipRow, inputField } from '../ui.js';
import { todayISO, money } from '../format.js';
import { CATEGORY_IDS, PAYMENT_METHODS, TRANSACTION_TYPE_LABELS } from '../models.js';

function modalShell(inner) {
  return `
    <div class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" data-action="modal-backdrop">
      <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90dvh] overflow-y-auto">
        ${inner}
      </div>
    </div>
  `;
}

function modalHeader(title, sub = '') {
  return `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">${esc(title)}</h3>
        ${sub ? `<p class="text-xs text-slate-500 dark:text-slate-400">${esc(sub)}</p>` : ''}
      </div>
      <button data-action="modal-close" class="text-slate-400 text-2xl leading-none px-2" aria-label="Cerrar">×</button>
    </div>
  `;
}

function moneyModal(kind, title, fields, submitLabel, saveAction) {
  return modalShell(`
    ${modalHeader(title)}
    ${fields.map((f) => `<div class="mb-3">${inputField(f.id, f.label, f.opts || {})}</div>`).join('')}
    <button data-action="${saveAction}" class="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">${submitLabel}</button>
  `);
}

// ---------- Formulario de movimiento ----------

export function renderNewTxModal() {
  const data = store.data;
  const modal = state.modal;
  const editing = modal.id ? data.transactions.find((t) => t.id === modal.id) : undefined;
  const form = modal.form || {
    type: editing?.type || 'expense',
    date: editing?.date || todayISO(),
    description: editing?.description || '',
    amount: editing ? String(editing.amount) : '',
    categoryId: editing?.categoryId || CATEGORY_IDS.despensa,
    paymentMethod: editing?.paymentMethod || PAYMENT_METHODS[0],
    accountId: editing?.accountId || '',
    toAccountId: editing?.toAccountId || '',
    fundId: editing?.fundId || '',
    isTdc: editing?.isCreditCardPurchase || false,
    isPending: editing?.isPending || false,
    notes: editing?.notes || '',
  };

  const accounts = data.accounts.filter((a) => a.active);
  const debitAccounts = accounts.filter((a) => a.type !== 'credit');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const categories = data.categories.filter((c) => c.active);
  const expenseCategories = categories.filter((c) => c.group !== 'Ingreso');
  const funds = data.funds.filter((f) => f.active);
  const tdcEnabled = form.type === 'expense' && creditAccounts.length > 0;
  const showAccount = form.type !== 'transfer' ? accounts : debitAccounts;

  const types = ['expense', 'income', 'transfer', 'creditPayment'];

  return modalShell(`
    ${modalHeader(editing ? 'Editar movimiento' : 'Nuevo movimiento')}

    ${chipRow(types.map((t) => chip(TRANSACTION_TYPE_LABELS[t], { selected: form.type === t, action: 'tx-type', payload: t })))}

    <div class="grid grid-cols-2 gap-2 mt-3">
      <div>${inputField('tx-date', 'Fecha', { type: 'date', value: form.date })}</div>
      <div>${inputField('tx-amount', 'Monto ($)', { type: 'number', value: form.amount, inputmode: 'decimal', placeholder: '0.00' })}</div>
    </div>
    <div class="mt-3">${inputField('tx-desc', 'Descripción', { value: form.description, placeholder: 'Ej. Despensa semanal' })}</div>

    ${form.type === 'expense' || form.type === 'income' ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Categoría</div>
        ${chipRow((form.type === 'expense' ? expenseCategories : categories).map((c) => chip(c.name, { selected: form.categoryId === c.id, action: 'tx-category', payload: c.id })))}
      </div>
    ` : ''}

    <div class="mt-3">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Método de pago</div>
      ${chipRow(PAYMENT_METHODS.map((m) => chip(m, { selected: form.paymentMethod === m, action: 'tx-method', payload: m })))}
    </div>

    <div class="mt-3">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cuenta</div>
      ${chipRow(showAccount.map((a) => chip(a.name, { selected: form.accountId === a.id, action: 'tx-account', payload: a.id })))}
    </div>

    ${form.type === 'transfer' ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cuenta destino</div>
        ${chipRow(debitAccounts.map((a) => chip(a.name, { selected: form.toAccountId === a.id, action: 'tx-toaccount', payload: a.id })))}
      </div>
    ` : ''}

    ${tdcEnabled ? `
      <button data-action="tx-tdc" class="w-full mt-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
        <span class="text-left">
          <span class="block text-sm font-semibold text-slate-900 dark:text-slate-100">Compra con tarjeta de crédito</span>
          <span class="block text-[11px] text-slate-500 dark:text-slate-400">Se suma al respaldo TDC (debe cubrirse con efectivo)</span>
        </span>
        <span class="w-11 h-6 rounded-full p-0.5 ${form.isTdc ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
          <span class="block w-5 h-5 bg-white rounded-full transition ${form.isTdc ? 'ml-auto' : ''}"></span>
        </span>
      </button>
    ` : ''}

    ${form.type === 'income' && funds.length > 0 ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Apartado destino (opcional)</div>
        ${chipRow(funds.map((f) => chip(f.name, { selected: form.fundId === f.id, action: 'tx-fund', payload: f.id })))}
      </div>
    ` : ''}

    <button data-action="tx-pending" class="w-full mt-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5">
      <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Pendiente</span>
      <span class="w-11 h-6 rounded-full p-0.5 ${form.isPending ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}">
        <span class="block w-5 h-5 bg-white rounded-full transition ${form.isPending ? 'ml-auto' : ''}"></span>
      </span>
    </button>

    <div class="mt-3">${inputField('tx-notes', 'Notas (opcional)', { value: form.notes, rows: 2 })}</div>

    <button data-action="tx-save" class="w-full mt-4 bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">
      ${editing ? 'Guardar cambios' : 'Guardar movimiento'}
    </button>
    ${editing ? `<button data-action="tx-delete" data-id="${editing.id}" class="w-full mt-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-xl py-3">Borrar movimiento</button>` : ''}
  `);
}

// ---------- Otros modales ----------

export function renderModal() {
  const modal = state.modal;
  if (!modal) return '';
  const data = store.data;

  switch (modal.kind) {
    case 'newTx':
      return renderNewTxModal();

    case 'fundMove': {
      const fund = data.funds.find((f) => f.id === modal.fundId);
      return moneyModal('fundMove', `${modal.op === 'deposit' ? 'Ingresar a' : 'Retirar de'} ${fund?.name || ''}`, [
        { id: 'modal-amount', label: 'Monto ($)', opts: { type: 'number', inputmode: 'decimal', placeholder: '0.00' } },
      ], modal.op === 'deposit' ? 'Ingresar' : 'Retirar', 'fund-move-save');
    }

    case 'editFund': {
      const fund = data.funds.find((f) => f.id === modal.fundId);
      return moneyModal('editFund', `Meta: ${fund?.name || ''}`, [
        { id: 'modal-target', label: 'Monto meta (vacío = sin meta)', opts: { type: 'number', inputmode: 'decimal', value: fund?.targetAmount ? String(fund.targetAmount) : '' } },
        { id: 'modal-purpose', label: 'Propósito', opts: { value: fund?.purpose || '' } },
      ], 'Guardar', 'fund-edit-save');
    }

    case 'editGoal': {
      const g = data.goals.find((x) => x.id === modal.goalId);
      return moneyModal('editGoal', `Meta: ${g?.name || ''}`, [
        { id: 'modal-target', label: 'Monto meta ($)', opts: { type: 'number', inputmode: 'decimal', value: g ? String(g.targetAmount) : '' } },
        { id: 'modal-current', label: 'Avance actual ($)', opts: { type: 'number', inputmode: 'decimal', value: g ? String(g.currentAmount) : '' } },
      ], 'Guardar', 'goal-save');
    }

    case 'editService': {
      const s = data.services.find((x) => x.id === modal.serviceId);
      return moneyModal('editService', `Editar: ${s?.name || ''}`, [
        { id: 'modal-expected', label: 'Monto mensual ($)', opts: { type: 'number', inputmode: 'decimal', value: s ? String(s.expectedMonthlyAmount) : '' } },
        { id: 'modal-dueday', label: 'Día de cobro (1-28, vacío = ninguno)', opts: { type: 'number', value: s?.dueDay ? String(s.dueDay) : '' } },
        { id: 'modal-notes', label: 'Notas', opts: { value: s?.notes || '', rows: 2 } },
      ], 'Guardar', 'service-save');
    }

    case 'editBudget': {
      const b = data.budgets.find((x) => x.id === modal.budgetId);
      const catName = data.categories.find((c) => c.id === b?.categoryId)?.name || '';
      return moneyModal('editBudget', `Presupuesto: ${catName}`, [
        { id: 'modal-planned', label: 'Monto planeado ($)', opts: { type: 'number', inputmode: 'decimal', value: b ? String(b.plannedAmount) : '' } },
      ], 'Guardar', 'budget-save');
    }

    case 'asset': {
      const kind = modal.kind2; // 'asset' | 'liability'
      const existing = modal.id
        ? (kind === 'asset' ? data.assets : data.liabilities).find((x) => x.id === modal.id)
        : undefined;
      const title = kind === 'asset'
        ? (existing ? 'Editar activo' : 'Nuevo activo')
        : (existing ? 'Editar pasivo' : 'Nuevo pasivo');
      const valueField = kind === 'asset' ? 'Valor estimado ($)' : 'Saldo ($)';
      const valueKey = kind === 'asset' ? 'estimatedValue' : 'outstandingBalance';
      return moneyModal('asset', title, [
        { id: 'modal-name', label: 'Nombre', opts: { value: existing?.name || '', placeholder: 'Ej. KTM RC 200' } },
        { id: 'modal-value', label: valueField, opts: { type: 'number', inputmode: 'decimal', value: existing ? String(existing[valueKey]) : '' } },
        { id: 'modal-type', label: 'Tipo', opts: { value: existing?.type || '', placeholder: 'Vehículo, efectivo, inversión…' } },
        { id: 'modal-notes', label: 'Notas', opts: { value: existing?.notes || '', rows: 2 } },
      ], 'Guardar', 'asset-save');
    }

    case 'editAccount': {
      const a = data.accounts.find((x) => x.id === modal.accountId);
      return moneyModal('editAccount', `Cuenta: ${a?.name || ''}`, [
        { id: 'modal-name', label: 'Nombre', opts: { value: a?.name || '' } },
        { id: 'modal-balance', label: 'Saldo ($)', opts: { type: 'number', inputmode: 'decimal', value: a ? String(a.balance) : '' } },
      ], 'Guardar', 'account-save');
    }

    case 'editCard': {
      const c = data.creditCards.find((x) => x.active) || data.creditCards[0];
      return moneyModal('editCard', 'Editar tarjeta', [
        { id: 'modal-cutday', label: 'Día de corte (1-28)', opts: { type: 'number', value: c ? String(c.cutDay) : '' } },
        { id: 'modal-limit', label: 'Línea de crédito ($)', opts: { type: 'number', inputmode: 'decimal', value: c ? String(c.creditLimit) : '' } },
      ], 'Guardar', 'card-save');
    }

    case 'editIncome':
      return moneyModal('editIncome', 'Ingreso mensual estimado', [
        { id: 'modal-income', label: 'Monto ($)', opts: { type: 'number', inputmode: 'decimal', value: data.settings.monthlyIncome ? String(data.settings.monthlyIncome) : '' } },
      ], 'Guardar', 'income-save');

    case 'installHelp':
      return modalShell(`
        ${modalHeader('Instalar la app')}
        <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p class="mb-2"><b>Android (Chrome):</b> toca el menú ⋮ arriba a la derecha → <b>Instalar aplicación</b> (o "Agregar a pantalla de inicio").</p>
          <p class="mb-2"><b>iPhone/iPad (Safari):</b> botón Compartir → <b>Agregar a pantalla de inicio</b>.</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Si no ves la opción, recarga la página una vez más y espera unos segundos: el navegador habilita la instalación normalmente en la segunda visita.</p>
        </div>
        <button data-action="modal-close" class="w-full mt-4 bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">Entendido</button>
      `);

    case 'confirm':
      return modalShell(`
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">${esc(modal.title)}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">${esc(modal.message)}</p>
        <div class="flex gap-2">
          <button data-action="modal-close" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl py-3">Cancelar</button>
          <button data-action="${modal.confirmAction}" data-id="${modal.id || ''}" class="flex-1 bg-red-600 text-white font-bold rounded-xl py-3">Borrar</button>
        </div>
      `);

    default:
      return '';
  }
}
