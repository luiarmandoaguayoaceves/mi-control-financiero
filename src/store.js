// ============================================================
// Repositorio de datos: única puerta de escritura.
// Estrategia (sin backend, apta para Netlify):
//   1. data/app-data.json  -> JSON base versionado EN EL PROYECTO
//      (la app lo lee con fetch en el primer arranque)
//   2. localStorage        -> tus cambios en runtime (persistencia real)
//   3. src/seed.js         -> respaldo si no existe el archivo
// La pantalla Configuración exporta/importa JSON para mover datos
// entre el navegador y data/app-data.json.
// ============================================================
import { STORAGE_KEY, APP_DATA_VERSION } from './models.js';
import { buildSeedData } from './seed.js';
import { todayISO, toMonthKey, round2 } from './format.js';
import { availableBalance, protectedFundsTotal, totalCardDebt, msiPendingTotal, buildSnapshot } from './finance.js';

const listeners = new Set();
let cache = null;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(data) {
  cache = data;
  for (const fn of listeners) {
    try {
      fn(data);
    } catch (e) {
      console.warn('Error en listener', e);
    }
  }
}

function persist(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('No se pudo escribir en localStorage', e);
  }
  notify(data);
}

/**
 * Carga síncrona: localStorage (tus cambios) o, si está vacío,
 * el seed en memoria (aún sin persistir: bootstrap decide si la
 * base es data/app-data.json o el seed).
 */
export function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw);
      return cache;
    }
  } catch (e) {
    console.warn('Datos locales corruptos, se re-sembrará', e);
  }
  cache = buildSeedData();
  return cache;
}

/**
 * Primer arranque: si no hay datos locales, intenta leer el JSON del
 * proyecto (data/app-data.json). Si no existe, usa el seed.
 * Se llama una sola vez desde app.js.
 */
export async function bootstrapFromFile() {
  if (localStorage.getItem(STORAGE_KEY)) return; // ya hay datos locales
  try {
    const res = await fetch('data/app-data.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && Array.isArray(parsed.transactions)) {
        persist({ ...parsed, version: APP_DATA_VERSION });
        return;
      }
    }
  } catch (e) {
    // Sin archivo o sin red: usa el seed
  }
  persist(cache || buildSeedData());
}

function get() {
  return load();
}

// ---------- Efecto contable de una transacción ----------

function cardForAccount(data, accountId) {
  const acc = data.accounts.find((a) => a.id === accountId);
  if (!acc) return undefined;
  return (
    data.creditCards.find((c) => c.name === acc.name) ||
    data.creditCards.find((c) => c.active)
  );
}

/** Aplica el efecto contable de una transacción. sign: +1 aplicar, -1 revertir. */
export function applyTransactionToData(data, tx, sign) {
  const accounts = data.accounts.map((a) => ({ ...a }));
  const cards = data.creditCards.map((c) => ({ ...c }));
  const funds = data.funds.map((f) => ({ ...f }));
  const s = sign;
  const acc = accounts.find((a) => a.id === tx.accountId);

  const bumpAccount = (id, delta) => {
    const a = accounts.find((x) => x.id === id);
    if (a) a.balance = round2(a.balance + delta);
  };
  const bumpCard = (delta) => {
    const card = cardForAccount(data, tx.accountId);
    if (card) {
      const c = cards.find((x) => x.id === card.id);
      if (c) c.currentBalance = round2(Math.max(0, c.currentBalance + delta));
    }
  };
  const bumpFund = (id, delta) => {
    const f = funds.find((x) => x.id === id);
    if (f) f.currentAmount = round2(Math.max(0, f.currentAmount + delta));
  };

  switch (tx.type) {
    case 'income':
      if (acc && acc.type !== 'credit') bumpAccount(tx.accountId, tx.amount * s);
      if (tx.fundId) bumpFund(tx.fundId, tx.amount * s);
      break;
    case 'expense':
      if (tx.fundId) bumpFund(tx.fundId, -tx.amount * s);
      if (tx.isCreditCardPurchase && acc && acc.type === 'credit') {
        bumpCard(tx.amount * s);
      } else if (acc && acc.type !== 'credit') {
        bumpAccount(tx.accountId, -tx.amount * s);
      }
      break;
    case 'transfer':
      if (acc && acc.type !== 'credit') bumpAccount(tx.accountId, -tx.amount * s);
      if (tx.toAccountId && tx.toAccountId !== tx.accountId) {
        bumpAccount(tx.toAccountId, tx.amount * s);
      }
      if (tx.fundId) bumpFund(tx.fundId, tx.amount * s);
      break;
    case 'creditPayment':
      if (acc && acc.type !== 'credit') bumpAccount(tx.accountId, -tx.amount * s);
      bumpCard(-tx.amount * s);
      break;
  }

  for (const c of cards) {
    c.availableCredit = round2(Math.max(0, c.creditLimit - c.currentBalance));
  }

  return { ...data, accounts, creditCards: cards, funds };
}

// ---------- Acciones ----------

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Snapshot mensual automático (uno por mes). */
function ensureSnapshot(data) {
  const monthKey = toMonthKey(new Date());
  const hasMonth = data.snapshots.some((s) => toMonthKey(new Date(s.date + 'T00:00:00')) === monthKey);
  if (hasMonth) return data;
  const snapshot = buildSnapshot({
    date: todayISO(),
    cashAndAccounts: availableBalance(data.accounts),
    protectedFunds: protectedFundsTotal(data.funds),
    creditCardDebt: totalCardDebt(data.creditCards),
    installmentDebt: msiPendingTotal(data.installmentPurchases),
    assets: data.assets.reduce((a, x) => a + x.estimatedValue, 0),
    liabilities: data.liabilities.reduce((a, x) => a + x.outstandingBalance, 0),
  });
  return { ...data, snapshots: [...data.snapshots, snapshot] };
}

export function addTransaction(input) {
  const data = get();
  const now = new Date().toISOString();
  const tx = {
    ...input,
    id: newId('tx'),
    createdAt: now,
    updatedAt: now,
  };
  let next = applyTransactionToData(data, tx, 1);
  next = { ...next, transactions: [...next.transactions, tx] };
  next = ensureSnapshot(next);
  persist(next);
  return tx;
}

export function updateTransaction(id, input) {
  const data = get();
  const existing = data.transactions.find((t) => t.id === id);
  if (!existing) return;
  let next = applyTransactionToData(data, existing, -1);
  const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
  next = applyTransactionToData(next, updated, 1);
  next = {
    ...next,
    transactions: next.transactions.map((t) => (t.id === id ? updated : t)),
  };
  persist(next);
}

export function deleteTransaction(id) {
  const data = get();
  const existing = data.transactions.find((t) => t.id === id);
  if (!existing) return;
  const next = applyTransactionToData(data, existing, -1);
  persist({
    ...next,
    transactions: next.transactions.filter((t) => t.id !== id),
  });
}

export function fundMovement(fundId, amount, kind) {
  const data = get();
  const fund = data.funds.find((f) => f.id === fundId);
  if (!fund || amount <= 0) return;
  const signed = kind === 'deposit' ? amount : -amount;
  const funds = data.funds.map((f) =>
    f.id === fundId ? { ...f, currentAmount: round2(Math.max(0, f.currentAmount + signed)) } : f,
  );
  const now = new Date().toISOString();
  const acc = data.accounts.find((a) => a.type !== 'credit' && a.active);
  const tx = {
    id: newId('tx'),
    date: todayISO(),
    description: `${kind === 'deposit' ? 'Ingreso a' : 'Retiro de'} apartado: ${fund.name}`,
    amount,
    type: 'transfer',
    categoryId: data.categories[0]?.id || '',
    paymentMethod: 'Transferencia',
    accountId: acc?.id || '',
    fundId,
    isCreditCardPurchase: false,
    isPending: false,
    createdAt: now,
    updatedAt: now,
  };
  persist({ ...data, funds, transactions: [...data.transactions, tx] });
}

export function updateCollection(collection, item) {
  const data = get();
  const exists = data[collection].some((x) => x.id === item.id);
  persist({
    ...data,
    [collection]: exists
      ? data[collection].map((x) => (x.id === item.id ? item : x))
      : [...data[collection], item],
  });
}

export function removeFromCollection(collection, id) {
  const data = get();
  persist({ ...data, [collection]: data[collection].filter((x) => x.id !== id) });
}

export function updateSettings(settings) {
  const data = get();
  persist({ ...data, settings: { ...data.settings, ...settings } });
}

export function importJSON(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const data = parsed?.data && Array.isArray(parsed.data.transactions) ? parsed.data : parsed;
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error('El archivo no parece un respaldo válido de Mi Control Financiero');
  }
  const cleaned = { ...data, version: APP_DATA_VERSION };
  persist(cleaned);
  return cleaned;
}

export function exportJSON() {
  const data = get();
  return JSON.stringify(
    { app: 'Mi Control Financiero', exportedAt: new Date().toISOString(), data },
    null,
    2,
  );
}

export function resetData() {
  const seed = buildSeedData();
  persist(seed);
  return seed;
}

export function getData() {
  return get();
}
