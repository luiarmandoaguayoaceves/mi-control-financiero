// ============================================================
// Modelos y constantes (objetos JS). Módulo puro: sin DOM ni storage.
// ============================================================

export const ACCOUNT_TYPES = ['debit', 'credit', 'cash', 'savings'];
export const TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'creditPayment'];
export const CATEGORY_GROUPS = ['Necesidad', 'Deseo', 'Ahorro/Inversión', 'Deuda/Pago', 'Ingreso'];
export const PAYMENT_METHODS = ['Tarjeta', 'Efectivo', 'Transferencia', 'Débito'];
export const GOAL_TYPES = ['emergencia', 'provisión', 'compra', 'inversión', 'otro'];
export const GOAL_PRIORITIES = ['alta', 'media', 'baja'];

export const GROUP_COLORS = {
  Necesidad: '#3B82F6',
  Deseo: '#8B5CF6',
  'Ahorro/Inversión': '#10B981',
  'Deuda/Pago': '#EF4444',
  Ingreso: '#22C55E',
};

export const CATEGORY_IDS = {
  renta: 'cat-renta',
  agua: 'cat-agua',
  luz: 'cat-luz',
  gas: 'cat-gas',
  internet: 'cat-internet',
  telefono: 'cat-telefono',
  suscripciones: 'cat-suscripciones',
  despensa: 'cat-despensa',
  comidaFuera: 'cat-comida-fuera',
  gasolina: 'cat-gasolina',
  motoMantenimiento: 'cat-moto-mantenimiento',
  motoSeguro: 'cat-moto-seguro',
  motoTramites: 'cat-moto-tramites',
  hogar: 'cat-hogar',
  equiparDepa: 'cat-equipar-depa',
  diversion: 'cat-diversion',
  viajes: 'cat-viajes',
  salud: 'cat-salud',
  tdcPago: 'cat-tdc-pago',
  ahorro: 'cat-ahorro',
  inversion: 'cat-inversion',
  otros: 'cat-otros',
  ingreso: 'cat-ingreso',
};

export const TRANSACTION_TYPE_LABELS = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  creditPayment: 'Pago TDC',
};

export const APP_DATA_VERSION = 1;
export const STORAGE_KEY = 'mcf_app_data_v1';
export const THEME_KEY = 'mcf_theme';
