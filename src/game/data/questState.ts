import { QUESTS } from './quests';
import { loadJSON, saveJSON } from './persistence';

const KEY = 'mmorpg-quests-v1';

interface Save {
  progress: Record<string, number>;
  done: string[];
  claimed: string[];
}

function load(): Save {
  const fallback: Save = { progress: {}, done: [], claimed: [] };
  const s = loadJSON<Save>(KEY, fallback);
  QUESTS.forEach((q) => {
    if (s.progress[q.id] === undefined) s.progress[q.id] = 0;
  });
  return s;
}

const save: Save = load();
const progress = new Map<string, number>(Object.entries(save.progress));
const done = new Set<string>(save.done);
const claimed = new Set<string>(save.claimed);

function persist() {
  saveJSON(KEY, {
    progress: Object.fromEntries(progress.entries()),
    done: [...done],
    claimed: [...claimed]
  } as Save);
}

export function getQuestProgress(questId: string): number {
  return progress.get(questId) ?? 0;
}

export function isQuestDone(questId: string): boolean {
  return done.has(questId);
}

export function isQuestClaimed(questId: string): boolean {
  return claimed.has(questId);
}

export function canClaim(questId: string): boolean {
  return done.has(questId) && !claimed.has(questId);
}

export function hasClaimable(): boolean {
  return QUESTS.some((q) => canClaim(q.id));
}

export function registerKill(monsterId: string): string[] {
  const completed: string[] = [];
  QUESTS.forEach((q) => {
    if (done.has(q.id)) return;
    if (q.killTarget !== monsterId) return;
    progress.set(q.id, (progress.get(q.id) ?? 0) + 1);
    if ((progress.get(q.id) ?? 0) >= q.killCount) {
      done.add(q.id);
      completed.push(q.id);
    }
  });
  persist();
  window.dispatchEvent(new CustomEvent('quest-changed'));
  return completed;
}

/** Klaim 1x. Return reward atau null bila belum bisa. */
export function claimReward(questId: string): { exp: number; itemId?: string } | null {
  if (!canClaim(questId)) return null;
  const q = QUESTS.find((x) => x.id === questId)!;
  claimed.add(questId);
  persist();
  window.dispatchEvent(new CustomEvent('quest-changed'));
  return { exp: q.rewardExp, itemId: q.rewardItemId };
}

export function snapshotQuests() {
  return QUESTS.map((q) => ({
    ...q,
    progress: getQuestProgress(q.id),
    done: isQuestDone(q.id),
    claimed: isQuestClaimed(q.id),
    claimable: canClaim(q.id)
  }));
}
