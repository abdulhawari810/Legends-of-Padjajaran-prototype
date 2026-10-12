import { describe, expect, it } from 'vitest';
import { addGold } from './currency';
import {
  SKILL_MAX_LEVEL,
  getSkillLevel,
  skillCastMs,
  skillCd,
  skillDamageMult,
  skillUpgradeCost,
  tryUpgradeSkill
} from './skillLevel';

describe('skillLevel', () => {
  it('cast fireball 3.5 dtk, berkurang per level', () => {
    expect(skillCastMs('mage', 0, 3500)).toBe(3500);
  });

  it('mulai Lv.1, mult 1, cd penuh', () => {
    expect(getSkillLevel('warrior', 0)).toBe(1);
    expect(skillDamageMult('warrior', 0)).toBe(1);
    expect(skillCd('warrior', 0, 8000)).toBe(8000);
    expect(skillUpgradeCost('warrior', 0)).toEqual({ gold: 100 });
  });

  it('gagal saat gold kurang', () => {
    expect(tryUpgradeSkill('mage', 0).ok).toBe(false);
  });

  it('upgrade 1->2: mult 1.3, cd -1 dtk, biaya naik', () => {
    addGold(1000);
    expect(tryUpgradeSkill('mage', 0).ok).toBe(true);
    expect(getSkillLevel('mage', 0)).toBe(2);
    expect(skillDamageMult('mage', 0)).toBeCloseTo(1.3);
    expect(skillCd('mage', 0, 5000)).toBe(4000);
    expect(skillUpgradeCost('mage', 0)).toEqual({ gold: 250 });
  });

  it('max Lv.3, cd tidak di bawah 3 dtk, cast berkurang', () => {
    addGold(1000);
    expect(tryUpgradeSkill('mage', 0).ok).toBe(true);
    expect(getSkillLevel('mage', 0)).toBe(3);
    expect(tryUpgradeSkill('mage', 0).ok).toBe(false);
    expect(skillUpgradeCost('mage', 0)).toBeNull();
    expect(skillCd('mage', 0, 5000)).toBe(3000);
    expect(skillCastMs('mage', 0, 3500)).toBe(2500);
    expect(SKILL_MAX_LEVEL).toBe(3);
  });
});
