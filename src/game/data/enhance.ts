import { scopedKey, loadJSON, saveJSON } from './persistence';
import { getCount, removeItem } from './inventory';
import { addGold, getGold, spendGold } from './currency';

// Batch J: tempa weapon/armor +1..+5. Bonus per level: weapon +2 atk, armor +1 armor.
export type EnhanceSlot = 'weapon' | 'armor';

export const ENHANCE_MAX = 5;
export const ENHANCE_ATK_PER_LEVEL = 2;
export const ENHANCE_ARMOR_PER_LEVEL = 1;

const KEY = (): string => scopedKey('mmorpg-enhance-v1');

interface Save {
  weapon: number;
  armor: number;
}

function load(): Save {
  const s = loadJSON<Partial<Save>>(KEY(), {});
  return {
    weapon: Math.min(ENHANCE_MAX, Math.max(0, s.weapon ?? 0)),
    armor: Math.min(ENHANCE_MAX, Math.max(0, s.armor ?? 0))
  };
}

let levels: Save = load();

function persist() {
  saveJSON(KEY(), levels);
}

export function getEnhance(slot: EnhanceSlot): number {
  return levels[slot] ?? 0;
}

/** Biaya naik level berikutnya, null bila sudah max. */
export function enhanceCost(slot: EnhanceSlot): { gold: number; gel: number } | null {
  const lvl = getEnhance(slot);
  if (lvl >= ENHANCE_MAX) return null;
  return { gold: 25 * (lvl + 1), gel: lvl };
}

export function tryEnhance(slot: EnhanceSlot): { ok: boolean; reason?: string } {
  const lvl = getEnhance(slot);
  if (lvl >= ENHANCE_MAX) return { ok: false, reason: 'Sudah +5 (max)' };
  const cost = enhanceCost(slot)!;
  if (getGold() < cost.gold) return { ok: false, reason: `Butuh ${cost.gold}G` };
  if (cost.gel > 0 && getCount('slime-gel') < cost.gel) {
    return { ok: false, reason: `Butuh ${cost.gel} Slime Gel` };
  }
  if (!spendGold(cost.gold)) return { ok: false, reason: 'Gold kurang' };
  if (cost.gel > 0 && !removeItem('slime-gel', cost.gel)) {
    addGold(cost.gold); // kembalikan gold bila gel gagal (tidak seharusnya terjadi)
    return { ok: false, reason: 'Gel kurang' };
  }
  levels[slot] = lvl + 1;
  persist();
  window.dispatchEvent(new CustomEvent('equipment-changed'));
  window.dispatchEvent(new CustomEvent('enhance-changed'));
  return { ok: true };
}
