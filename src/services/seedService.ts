// ============================================================
// Servicio de seed: inserta los datos iniciales solo en el
// primer arranque (cuando el almacenamiento está vacío).
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from '../constants';
import { buildSeedData } from '../seed/seedData';
import { saveData } from '../database/storage';

export const SEED_FLAG_KEY = 'mcf_seeded_v1';

/**
 * Si nunca se ha sembrado la base, escribe los datos iniciales.
 * Devuelve true si aplicó el seed.
 */
export async function ensureSeeded(): Promise<boolean> {
  try {
    const flagged = await AsyncStorage.getItem(SEED_FLAG_KEY);
    if (flagged === '1') return false;
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) {
      await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
      return false;
    }
    const seed = buildSeedData();
    await saveData(seed);
    await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
    return true;
  } catch (e) {
    console.warn('No se pudo sembrar la base de datos', e);
    return false;
  }
}
