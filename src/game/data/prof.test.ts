import { describe, expect, it } from 'vitest';
import {
  addProfXp,
  bonusChance,
  channelTimeMs,
  getProf,
  rollGatherLoot
} from './prof';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('prof', () => {
  it('mulai Lv.1, channel 3.5 dtk', () => {
    expect(getProf('mining')).toEqual({ lvl: 1, xp: 0 });
    expect(channelTimeMs('mining')).toBe(3500);
    expect(bonusChance('herb')).toBeCloseTo(0.1);
  });

  it('loot ore 1-7, herb 1-3', () => {
    for (let i = 0; i < 60; i++) {
      const o = rollGatherLoot('ore', seeded(i + 1));
      expect(o).toBeGreaterThanOrEqual(1);
      expect(o).toBeLessThanOrEqual(7);
      const h = rollGatherLoot('herb', seeded(i + 1));
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(3);
    }
  });

  it('seed sama = hasil sama', () => {
    expect(rollGatherLoot('ore', seeded(9))).toBe(rollGatherLoot('ore', seeded(9)));
  });

  it('12 xp naik ke Lv.2 + channel lebih cepat', () => {
    expect(addProfXp('mining', 6)).toBe(false);
    expect(addProfXp('mining', 6)).toBe(true);
    expect(getProf('mining').lvl).toBe(2);
    expect(channelTimeMs('mining')).toBe(3350);
  });
});
