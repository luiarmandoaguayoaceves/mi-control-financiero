// Render de modales (nuevo/editar movimiento, apartados, metas, confirmación…).
import { store, state } from './appState.js';
import { esc, chip, chipRow, inputField, searchSelect, switchRow } from '../ui.js';
import { todayISO, money } from '../format.js';
import { CATEGORY_IDS, PAYMENT_METHODS, TRANSACTION_TYPE_LABELS } from '../models.js';

function modalShell(inner) {
  return `
    <div class="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center" data-action="modal-backdrop">
      <div id="modal-sheet" class="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl px-5 pt-3 pb-5 overflow-y-auto overscroll-contain">
        <div class="mx-auto w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mb-4"></div>
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

function moneyModal(kind, title, fields, submitLabel, saveAction, footer = '') {
  return modalShell(`
    ${modalHeader(title)}
    ${fields.map((f) => `<div class="mb-3">${inputField(f.id, f.label, f.opts || {})}</div>`).join('')}
    <button data-action="${saveAction}" class="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">${submitLabel}</button>
    ${footer}
  `);
}

/** Chips de "dinero protegido" para el formulario de apartados. */
function protectedChips(isProtected) {
  return `
    <div class="mt-1">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">¿Dinero protegido?</div>
      ${chipRow([
        chip('Protegido', { selected: isProtected, action: 'fund-protected', payload: '1' }),
        chip('No protegido', { selected: !isProtected, action: 'fund-protected', payload: '0' }),
      ])}
      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Protegido = no se toca salvo emergencia (renta, servicios, mensualidades).</p>
    </div>
  `;
}

// ---------- Formulario de movimiento ----------

export function renderNewTxModal() {
  const data = store.data;
  const modal = state.modal;
  const editing = modal.id ? data.transactions.find((t) => t.id === modal.id) : undefined;
  const cards = data.creditCards.filter((c) => c.active);
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
    isMsi: editing?.isMsi || false,
    msiMonths: '',
    msiMonthly: '',
    cardId: editing?.cardId || cards[0]?.id || '',
    notes: editing?.notes || '',
  };

  const accounts = data.accounts.filter((a) => a.active && a.type !== 'credit');
  const categories = data.categories.filter((c) => c.active);
  const expenseCategories = categories.filter((c) => c.group !== 'Ingreso');
  const funds = data.funds.filter((f) => f.active);
  const tdcEnabled = form.type === 'expense' && cards.length > 0;
  const selectedCard = cards.find((c) => c.id === form.cardId) || cards[0];

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
        ${searchSelect({
          id: 'tx-cat',
          options: form.type === 'expense' ? expenseCategories : categories,
          value: form.categoryId,
          action: 'tx-category',
          placeholder: 'Buscar categoría…',
        })}
      </div>
    ` : ''}

    ${tdcEnabled ? `
      ${switchRow({
        label: 'Compra con tarjeta de crédito',
        sub: selectedCard?.name || '',
        action: 'tx-tdc',
        on: form.isTdc,
      })}
      ${form.isTdc ? `
        <div class="mt-3">
          <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">¿Con qué tarjeta?</div>
          ${chipRow(cards.map((c) => chip(c.name, { selected: form.cardId === c.id || (!form.cardId && c.id === cards[0].id), action: 'tx-card', payload: c.id })))}
        </div>
        ${switchRow({
          label: 'Es a meses (MSI)',
          sub: 'Solo se paga la mensualidad, no el total en la fecha de corte',
          action: 'tx-msi',
          on: form.isMsi,
        })}
        ${form.isMsi ? `
          <div class="grid grid-cols-2 gap-2 mt-3">
            <div>${inputField('tx-msi-monthly', 'Mensualidad ($)', { type: 'number', value: form.msiMonthly, inputmode: 'decimal', placeholder: '0.00' })}</div>
            <div>${inputField('tx-msi-months', 'Meses', { type: 'number', value: form.msiMonths, inputmode: 'numeric', placeholder: '12' })}</div>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Se registra en Tarjeta → Compras a MSI para que solo cuente la mensualidad del mes.</p>
        ` : ''}
      ` : ''}
    ` : ''}

    ${form.type === 'creditPayment' ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">¿Qué tarjeta pagas?</div>
        ${chipRow(cards.map((c) => chip(c.name, { selected: form.cardId === c.id || (!form.cardId && c.id === cards[0].id), action: 'tx-card', payload: c.id })))}
      </div>
    ` : ''}

    <div class="mt-3">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Método de pago</div>
      ${chipRow(PAYMENT_METHODS.map((m) => chip(m, { selected: form.paymentMethod === m, action: 'tx-method', payload: m })))}
    </div>

    <div class="mt-3">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">${form.type === 'creditPayment' ? 'Cuenta de donde sale el pago' : 'Cuenta'}</div>
      ${chipRow(accounts.map((a) => chip(a.name, { selected: form.accountId === a.id, action: 'tx-account', payload: a.id })))}
    </div>

    ${form.type === 'transfer' ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cuenta destino</div>
        ${chipRow(accounts.map((a) => chip(a.name, { selected: form.toAccountId === a.id, action: 'tx-toaccount', payload: a.id })))}
      </div>
    ` : ''}

    ${form.type === 'income' && funds.length > 0 ? `
      <div class="mt-3">
        <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Apartado destino (opcional)</div>
        ${chipRow(funds.map((f) => chip(f.name, { selected: form.fundId === f.id, action: 'tx-fund', payload: f.id })))}
      </div>
    ` : ''}

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

    case 'newFund': {
      const isProtected = modal.isProtected === true;
      return modalShell(`
        ${modalHeader('Nuevo apartado', 'Renta, servicios, mensualidades, lo que quieras separar')}
        <div class="mb-3">${inputField('fund-name', 'Nombre', { placeholder: 'Ej. Renta, Servicios, Tenis nuevos' })}</div>
        <div class="mb-3">${inputField('fund-initial', 'Monto inicial ($) — opcional', { type: 'number', inputmode: 'decimal', placeholder: '0.00' })}</div>
        <div class="mb-3">${inputField('fund-target', 'Meta ($) — opcional', { type: 'number', inputmode: 'decimal', placeholder: '0.00' })}</div>
        <div class="mb-3">${inputField('fund-purpose', 'Propósito — opcional', { placeholder: 'Para qué es este dinero' })}</div>
        ${protectedChips(isProtected)}
        <button data-action="fund-save" class="w-full mt-4 bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">Crear apartado</button>
      `);
    }

    case 'editFund': {
      const fund = data.funds.find((f) => f.id === modal.fundId);
      const isProtected = modal.isProtected === undefined ? !!fund?.protected : modal.isProtected;
      return modalShell(`
        ${modalHeader(`Editar: ${fund?.name || 'apartado'}`)}
        <div class="mb-3">${inputField('fund-name', 'Nombre', { value: fund?.name || '' })}</div>
        <div class="mb-3">${inputField('fund-target', 'Monto meta (vacío = sin meta)', { type: 'number', inputmode: 'decimal', value: fund?.targetAmount ? String(fund.targetAmount) : '' })}</div>
        <div class="mb-3">${inputField('fund-purpose', 'Propósito', { value: fund?.purpose || '' })}</div>
        ${protectedChips(isProtected)}
        <button data-action="fund-edit-save" class="w-full mt-4 bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">Guardar cambios</button>
        <button data-action="fund-delete" data-id="${fund?.id || ''}" class="w-full mt-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-xl py-3">Borrar apartado</button>
      `);
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
      const c = modal.cardId ? data.creditCards.find((x) => x.id === modal.cardId) : null;
      return modalShell(`
        ${modalHeader(c ? `Tarjeta: ${c.name}` : 'Nueva tarjeta', 'Datos y fechas para tus recordatorios')}
        <div class="mb-3">${inputField('card-name', 'Nombre', { value: c?.name || '', placeholder: 'Ej. Tarjeta Nu' })}</div>
        <div class="mb-3">${inputField('card-bank', 'Banco / emisor', { value: c?.bank || '', placeholder: 'Nu, Mercado Pago, BBVA…' })}</div>
        <div class="mb-3">${inputField('card-limit', 'Línea de crédito ($)', { type: 'number', inputmode: 'decimal', value: c ? String(c.creditLimit) : '', placeholder: '0.00' })}</div>
        <div class="grid grid-cols-2 gap-2">
          <div>${inputField('card-cutday', 'Día de corte', { type: 'number', inputmode: 'numeric', value: c?.cutDay ? String(c.cutDay) : '', placeholder: '1-28' })}</div>
          <div>${inputField('card-dueday', 'Día límite de pago', { type: 'number', inputmode: 'numeric', value: c?.paymentDueDay ? String(c.paymentDueDay) : '', placeholder: '1-28' })}</div>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Ejemplo Nu: corte el día 5 y pago el 25. Si tu fecha límite cae el mes siguiente al corte, pon el día real (p. ej. 2).
        </p>
        <button data-action="card-save" data-id="${c?.id || ''}" class="w-full mt-4 bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98]">
          ${c ? 'Guardar tarjeta' : 'Crear tarjeta'}
        </button>
        ${c && data.creditCards.length > 1 ? `
          <button data-action="card-delete" data-id="${c.id}" class="w-full mt-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-xl py-3">
            Borrar tarjeta
          </button>
        ` : ''}
      `);
    }

    case 'msi': {
      const existing = modal.id ? data.installmentPurchases.find((x) => x.id === modal.id) : undefined;
      const paid = existing ? Math.max(0, (existing.currentPaymentNumber || 1) - 1) : 0;
      return moneyModal('msi', existing ? 'Editar compra MSI' : 'Nueva compra a MSI', [
        { id: 'msi-desc', label: 'Producto', opts: { value: existing?.description || '', placeholder: 'Ej. Refrigerador Walmart' } },
        { id: 'msi-monthly', label: 'Mensualidad ($)', opts: { type: 'number', inputmode: 'decimal', value: existing ? String(existing.monthlyPayment) : '' } },
        { id: 'msi-months', label: 'Plazo total (meses)', opts: { type: 'number', value: existing ? String(existing.totalMonths) : '' } },
        { id: 'msi-paid', label: 'Mensualidades ya pagadas', opts: { type: 'number', value: String(paid), placeholder: '0' } },
        { id: 'msi-interest', label: 'Interés % (0 = MSI)', opts: { type: 'number', value: existing ? String(existing.interestRate ?? 0) : '0' } },
      ], existing ? 'Guardar cambios' : 'Guardar compra', 'msi-save',
        existing ? `<button data-action="msi-delete" data-id="${existing.id}" class="w-full mt-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-xl py-3">Borrar compra MSI</button>` : '');
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
