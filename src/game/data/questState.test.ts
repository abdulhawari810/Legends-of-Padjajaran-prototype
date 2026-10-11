import { describe, expect, it } from 'vitest';
import {
  canClaim,
  claimReward,
  isQuestDone,
  isQuestUnlocked,
  registerKill,
  snapshotQuests
} from './questState';

describe('questState', () => {
  it('tutorial terbuka duluan, slime terkunci', () => {
    expect(isQuestUnlocked('q-start-01')).toBe(true);
    expect(isQuestUnlocked('q-slime-01')).toBe(false);
  });

  it('bunuh slime 1x selesaikan tutorial + buka slime', () => {
    registerKill('slime');
    expect(isQuestDone('q-start-01')).toBe(true);
    expect(isQuestUnlocked('q-slime-01')).toBe(true);
    expect(isQuestDone('q-slime-01')).toBe(false);
  });

  it('kill monster lain tidak ganggu slime', () => {
    const before = snapshotQuests().find((q) => q.id === 'q-slime-01')!.progress;
    registerKill('goblin');
    registerKill('goblin');
    const after = snapshotQuests().find((q) => q.id === 'q-slime-01')!.progress;
    expect(after).toBe(before);
  });

  it('klaim 1x lalu terkunci', () => {
    expect(canClaim('q-start-01')).toBe(true);
    const r = claimReward('q-start-01');
    expect(r).not.toBeNull();
    expect(r!.exp).toBe(10);
    expect(canClaim('q-start-01')).toBe(false);
    expect(claimReward('q-start-01')).toBeNull();
  });
});
