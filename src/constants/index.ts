// Constantes globales de la app
import type { CategoryGroup } from '../models/types';

export const STORAGE_KEY = 'mcf_app_data_v1';

export const APP_NAME = 'Mi Control Financiero';
export const CURRENCY = 'MXN';

export const CATEGORY_GROUPS: CategoryGroup[] = [
  'Necesidad',
  'Deseo',
  'Ahorro/Inversión',
  'Deuda/Pago',
  'Ingreso',
];

export const GROUP_COLORS: Record<CategoryGroup, string> = {
  Necesidad: '#3B82F6',
  Deseo: '#8B5CF6',
  'Ahorro/Inversión': '#10B981',
  'Deuda/Pago': '#EF4444',
  Ingreso: '#22C55E',
};

export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'creditPayment', label: 'Pago TDC' },
] as const;

export const PAYMENT_METHODS = ['Tarjeta', 'Efectivo', 'Transferencia', 'Débito'] as const;

/** IDs de categorías iniciales (ver src/seed/seedData.ts) */
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
} as const;
