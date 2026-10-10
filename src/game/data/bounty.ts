import { loadJSON, saveJSON } from './persistence';

// Batch H: bounty harian (repeatable) + counter. Reset tiap hari kalender lokal.
export const BOUNTY_TARGET = 'skeleton-elite';
export const BOUNTY_NEED = 1;
export const BOUNTY_REWARD_GOLD = 60;
export const BOUNTY_REWARD_EXP = 40;

export interface BountyState {
  date: string; // YYYY-MM-DD lokal
  progress: number;
  done: boolean;
}

const KEY = 'mmorpg-bounty-v1';

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function getBounty(): BountyState {
  const fallback: BountyState = { date: today(), progress: 0, done: false };
  try {
    const s = loadJSON<BountyState>(KEY, fallback);
    if (s.date !== today()) return { ...fallback };
    return { date: s.date, progress: s.progress ?? 0, done: !!s.done };
  } catch {
    return { ...fallback };
  }
}

function persist(s: BountyState) {
  saveJSON(KEY, s);
}

/** Dipanggil saat elite mati. Return true bila bounty selesai tepat di kill ini. */
export function registerEliteKill(): boolean {
  const s = getBounty();
  if (s.done) return false;
  s.progress = Math.min(BOUNTY_NEED, s.progress + 1);
  let completed = false;
  if (s.progress >= BOUNTY_NEED) {
    s.done = true;
    completed = true;
  }
  persist(s);
  window.dispatchEvent(new CustomEvent('bounty-changed'));
  return completed;
}
