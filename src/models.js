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

/**
 * Categorías por defecto (estructura de diseño, no son datos financieros).
 * Se crean en el arranque vacío porque la app no tiene aún pantalla
 * para crear categorías.
 */
export const DEFAULT_CATEGORIES = [
  { id: CATEGORY_IDS.renta, name: 'Renta', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.agua, name: 'Agua', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.luz, name: 'Luz', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.gas, name: 'Gas', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.internet, name: 'Internet', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.telefono, name: 'Teléfono', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.suscripciones, name: 'Suscripciones', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.despensa, name: 'Despensa', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.comidaFuera, name: 'Comida fuera', group: 'Deseo', active: true },
  { id: CATEGORY_IDS.gasolina, name: 'Gasolina', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.motoMantenimiento, name: 'Moto mantenimiento', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.motoSeguro, name: 'Moto seguro', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.motoTramites, name: 'Moto trámites', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.hogar, name: 'Hogar', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.equiparDepa, name: 'Equipar depa', group: 'Deseo', active: true },
  { id: CATEGORY_IDS.diversion, name: 'Diversión', group: 'Deseo', active: true },
  { id: CATEGORY_IDS.viajes, name: 'Viajes', group: 'Deseo', active: true },
  { id: CATEGORY_IDS.salud, name: 'Salud', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.tdcPago, name: 'TDC pago', group: 'Deuda/Pago', active: true },
  { id: CATEGORY_IDS.ahorro, name: 'Ahorro', group: 'Ahorro/Inversión', active: true },
  { id: CATEGORY_IDS.inversion, name: 'Inversión', group: 'Ahorro/Inversión', active: true },
  { id: CATEGORY_IDS.otros, name: 'Otros', group: 'Necesidad', active: true },
  { id: CATEGORY_IDS.ingreso, name: 'Ingreso', group: 'Ingreso', active: true },
];
