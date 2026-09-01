// ============================================================
// Modelos de dominio de "Mi Control Financiero"
// Interfaces puras: se usan en la capa de repositorio y servicios.
// v1: almacenamiento local (AsyncStorage). Diseñadas para migrar
// a SQLite/Cloud sin cambiar las pantallas.
// ============================================================

export type AccountType = 'debit' | 'credit' | 'cash' | 'savings';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  availableCredit?: number;
  active: boolean;
  notes?: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'creditPayment';

export interface Transaction {
  id: string;
  /** Fecha local en formato YYYY-MM-DD */
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  paymentMethod: string;
  accountId: string;
  /** Apartado relacionado (ingreso/retiro a fondo) */
  fundId?: string;
  /** Cuenta destino (solo transferencias) */
  toAccountId?: string;
  merchant?: string;
  /** true = compra realizada con tarjeta de crédito (debe respaldarse con efectivo) */
  isCreditCardPurchase: boolean;
  isPending: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoryGroup = 'Necesidad' | 'Deseo' | 'Ahorro/Inversión' | 'Deuda/Pago' | 'Ingreso';

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  active: boolean;
}

export interface Fund {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount?: number;
  purpose?: string;
  /** true = dinero que no debe tocarse (no cuenta como libre) */
  protected: boolean;
  active: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  creditLimit: number;
  currentBalance: number;
  /** Día de corte (1-28) */
  cutDay: number;
  /** Última fecha límite conocida (YYYY-MM-DD) */
  dueDate?: string;
  currentNoInterestPayment: number;
  availableCredit: number;
  points: number;
  active: boolean;
  notes?: string;
}

export interface InstallmentPurchase {
  id: string;
  cardId: string;
  description: string;
  originalAmount: number;
  pendingBalance: number;
  monthlyPayment: number;
  totalMonths: number;
  currentPaymentNumber: number;
  interestRate: number;
  startDate: string;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  expectedMonthlyAmount: number;
  lastAmount?: number;
  dueDay?: number;
  categoryId: string;
  active: boolean;
  notes?: string;
}

export type GoalType = 'emergencia' | 'provisión' | 'compra' | 'inversión' | 'otro';
export type GoalPriority = 'alta' | 'media' | 'baja';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  priority: GoalPriority;
  type: GoalType;
  deadline?: string;
  active: boolean;
  notes?: string;
}

export interface Budget {
  id: string;
  /** Mes en formato YYYY-MM */
  month: string;
  categoryId: string;
  plannedAmount: number;
}

export interface Asset {
  id: string;
  name: string;
  estimatedValue: number;
  type: string;
  notes?: string;
}

export interface Liability {
  id: string;
  name: string;
  outstandingBalance: number;
  interestRate?: number;
  monthlyPayment?: number;
  type: string;
  notes?: string;
}

export interface FinancialSnapshot {
  /** Fecha de captura YYYY-MM-DD */
  date: string;
  cashAndAccounts: number;
  protectedFunds: number;
  creditCardDebt: number;
  installmentDebt: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface Settings {
  /** Ingreso mensual estimado (opcional, para % de MSI y tasa de ahorro) */
  monthlyIncome?: number;
  currency: string;
}

export interface AppData {
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  funds: Fund[];
  creditCards: CreditCard[];
  installmentPurchases: InstallmentPurchase[];
  services: Service[];
  goals: Goal[];
  budgets: Budget[];
  assets: Asset[];
  liabilities: Liability[];
  snapshots: FinancialSnapshot[];
  settings: Settings;
}

export const APP_DATA_VERSION = 1;
