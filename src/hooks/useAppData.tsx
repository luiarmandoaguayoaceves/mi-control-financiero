// ============================================================
// Contexto de datos: expone AppData + acciones de escritura a
// todas las pantallas. Única capa que conoce el repositorio.
// ============================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type {
  Account,
  AppData,
  Asset,
  Budget,
  Category,
  CreditCard,
  FinancialSnapshot,
  Fund,
  Goal,
  Liability,
  Service,
  Settings,
  Transaction,
} from '../models/types';
import { DataRepository } from '../repositories/dataRepository';
import { ensureSeeded } from '../services/seedService';
import { buildSnapshot, totalCardDebt, msiPendingTotal, availableBalance, protectedFundsTotal, totalFunds } from '../services/financeService';
import { todayISO, toMonthKey, round2 } from '../utils/format';
import { APP_NAME } from '../constants';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

interface DataContextValue {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fundMovement: (fundId: string, amount: number, kind: 'deposit' | 'withdraw') => Promise<void>;
  updateFund: (fund: Fund) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  updateCreditCard: (card: CreditCard) => Promise<void>;
  upsertCategory: (category: Category) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  upsertAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  upsertLiability: (liability: Liability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  exportJSON: () => Promise<void>;
  resetData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

const r2 = (n: number) => round2(n);

/** Tarjeta asociada a una cuenta (por nombre o la única activa). */
function cardForAccount(data: AppData, accountId: string): CreditCard | undefined {
  const acc = data.accounts.find((a) => a.id === accountId);
  if (!acc) return undefined;
  return (
    data.creditCards.find((c) => c.name === acc.name) ||
    data.creditCards.find((c) => c.active)
  );
}

/**
 * Aplica el efecto contable de una transacción a cuentas/tarjetas/apartados.
 * sign: +1 aplicar, -1 revertir.
 */
function applyTransactionToData(
  data: AppData,
  tx: Transaction,
  sign: 1 | -1,
): AppData {
  const accounts = data.accounts.map((a) => ({ ...a }));
  const cards = data.creditCards.map((c) => ({ ...c }));
  const funds = data.funds.map((f) => ({ ...f }));
  const s = sign;
  const acc = accounts.find((a) => a.id === tx.accountId);

  const bumpAccount = (id: string, delta: number) => {
    const a = accounts.find((x) => x.id === id);
    if (a) a.balance = r2(a.balance + delta);
  };
  const bumpCard = (delta: number) => {
    const card = cardForAccount(data, tx.accountId);
    if (card) {
      const c = cards.find((x) => x.id === card.id);
      if (c) c.currentBalance = r2(Math.max(0, c.currentBalance + delta));
    }
  };
  const bumpFund = (id: string, delta: number) => {
    const f = funds.find((x) => x.id === id);
    if (f) f.currentAmount = r2(Math.max(0, f.currentAmount + delta));
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

  // Mantener disponible = límite - saldo
  for (const c of cards) {
    c.availableCredit = r2(Math.max(0, c.creditLimit - c.currentBalance));
  }

  return { ...data, accounts, creditCards: cards, funds };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const repoRef = useRef<DataRepository | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureSeeded();
      const repo = await DataRepository.init();
      repoRef.current = repo;
      let next = repo.get();

      // Snapshot mensual automático (uno por mes)
      const monthKey = toMonthKey(new Date());
      const hasMonth = next.snapshots.some((s) => toMonthKey(new Date(s.date + 'T00:00:00')) === monthKey);
      if (!hasMonth) {
        const snapshot: FinancialSnapshot = buildSnapshot({
          date: todayISO(),
          cashAndAccounts: availableBalance(next.accounts),
          protectedFunds: protectedFundsTotal(next.funds),
          creditCardDebt: totalCardDebt(next.creditCards),
          installmentDebt: msiPendingTotal(next.installmentPurchases),
          assets: next.assets.reduce((a, x) => a + x.estimatedValue, 0),
          liabilities: next.liabilities.reduce((a, x) => a + x.outstandingBalance, 0),
        });
        next = await repo.importAll({ ...next, snapshots: [...next.snapshots, snapshot] });
      }
      setData(next);
      setError(null);
    } catch (e) {
      console.warn('Error al cargar datos', e);
      setError('No se pudieron cargar los datos locales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const commit = useCallback(async (next: AppData) => {
    if (!repoRef.current) return next;
    const saved = await repoRef.current.importAll(next);
    setData(saved);
    return saved;
  }, []);

  const addTransaction = useCallback(
    async (input: TransactionInput): Promise<Transaction> => {
      if (!data) throw new Error('Sin datos');
      const now = new Date().toISOString();
      const tx: Transaction = {
        ...input,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      const next = applyTransactionToData(data, tx, 1);
      await commit({ ...next, transactions: [...next.transactions, tx] });
      return tx;
    },
    [data, commit],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      if (!data) return;
      const existing = data.transactions.find((t) => t.id === id);
      if (!existing) return;
      let next = applyTransactionToData(data, existing, -1); // revertir efecto anterior
      const updated: Transaction = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      next = applyTransactionToData(next, updated, 1); // aplicar efecto nuevo
      next = {
        ...next,
        transactions: next.transactions.map((t) => (t.id === id ? updated : t)),
      };
      await commit(next);
    },
    [data, commit],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!data) return;
      const existing = data.transactions.find((t) => t.id === id);
      if (!existing) return;
      const next = applyTransactionToData(data, existing, -1);
      await commit({
        ...next,
        transactions: next.transactions.filter((t) => t.id !== id),
      });
    },
    [data, commit],
  );

  const fundMovement = useCallback(
    async (fundId: string, amount: number, kind: 'deposit' | 'withdraw') => {
      if (!data) return;
      const fund = data.funds.find((f) => f.id === fundId);
      if (!fund || amount <= 0) return;
      const signed = kind === 'deposit' ? amount : -amount;
      const funds = data.funds.map((f) =>
        f.id === fundId ? { ...f, currentAmount: r2(Math.max(0, f.currentAmount + signed)) } : f,
      );
      // Registra una transferencia como auditoría (afecta el apartado, no la cuenta)
      const now = new Date().toISOString();
      const acc = data.accounts.find((a) => a.type !== 'credit' && a.active);
      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: todayISO(),
        description: `${kind === 'deposit' ? 'Ingreso a' : 'Retiro de'} apartado: ${fund.name}`,
        amount: amount,
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
      await commit({
        ...data,
        funds,
        transactions: [...data.transactions, tx],
      });
    },
    [data, commit],
  );

  const updateFund = useCallback(
    async (fund: Fund) => {
      if (!data) return;
      await commit({
        ...data,
        funds: data.funds.map((f) => (f.id === fund.id ? fund : f)),
      });
    },
    [data, commit],
  );

  const updateGoal = useCallback(
    async (goal: Goal) => {
      if (!data) return;
      await commit({ ...data, goals: data.goals.map((g) => (g.id === goal.id ? goal : g)) });
    },
    [data, commit],
  );

  const updateService = useCallback(
    async (service: Service) => {
      if (!data) return;
      await commit({ ...data, services: data.services.map((s) => (s.id === service.id ? service : s)) });
    },
    [data, commit],
  );

  const updateAccount = useCallback(
    async (account: Account) => {
      if (!data) return;
      await commit({ ...data, accounts: data.accounts.map((a) => (a.id === account.id ? account : a)) });
    },
    [data, commit],
  );

  const updateCreditCard = useCallback(
    async (card: CreditCard) => {
      if (!data) return;
      await commit({ ...data, creditCards: data.creditCards.map((c) => (c.id === card.id ? card : c)) });
    },
    [data, commit],
  );

  const upsertCategory = useCallback(
    async (category: Category) => {
      if (!data) return;
      const exists = data.categories.some((c) => c.id === category.id);
      await commit({
        ...data,
        categories: exists
          ? data.categories.map((c) => (c.id === category.id ? category : c))
          : [...data.categories, category],
      });
    },
    [data, commit],
  );

  const updateBudget = useCallback(
    async (budget: Budget) => {
      if (!data) return;
      const exists = data.budgets.some((b) => b.id === budget.id);
      await commit({
        ...data,
        budgets: exists
          ? data.budgets.map((b) => (b.id === budget.id ? budget : b))
          : [...data.budgets, budget],
      });
    },
    [data, commit],
  );

  const upsertAsset = useCallback(
    async (asset: Asset) => {
      if (!data) return;
      const exists = data.assets.some((a) => a.id === asset.id);
      await commit({
        ...data,
        assets: exists
          ? data.assets.map((a) => (a.id === asset.id ? asset : a))
          : [...data.assets, asset],
      });
    },
    [data, commit],
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      if (!data) return;
      await commit({ ...data, assets: data.assets.filter((a) => a.id !== id) });
    },
    [data, commit],
  );

  const upsertLiability = useCallback(
    async (liability: Liability) => {
      if (!data) return;
      const exists = data.liabilities.some((l) => l.id === liability.id);
      await commit({
        ...data,
        liabilities: exists
          ? data.liabilities.map((l) => (l.id === liability.id ? liability : l))
          : [...data.liabilities, liability],
      });
    },
    [data, commit],
  );

  const deleteLiability = useCallback(
    async (id: string) => {
      if (!data) return;
      await commit({ ...data, liabilities: data.liabilities.filter((l) => l.id !== id) });
    },
    [data, commit],
  );

  const updateSettings = useCallback(
    async (settings: Settings) => {
      if (!data) return;
      await commit({ ...data, settings });
    },
    [data, commit],
  );

  const exportJSON = useCallback(async () => {
    if (!data) return;
    try {
      const payload = JSON.stringify(
        { app: APP_NAME, exportedAt: new Date().toISOString(), data },
        null,
        2,
      );
      const file = new File(Paths.cache, `mi-control-financiero-respaldo-${todayISO()}.json`);
      file.write(payload);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar respaldo',
        });
      } else {
        Alert.alert('Exportar', `El archivo se guardó en:\n${file.uri}`);
      }
    } catch (e) {
      console.warn('Error al exportar', e);
      Alert.alert('Error', 'No se pudo exportar el respaldo.');
    }
  }, [data]);

  const resetData = useCallback(async () => {
    if (!repoRef.current) return;
    const seeded = await repoRef.current.resetToSeed();
    setData(seeded);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      loading,
      error,
      refresh,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      fundMovement,
      updateFund,
      updateGoal,
      updateService,
      updateAccount,
      updateCreditCard,
      upsertCategory,
      updateBudget,
      upsertAsset,
      deleteAsset,
      upsertLiability,
      deleteLiability,
      updateSettings,
      exportJSON,
      resetData,
    }),
    [
      data, loading, error, refresh, addTransaction, updateTransaction, deleteTransaction,
      fundMovement, updateFund, updateGoal, updateService, updateAccount, updateCreditCard,
      upsertCategory, updateBudget, upsertAsset, deleteAsset, upsertLiability,
      deleteLiability, updateSettings, exportJSON, resetData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData debe usarse dentro de <DataProvider>');
  return ctx;
}

export { clone };
