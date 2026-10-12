import { loadJSON, saveJSON } from './persistence';
import { getGold, spendGold } from './currency';
import type { JobId } from './jobs';

// Batch X: tiap skill Lv1-3. Damage +30%/Lv, CD -1 dtk/Lv (min 3 dtk).
export const SKILL_MAX_LEVEL = 3;

type Levels = [number, number, number];

const KEY = 'mmorpg-skills-v1';

function blank(): Levels {
  return [1, 1, 1];
}

function load(): Partial<Record<JobId, Levels>> {
  try {
    const s = loadJSON<Partial<Record<JobId, Levels>>>(KEY, {});
    (['warrior', 'mage', 'archer'] as JobId[]).forEach((j) => {
      const v = s[j];
      if (!Array.isArray(v)) s[j] = blank();
      else s[j] = [clamp(v[0]), clamp(v[1]), clamp(v[2])] as Levels;
    });
    return s;
  } catch {
    return {};
  }
}

function clamp(n: unknown): number {
  const v = typeof n === 'number' ? Math.round(n) : 1;
  return Math.min(SKILL_MAX_LEVEL, Math.max(1, v));
}

let levels: Partial<Record<JobId, Levels>> = load();

function persist() {
  saveJSON(KEY, levels);
  window.dispatchEvent(new CustomEvent('skills-changed'));
}

export function getSkillLevel(job: JobId, slot: number): number {
  return levels[job]?.[slot] ?? 1;
}

export function skillDamageMult(job: JobId, slot: number): number {
  return 1 + 0.3 * (getSkillLevel(job, slot) - 1);
}

export function skillCd(job: JobId, slot: number, baseMs: number): number {
  return Math.max(3000, baseMs - 1000 * (getSkillLevel(job, slot) - 1));
}

/** Waktu cast ms (0 = instan). */
export function skillCastMs(job: JobId, slot: number, baseMs = 0): number {
  if (!baseMs) return 0;
  return Math.max(1500, baseMs - 500 * (getSkillLevel(job, slot) - 1));
}

export function skillUpgradeCost(job: JobId, slot: number): { gold: number } | null {
  const lvl = getSkillLevel(job, slot);
  if (lvl >= SKILL_MAX_LEVEL) return null;
  return { gold: lvl === 1 ? 100 : 250 };
}

export function tryUpgradeSkill(job: JobId, slot: number): { ok: boolean; reason?: string } {
  const lvl = getSkillLevel(job, slot);
  if (lvl >= SKILL_MAX_LEVEL) return { ok: false, reason: 'Sudah Lv.3 (max)' };
  const cost = skillUpgradeCost(job, slot)!;
  if (getGold() < cost.gold) return { ok: false, reason: `Butuh ${cost.gold}G` };
  if (!spendGold(cost.gold)) return { ok: false, reason: 'Gold kurang' };
  const arr = levels[job] ?? (levels[job] = blank());
  arr[slot] = lvl + 1;
  persist();
  return { ok: true };
}
