import type { JobId } from './jobs';
import type { Primary } from './attributes';
import { loadJSON, saveJSON } from './persistence';

// Batch C: save per-job + posisi + meta. Inventory/gold/quest/equip global tetap
// di key masing-masing (sudah persist), di sini hanya tambah yang belum.

export interface JobSave {
  level: number;
  exp: number;
  primary: Primary;
  weaponId: string | null;
  armorId: string | null;
  hp: number;
  mp: number;
}

export interface PosSave {
  x: number;
  y: number;
}

export type PosStore = Record<string, PosSave>;

export interface MetaSave {
  currentJob: JobId;
  killCount: number;
}

const KEY_JOBS = 'mmorpg-player-jobs-v1';
const KEY_POS = 'mmorpg-player-pos-v1';
const KEY_META = 'mmorpg-meta-v1';

const ALL_KEYS = [
  KEY_JOBS,
  KEY_POS,
  KEY_META,
  'mmorpg-inventory-v1',
  'mmorpg-gold-v1',
  'mmorpg-quests-v1',
  'mmorpg-equip-weapon-v1',
  'mmorpg-equip-armor-v1',
  'mmorpg-bounty-v1',
  'mmorpg-enhance-v1',
  'mmorpg-stats-v1',
  'mmorpg-ach-v1'
];

export function loadJobSaves(): Partial<Record<JobId, JobSave>> {
  return loadJSON<Partial<Record<JobId, JobSave>>>(KEY_JOBS, {});
}

export function loadJobSave(jobId: JobId): JobSave | null {
  return loadJobSaves()[jobId] ?? null;
}

export function saveJobSave(jobId: JobId, data: JobSave) {
  const all = loadJobSaves();
  all[jobId] = data;
  saveJSON(KEY_JOBS, all);
}

export function loadPos(mapId = 'greenfield'): PosSave | null {
  const raw = loadJSON<PosStore | PosSave | null>(KEY_POS, null);
  if (!raw) return null;
  // kompatibel save lama: {x,y} langsung = greenfield
  if (typeof (raw as PosSave).x === 'number') {
    return mapId === 'greenfield' ? (raw as PosSave) : null;
  }
  return (raw as PosStore)[mapId] ?? null;
}

export function savePos(x: number, y: number, mapId = 'greenfield') {
  const raw = loadJSON<PosStore | PosSave | null>(KEY_POS, null);
  let store: PosStore = {};
  if (raw && typeof (raw as PosSave).x !== 'number') {
    store = { ...(raw as PosStore) };
  } else if (raw && typeof (raw as PosSave).x === 'number') {
    store = { greenfield: raw as PosSave };
  }
  store[mapId] = { x: Math.round(x), y: Math.round(y) };
  saveJSON(KEY_POS, store);
}

export function loadMeta(): MetaSave {
  return loadJSON<MetaSave>(KEY_META, { currentJob: 'warrior', killCount: 0 });
}

export function saveMeta(meta: MetaSave) {
  saveJSON(KEY_META, meta);
}

export function clearAllSave() {
  try {
    ALL_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // abaikan
  }
}

/** Batch M: backup/restore semua progres (bukan preferensi device). */
export function exportSave(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  try {
    ALL_KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      data[k] = raw ? (JSON.parse(raw) as unknown) : null;
    });
  } catch {
    // abaikan key rusak
  }
  return { v: 1, data };
}

export function importSave(obj: unknown): { ok: boolean; reason?: string } {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'Format salah' };
  const data = (obj as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return { ok: false, reason: 'Tidak ada data save' };
  const rec = data as Record<string, unknown>;
  const known = rec[KEY_JOBS] ?? rec[KEY_META] ?? rec['mmorpg-gold-v1'];
  if (known === undefined) return { ok: false, reason: 'Bukan file save game ini' };
  try {
    ALL_KEYS.forEach((k) => {
      if (rec[k] === undefined || rec[k] === null) return;
      localStorage.setItem(k, JSON.stringify(rec[k]));
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Gagal tulis (memori penuh?)' };
  }
}
