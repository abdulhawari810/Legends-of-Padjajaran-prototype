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

/** Terbuka bila tanpa prasyarat atau prasyarat sudah done. */
export function isQuestUnlocked(questId: string): boolean {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return false;
  if (!q.requires) return true;
  return done.has(q.requires);
}

export function canClaim(questId: string): boolean {
  return isQuestUnlocked(questId) && done.has(questId) && !claimed.has(questId);
}

export function hasClaimable(): boolean {
  return QUESTS.some((q) => canClaim(q.id));
}

export function registerKill(monsterId: string): string[] {
  const completed: string[] = [];
  QUESTS.forEach((q) => {
    if (done.has(q.id)) return;
    if (!isQuestUnlocked(q.id)) return;
    if (!q.killTarget || q.killTarget !== monsterId) return;
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

function bump(qid: string, need: number): boolean {
  progress.set(qid, (progress.get(qid) ?? 0) + 1);
  if ((progress.get(qid) ?? 0) >= need && !done.has(qid)) {
    done.add(qid);
    return true;
  }
  return false;
}

function registerGeneric(
  match: (q: (typeof QUESTS)[number]) => number | null
): string[] {
  const completed: string[] = [];
  QUESTS.forEach((q) => {
    if (done.has(q.id)) return;
    if (!isQuestUnlocked(q.id)) return;
    const need = match(q);
    if (need === null) return;
    if (bump(q.id, need)) completed.push(q.id);
  });
  persist();
  window.dispatchEvent(new CustomEvent('quest-changed'));
  return completed;
}

/** Dipanggil tiap gather node (profesi). */
export function registerGather(itemId: string): string[] {
  return registerGeneric((q) => (q.gather && q.gather.item === itemId ? q.gather.count : null));
}

/** Dipanggil tiap beli di vendor. */
export function registerBuy(): string[] {
  return registerGeneric((q) => (q.buy ? q.buy : null));
}

/** Dipanggil tiap jual ke vendor. */
export function registerSell(): string[] {
  return registerGeneric((q) => (q.sell ? q.sell : null));
}

/** Dipanggil tiap setor gold ke bank (akumulasi per quest). */
export function registerDeposit(n: number): string[] {
  const completed: string[] = [];
  QUESTS.forEach((q) => {
    if (done.has(q.id)) return;
    if (!isQuestUnlocked(q.id)) return;
    if (!q.deposit) return;
    progress.set(q.id, (progress.get(q.id) ?? 0) + n);
    if ((progress.get(q.id) ?? 0) >= q.deposit) {
      done.add(q.id);
      completed.push(q.id);
    }
  });
  persist();
  window.dispatchEvent(new CustomEvent('quest-changed'));
  return completed;
}

/** Kebutuhan angka quest (untuk tampilan progress). */
export function questNeed(qid: string): number {
  const q = QUESTS.find((x) => x.id === qid);
  if (!q) return 0;
  if (q.gather) return q.gather.count;
  if (q.buy) return q.buy;
  if (q.sell) return q.sell;
  if (q.deposit) return q.deposit;
  return q.killCount;
}

/** Teks objektif + progress, untuk panel quest/NPC. */
export function objectiveText(
  q: { killTarget: string; killCount: number; gather?: { item: string; count: number }; buy?: number; sell?: number; deposit?: number },
  progress: number
): string {
  if (q.gather) return `🌿 ${q.gather.item} (${Math.min(progress, q.gather.count)}/${q.gather.count})`;
  if (q.buy) return `🛒 Beli (${Math.min(progress, q.buy)}/${q.buy})`;
  if (q.sell) return `💰 Jual (${Math.min(progress, q.sell)}/${q.sell})`;
  if (q.deposit) return `🏦 Setor (${Math.min(progress, q.deposit)}G/${q.deposit}G)`;
  return `⚔️ ${Math.min(progress, q.killCount)}/${q.killCount}`;
}

/** Klaim 1x. Return reward atau null bila belum bisa. */
export function claimReward(questId: string): { exp: number; itemId?: string; gold?: number } | null {
  if (!canClaim(questId)) return null;
  const q = QUESTS.find((x) => x.id === questId)!;
  claimed.add(questId);
  persist();
  window.dispatchEvent(new CustomEvent('quest-changed'));
  return { exp: q.rewardExp, itemId: q.rewardItemId, gold: q.rewardGold };
}

export function snapshotQuests() {
  return QUESTS.map((q) => ({
    ...q,
    progress: getQuestProgress(q.id),
    done: isQuestDone(q.id),
    claimed: isQuestClaimed(q.id),
    claimable: canClaim(q.id),
    unlocked: isQuestUnlocked(q.id)
  }));
}
