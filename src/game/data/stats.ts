import { loadJSON, saveJSON } from './persistence';

// Batch M: statistik global (semua job).
export interface GameStats {
  kills: Record<string, number>;
  deaths: number;
  claims: number;
  maxLevel: number;
  playtimeSec: number;
}

const KEY = 'mmorpg-stats-v1';

const FALLBACK: GameStats = { kills: {}, deaths: 0, claims: 0, maxLevel: 1, playtimeSec: 0 };

export function getStats(): GameStats {
  try {
    const s = loadJSON<Partial<GameStats>>(KEY, {});
    return {
      kills: s.kills ?? {},
      deaths: s.deaths ?? 0,
      claims: s.claims ?? 0,
      maxLevel: s.maxLevel ?? 1,
      playtimeSec: s.playtimeSec ?? 0
    };
  } catch {
    return { ...FALLBACK, kills: {} };
  }
}

function persist(s: GameStats) {
  saveJSON(KEY, s);
  window.dispatchEvent(new CustomEvent('game-stats-changed'));
}

export function totalKills(s: GameStats = getStats()): number {
  return Object.values(s.kills).reduce((a, b) => a + b, 0);
}

export function addKill(monsterId: string) {
  const s = getStats();
  s.kills[monsterId] = (s.kills[monsterId] ?? 0) + 1;
  persist(s);
}

export function addDeath() {
  const s = getStats();
  s.deaths += 1;
  persist(s);
}

export function addClaim() {
  const s = getStats();
  s.claims += 1;
  persist(s);
}

export function setMaxLevel(lvl: number) {
  const s = getStats();
  if (lvl > s.maxLevel) {
    s.maxLevel = lvl;
    persist(s);
  }
}

export function addPlaytime(sec: number) {
  const s = getStats();
  s.playtimeSec += sec;
  persist(s);
}

export function formatPlaytime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}
