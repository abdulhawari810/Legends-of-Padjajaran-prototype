import { loadJSON, saveJSON } from './persistence';
import { addGold } from './currency';
import { getStats, totalKills } from './stats';
import { getEnhance } from './enhance';

// Batch M: pencapaian auto-klaim + hadiah gold.
export interface AchDef {
  id: string;
  name: string;
  desc: string;
  gold: number;
}

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'first-blood', name: 'First Blood', desc: 'Kalahkan 1 monster.', gold: 10 },
  { id: 'slime-50', name: 'Pembasmi Slime', desc: 'Kalahkan 50 Slime.', gold: 50 },
  { id: 'elite-1', name: 'Pembunuh Elite', desc: 'Kalahkan 1 Skeleton Elite.', gold: 50 },
  { id: 'smith-5', name: 'Pandai Master', desc: 'Tempa equipment +5.', gold: 100 },
  { id: 'quest-5', name: 'Pahlawan Desa', desc: 'Selesaikan 5 quest (klaim).', gold: 50 },
  { id: 'level-10', name: 'Veteran', desc: 'Capai Lv.10.', gold: 100 }
];

const KEY = 'mmorpg-ach-v1';

function loadUnlocked(): Set<string> {
  try {
    return new Set(loadJSON<string[]>(KEY, []));
  } catch {
    return new Set();
  }
}

let unlocked = loadUnlocked();

function persist() {
  saveJSON(KEY, [...unlocked]);
}

export function isUnlocked(id: string): boolean {
  return unlocked.has(id);
}

function grant(id: string) {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def || unlocked.has(id)) return;
  unlocked.add(id);
  persist();
  if (def.gold > 0) addGold(def.gold);
  window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: { ...def } }));
}

export function snapshotAchievements() {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}

/** Dipanggil tiap ada kill. */
export function checkKills(monsterId: string) {
  const s = getStats();
  if (totalKills(s) >= 1) grant('first-blood');
  if ((s.kills['slime'] ?? 0) >= 50) grant('slime-50');
  if (monsterId === 'skeleton-elite' && (s.kills['skeleton-elite'] ?? 0) >= 1) grant('elite-1');
}

export function checkEnhance() {
  if (getEnhance('weapon') >= 5 || getEnhance('armor') >= 5) grant('smith-5');
}

export function checkClaims() {
  if (getStats().claims >= 5) grant('quest-5');
}

export function checkLevel(lvl: number) {
  if (lvl >= 10) grant('level-10');
}
