import { describe, expect, it } from 'vitest';
import { BOUNTIES, getBounties, registerKillBounty } from './bounty';

describe('bounty', () => {
  it('3 bounty tersedia, belum selesai di save baru', () => {
    const list = getBounties();
    expect(list).toHaveLength(3);
    expect(list.every((b) => !b.done)).toBe(true);
  });

  it('kill biasa tidak selesaikan apa-apa', () => {
    expect(registerKillBounty('slime')).toEqual([]);
  });

  it('elite 1x selesaikan bounty green', () => {
    const done = registerKillBounty('skeleton-elite');
    expect(done.map((b) => b.id)).toContain('b-green');
    expect(getBounties().find((b) => b.id === 'b-green')?.done).toBe(true);
  });

  it('golem butuh 2x', () => {
    expect(registerKillBounty('golem')).toEqual([]);
    const done = registerKillBounty('golem');
    expect(done.map((b) => b.id)).toContain('b-dark');
  });

  it('BOUNTIES konsisten (need/reward positif)', () => {
    BOUNTIES.forEach((b) => {
      expect(b.need).toBeGreaterThan(0);
      expect(b.gold).toBeGreaterThan(0);
      expect(b.exp).toBeGreaterThan(0);
    });
  });
});
