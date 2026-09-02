// ============================================================
// Helpers de render (HTML con Tailwind). Todas devuelven strings.
// Convención: elementos interactivos llevan data-action + data-*;
// app.js se encarga del event delegation.
// ============================================================

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Un clic que "sube" desde el contenido de un modal hasta el fondo
 * (data-action="modal-backdrop") NO debe cerrar el modal: solo lo cierra
 * un clic directo sobre el fondo. Devuelve true cuando hay que ignorarlo.
 */
export function shouldIgnoreBackdropClick(target, btn) {
  return btn.dataset?.action === 'modal-backdrop' && target !== btn;
}

/**
 * Decide si mostrar el aviso de instalación PWA.
 * - Oculto si ya se descartó o ya está instalada como standalone.
 * - En Android/desktop SIEMPRE visible (aunque Chrome aún no dispare
 *   beforeinstallprompt): con evento -> instalación directa (canPrompt),
 *   sin evento -> al tocar muestra instrucciones.
 * - iOS Safari (sin evento) -> instrucciones de "Agregar a pantalla de inicio".
 */
export function installPromptState({ deferred = false, hidden = false, standalone = false, isIOS = false } = {}) {
  if (hidden || standalone) return { showButton: false, showIosHint: false, canPrompt: false };
  if (isIOS) return { showButton: false, showIosHint: true, canPrompt: false };
  return { showButton: true, showIosHint: false, canPrompt: deferred };
}

export function installBannerHtml({ showButton = false, showIosHint = false, canPrompt = false } = {}) {
  if (!showButton && !showIosHint) return '';
  const body = showButton
    ? `<div class="flex-1">
         <div class="text-sm font-bold">Instala Mi Control Financiero</div>
         <div class="text-xs opacity-80">Funciona offline, con su propio icono</div>
       </div>
       <button data-action="install-app" class="bg-white text-indigo-700 font-bold text-xs px-3 py-2 rounded-lg active:scale-95">${canPrompt ? 'Instalar' : 'Instalar app'}</button>`
    : `<div class="flex-1">
         <div class="text-sm font-bold">Instala Mi Control Financiero</div>
         <div class="text-xs opacity-80">En Safari: Compartir → "Agregar a pantalla de inicio"</div>
       </div>`;
  return `
    <div class="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
      ${body}
      <button data-action="dismiss-install" aria-label="Ocultar aviso" class="text-white/80 text-xl leading-none px-1">×</button>
    </div>
  `;
}

export function card(inner, extra = '') {
  return `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm ${extra}">${inner}</div>`;
}

export function section(title, inner, action = '') {
  return card(`
    <div class="flex items-center justify-between mb-3 gap-2">
      <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">${esc(title)}</h2>
      ${action}
    </div>
    ${inner}
  `);
}

const KPI_COLORS = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
  sky: 'text-sky-600 dark:text-sky-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  slate: 'text-slate-700 dark:text-slate-300',
};

export function kpi(label, value, { color = 'slate', sub = '', half = true } = {}) {
  const colorCls = KPI_COLORS[color] || KPI_COLORS.slate;
  return `
    <div class="${half ? 'flex-1 min-w-0' : 'w-full'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
      <div class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">${esc(label)}</div>
      <div class="text-lg font-bold truncate ${colorCls}">${value}</div>
      ${sub ? `<div class="text-xs text-slate-500 dark:text-slate-400 truncate">${sub}</div>` : ''}
    </div>
  `;
}

export function kpiGrid(items, cols = 2) {
  return `<div class="grid gap-3" style="grid-template-columns: repeat(${cols}, minmax(0,1fr))">${items.join('')}</div>`;
}

export function progress(value, color = 'bg-indigo-500', height = 'h-2') {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return `
    <div class="w-full bg-slate-200 dark:bg-slate-700 ${height} rounded-full overflow-hidden" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100">
      <div class="${color} h-full rounded-full transition-all" style="width:${v}%"></div>
    </div>
  `;
}

export function chip(label, { selected = false, action = '', payload = '' } = {}) {
  const base = selected
    ? 'bg-indigo-600 text-white border-indigo-600'
    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  const attrs = action ? `data-action="${action}" data-payload="${esc(payload)}"` : '';
  return `<button ${attrs} class="px-3 py-1.5 rounded-full text-xs font-semibold border ${base} active:scale-95 transition">${esc(label)}</button>`;
}

export function chipRow(chips) {
  return `<div class="flex flex-wrap gap-2">${chips.join('')}</div>`;
}

export function alert(message, tone = 'warning') {
  const tones = {
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  };
  return `<div role="alert" class="flex items-start gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${tones[tone] || tones.warning}">
    <span class="mt-0.5">●</span><span>${message}</span>
  </div>`;
}

export function empty(message, hint = '') {
  return `<div class="py-10 text-center text-slate-500 dark:text-slate-400">
    <div class="text-sm font-semibold">${esc(message)}</div>
    ${hint ? `<div class="text-xs mt-1">${esc(hint)}</div>` : ''}
  </div>`;
}

export function barChart(data, formatValue = (v) => String(v)) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return `
    <div class="flex flex-col gap-2" aria-label="Gráfica de barras">
      ${data
        .map(
          (d) => `
        <div class="flex items-center gap-2 text-xs">
          <span class="w-24 truncate text-slate-500 dark:text-slate-400">${esc(d.label)}</span>
          <div class="flex-1 h-3.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
            <div class="h-full rounded" style="width:${Math.max(3, (Math.abs(d.value) / max) * 100)}%;background:${d.color || '#6366F1'}"></div>
          </div>
          <span class="w-20 text-right font-semibold text-slate-700 dark:text-slate-200">${formatValue(d.value)}</span>
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

export function monthNav(monthKey, label) {
  return `
    <div class="flex items-center justify-center gap-6 mb-3">
      <button data-action="month-prev" data-payload="${monthKey}" class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 px-3" aria-label="Mes anterior">‹</button>
      <span class="text-base font-bold min-w-28 text-center text-slate-900 dark:text-slate-100">${label}</span>
      <button data-action="month-next" data-payload="${monthKey}" class="text-3xl font-bold text-indigo-600 dark:text-indigo-400 px-3" aria-label="Mes siguiente">›</button>
    </div>
  `;
}

export function txRow(tx, categoryName, action = 'edit-tx') {
  const isIncome = tx.type === 'income';
  const isNeutral = tx.type === 'transfer' || tx.type === 'creditPayment';
  const sign = isIncome ? '+' : isNeutral ? '' : '-';
  const color = isIncome
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNeutral
      ? 'text-slate-500 dark:text-slate-400'
      : 'text-slate-900 dark:text-slate-100';
  const labels = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', creditPayment: 'Pago TDC' };
  return `
    <button data-action="${action}" data-id="${tx.id}" class="w-full text-left py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 active:bg-slate-50 dark:active:bg-slate-800/50">
      <div class="flex justify-between items-center gap-2">
        <span class="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">${esc(tx.description)}</span>
        <span class="font-bold text-sm whitespace-nowrap ${color}">${sign}$${fmtNum(tx.amount)}</span>
      </div>
      <div class="flex justify-between items-center gap-2 mt-0.5">
        <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${esc(fmtDateShort(tx.date))} · ${esc(categoryName)}${tx.isPending ? ' · Pendiente' : ''}</span>
        <span class="text-[11px] text-slate-400 dark:text-slate-500">${labels[tx.type]}</span>
      </div>
    </button>
  `;
}

export function badge(text, cls = 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400') {
  return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}">${esc(text)}</span>`;
}

export function primaryBtn(label, action, payload = '') {
  return `<button data-action="${action}" data-payload="${esc(payload)}" class="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 active:scale-[0.98] transition">${esc(label)}</button>`;
}

export function inputField(id, label, { type = 'text', value = '', placeholder = '', inputmode = '', required = false, rows = 0 } = {}) {
  const input = rows
    ? `<textarea id="${id}" rows="${rows}" placeholder="${esc(placeholder)}" class="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">${esc(value)}</textarea>`
    : `<input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${inputmode ? `inputmode="${inputmode}"` : ''} ${required ? 'required' : ''} class="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />`;
  return `<label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1" for="${id}">${esc(label)}</label>${input}`;
}

function fmtNum(n) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDateShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
