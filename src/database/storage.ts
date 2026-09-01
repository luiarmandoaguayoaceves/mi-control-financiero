// ============================================================
// Capa de almacenamiento local (v1: AsyncStorage).
// Aislada detrás de DataRepository para poder migrar a
// expo-sqlite / Cloud / Firebase sin tocar las pantallas.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData } from '../models/types';
import { STORAGE_KEY } from '../constants';

type Listener = (data: AppData) => void;

let cache: AppData | null = null;
let loadPromise: Promise<AppData> | null = null;
const listeners = new Set<Listener>();

export async function loadData(): Promise<AppData> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        cache = JSON.parse(raw) as AppData;
        return cache;
      }
    } catch (e) {
      console.warn('No se pudo leer el almacenamiento local', e);
    }
    throw new Error('SIN_DATOS');
  })();
  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function saveData(data: AppData): Promise<void> {
  cache = data;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  for (const fn of listeners) {
    try {
      fn(data);
    } catch (e) {
      console.warn('Error en listener de datos', e);
    }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCached(): AppData | null {
  return cache;
}

export function setCache(data: AppData): void {
  cache = data;
}
