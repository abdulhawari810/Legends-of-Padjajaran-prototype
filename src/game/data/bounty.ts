import { loadJSON, saveJSON } from './persistence';

// Batch S: bounty harian per-map (reset tiap hari kalender lokal).
export interface BountyDef {
  id: string;
  name: string;
  target: string; // monster id
  need: number;
  gold: number;
  exp: number;
}

export const BOUNTIES: BountyDef[] = [
  { id: 'b-green', name: 'Bounty Greenfield', target: 'skeleton-elite', need: 1, gold: 60, exp: 40 },
  { id: 'b-dark', name: 'Bounty Dark Forest', target: 'golem', need: 2, gold: 80, exp: 60 },
  { id: 'b-cave', name: 'Bounty Crystal Cave', target: 'cave-troll', need: 1, gold: 120, exp: 100 }
];

export interface BountyState {
  date: string; // YYYY-MM-DD lokal
  progress: Record<string, number>;
  done: string[];
}

const KEY = 'mmorpg-bounty-v1';

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function fresh(): BountyState {
  return { date: today(), progress: {}, done: [] };
}

function load(): BountyState {
  try {
    const s = loadJSON<BountyState>(KEY, fresh());
    if (s.date !== today()) return fresh();
    return { date: s.date, progress: s.progress ?? {}, done: s.done ?? [] };
  } catch {
    return fresh();
  }
}

function persist(s: BountyState) {
  saveJSON(KEY, s);
}

export interface BountyView extends BountyDef {
  progress: number;
  done: boolean;
}

export function getBounties(): BountyView[] {
  const s = load();
  return BOUNTIES.map((b) => ({
    ...b,
    progress: s.progress[b.id] ?? 0,
    done: s.done.includes(b.id)
  }));
}

/** Dipanggil tiap monster mati. Return bounty yang selesai tepat di kill ini. */
export function registerKillBounty(monsterId: string): BountyDef[] {
  const s = load();
  const completed: BountyDef[] = [];
  BOUNTIES.forEach((b) => {
    if (s.done.includes(b.id)) return;
    if (b.target !== monsterId) return;
    s.progress[b.id] = Math.min(b.need, (s.progress[b.id] ?? 0) + 1);
    if (s.progress[b.id] >= b.need) {
      s.done.push(b.id);
      completed.push(b);
    }
  });
  persist(s);
  if (completed.length > 0 || BOUNTIES.some((b) => b.target === monsterId)) {
    window.dispatchEvent(new CustomEvent('bounty-changed'));
  }
  return completed;
}
