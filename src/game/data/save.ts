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

// Batch D: 3 slot save manual (snapshot semua key live).
export const MAX_SLOTS = 3;
export const SLOT_KEYS = [
  'mmorpg-slot-1-v1',
  'mmorpg-slot-2-v1',
  'mmorpg-slot-3-v1'
];

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
  'mmorpg-ach-v1',
  ...SLOT_KEYS
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

// ===== Batch D: slot save manual =====

export interface SlotInfo {
  empty: boolean;
  savedAt: number;
  job: JobId;
  level: number;
  kill: number;
  gold: number;
}

interface SlotPayload {
  v: 1;
  info: Omit<SlotInfo, 'empty'>;
  keys: Record<string, string | null>;
}

// Key live yang di-snapshot ke slot (tanpa slot lain agar tidak bersarang).
const LIVE_KEYS = ALL_KEYS.filter((k) => !SLOT_KEYS.includes(k));

export function slotInfo(i: number): SlotInfo {
  const raw = loadJSON<SlotPayload | null>(SLOT_KEYS[i - 1] ?? '', null);
  if (!raw || raw.v !== 1 || !raw.info) {
    return { empty: true, savedAt: 0, job: 'warrior', level: 1, kill: 0, gold: 0 };
  }
  return { empty: false, ...raw.info };
}

export function saveSlot(i: number): { ok: boolean; reason?: string } {
  if (i < 1 || i > MAX_SLOTS) return { ok: false, reason: 'Slot tidak valid' };
  try {
    const keys: Record<string, string | null> = {};
    LIVE_KEYS.forEach((k) => {
      keys[k] = localStorage.getItem(k);
    });
    const meta = loadMeta();
    const jobs = loadJobSaves();
    const cur = jobs[meta.currentJob];
    const goldRaw = localStorage.getItem('mmorpg-gold-v1');
    const payload: SlotPayload = {
      v: 1,
      info: {
        savedAt: Date.now(),
        job: meta.currentJob,
        level: cur?.level ?? 1,
        kill: meta.killCount ?? 0,
        gold: goldRaw ? (JSON.parse(goldRaw) as number) : 0
      },
      keys
    };
    saveJSON(SLOT_KEYS[i - 1], payload);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Gagal tulis (memori penuh?)' };
  }
}

export function loadSlot(i: number): { ok: boolean; reason?: string } {
  const raw = loadJSON<SlotPayload | null>(SLOT_KEYS[i - 1] ?? '', null);
  if (!raw || raw.v !== 1 || !raw.keys) return { ok: false, reason: 'Slot kosong' };
  try {
    Object.entries(raw.keys).forEach(([k, v]) => {
      if (v === null || v === undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Gagal tulis (memori penuh?)' };
  }
}

export function deleteSlot(i: number) {
  try {
    localStorage.removeItem(SLOT_KEYS[i - 1] ?? '');
  } catch {
    // abaikan
  }
}
