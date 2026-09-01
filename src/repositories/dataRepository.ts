// ============================================================
// Repositorio de datos: única puerta de escritura sobre AppData.
// Las pantallas nunca tocan AsyncStorage directamente:
// usan useAppData() -> acciones de este repositorio.
// ============================================================
import { loadData, saveData } from '../database/storage';
import type { AppData } from '../models/types';
import { APP_DATA_VERSION } from '../models/types';

export class DataRepository {
  private data: AppData;

  private constructor(data: AppData) {
    this.data = data;
  }

  static async init(): Promise<DataRepository> {
    const data = await loadData();
    return new DataRepository(data);
  }

  static create(data: AppData): DataRepository {
    return new DataRepository(data);
  }

  get(): AppData {
    return this.data;
  }

  private async commit(next: AppData): Promise<AppData> {
    this.data = { ...next, version: APP_DATA_VERSION };
    await saveData(this.data);
    return this.data;
  }

  // ----- CRUD genérico por colección -----

  async upsert<K extends keyof AppData>(
    collection: K,
    item: AppData[K] extends Array<infer T> ? T : never,
  ): Promise<AppData> {
    const list = this.data[collection] as unknown as { id: string }[];
    const idx = list.findIndex((x) => x.id === (item as { id: string }).id);
    const nextList = [...list] as { id: string }[];
    if (idx >= 0) nextList[idx] = item as { id: string };
    else nextList.push(item as { id: string });
    return this.commit({ ...this.data, [collection]: nextList });
  }

  async remove<K extends keyof AppData>(
    collection: K,
    id: string,
  ): Promise<AppData> {
    const list = this.data[collection] as unknown as { id: string }[];
    const nextList = list.filter((x) => x.id !== id);
    return this.commit({ ...this.data, [collection]: nextList });
  }

  async replaceAll<K extends keyof AppData>(
    collection: K,
    items: AppData[K],
  ): Promise<AppData> {
    return this.commit({ ...this.data, [collection]: items });
  }

  async updateSettings(settings: AppData['settings']): Promise<AppData> {
    return this.commit({ ...this.data, settings });
  }

  async importAll(data: AppData): Promise<AppData> {
    return this.commit(data);
  }

  /** Resetea la app a los datos iniciales. */
  async resetToSeed(): Promise<AppData> {
    const { buildSeedData } = await import('../seed/seedData');
    return this.commit(buildSeedData());
  }
}
