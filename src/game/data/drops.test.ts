import { describe, expect, it } from 'vitest';
import { rollDrops } from './drops';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('drops', () => {
  it('monster tak dikenal = kosong', () => {
    expect(rollDrops('naga')).toEqual({ gold: 0, items: [] });
  });

  it('gold slime selalu dalam range', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollDrops('slime', seeded(i + 1));
      expect(r.gold).toBeGreaterThanOrEqual(2);
      expect(r.gold).toBeLessThanOrEqual(6);
    }
  });

  it('seed sama = hasil sama', () => {
    const a = rollDrops('goblin', seeded(7));
    const b = rollDrops('goblin', seeded(7));
    expect(a).toEqual(b);
  });

  it('elite selalu drop potion', () => {
    for (let i = 0; i < 20; i++) {
      const r = rollDrops('skeleton-elite', seeded(i + 100));
      expect(r.items.some((d) => d.id === 'potion-s')).toBe(true);
      expect(r.gold).toBeGreaterThanOrEqual(25);
    }
  });
});
