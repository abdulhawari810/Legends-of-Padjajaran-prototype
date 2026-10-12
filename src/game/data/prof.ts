import { loadJSON, saveJSON } from './persistence';
import type { NodeKind } from '../entities/GatherNode';

// Batch Y: profesi mining & herbalism. Tiap panen +6 XP, butuh lvl*12.
// Efek: channel lebih cepat (3.5s -0.15s/Lv, min 2s) + bonus yield 10%/Lv.
// Loot per jenis (gampang tambah jenis baru): min-max jumlah per panen.
export type ProfKind = 'mining' | 'herb';

export interface ProfState {
  lvl: number;
  xp: number;
}

export const NODE_LOOT: Record<NodeKind, { item: string; min: number; max: number }> = {
  ore: { item: 'iron-ore', min: 1, max: 7 },
  herb: { item: 'herb', min: 1, max: 3 }
};

/** Roll jumlah loot panen (seedable untuk tes). */
export function rollGatherLoot(kind: NodeKind, rand: () => number = Math.random): number {
  const t = NODE_LOOT[kind];
  return t.min + Math.floor(rand() * (t.max - t.min + 1));
}

const KEY = 'mmorpg-prof-v1';

function blank(): ProfState {
  return { lvl: 1, xp: 0 };
}

function load(): Record<ProfKind, ProfState> {
  try {
    const s = loadJSON<Partial<Record<ProfKind, ProfState>>>(KEY, {});
    const norm = (p?: Partial<ProfState>): ProfState => ({
      lvl: Math.max(1, Math.round(p?.lvl ?? 1)),
      xp: Math.max(0, p?.xp ?? 0)
    });
    return { mining: norm(s.mining), herb: norm(s.herb) };
  } catch {
    return { mining: blank(), herb: blank() };
  }
}

let prof: Record<ProfKind, ProfState> = load();

function persist() {
  saveJSON(KEY, prof);
}

export function getProf(kind: ProfKind): ProfState {
  return { ...(prof[kind] ?? blank()) };
}

/** Lama channel panen (ms). Makin pro makin cepat. */
export function channelTimeMs(kind: ProfKind): number {
  return Math.max(2000, 3500 - 150 * (getProf(kind).lvl - 1));
}

/** Peluang bonus +1 yield per panen. */
export function bonusChance(kind: ProfKind): number {
  return Math.min(0.8, getProf(kind).lvl * 0.1);
}

/** Tambah XP, return true bila naik level. */
export function addProfXp(kind: ProfKind, n = 6): boolean {
  const p = prof[kind] ?? (prof[kind] = blank());
  p.xp += n;
  let up = false;
  while (p.xp >= p.lvl * 12) {
    p.xp -= p.lvl * 12;
    p.lvl += 1;
    up = true;
  }
  persist();
  return up;
}
