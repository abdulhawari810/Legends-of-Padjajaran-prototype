import { describe, expect, it } from 'vitest';
import { calcDerived, expForLevel, mitigatePhysical, rollCrit } from './attributes';

describe('attributes', () => {
  it('expForLevel naik per level', () => {
    expect(expForLevel(1)).toBe(60);
    expect(expForLevel(2)).toBeGreaterThan(expForLevel(1));
    expect(expForLevel(20)).toBeGreaterThan(expForLevel(19));
  });

  it('calcDerived: CON menaikkan HP', () => {
    const d = calcDerived({ str: 0, dex: 0, int: 0, foc: 0, con: 10 });
    expect(d.maxHp).toBe(250);
    expect(d.armor).toBe(15);
  });

  it('calcDerived: STR menaikkan P.Atk', () => {
    const a = calcDerived({ str: 10, dex: 0, int: 0, foc: 0, con: 0 });
    const b = calcDerived({ str: 0, dex: 0, int: 0, foc: 0, con: 0 });
    expect(a.pAtk).toBeGreaterThan(b.pAtk);
  });

  it('mitigatePhysical: 0 armor = full, 100 armor = setengah, min 10%', () => {
    expect(mitigatePhysical(100, 0)).toBe(100);
    expect(mitigatePhysical(100, 100)).toBe(50);
    expect(mitigatePhysical(100, 1000)).toBe(10);
  });

  it('rollCrit deterministik di batas', () => {
    expect(rollCrit(0)).toBe(false);
    expect(rollCrit(1)).toBe(true);
  });
});
