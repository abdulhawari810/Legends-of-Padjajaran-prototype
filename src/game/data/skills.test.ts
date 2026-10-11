import { describe, expect, it } from 'vitest';
import { SKILLS, getSkill } from './skills';
import type { JobId } from './jobs';

const JOBS: JobId[] = ['warrior', 'mage', 'archer'];

describe('skills', () => {
  it('tiap job punya tepat 3 skill', () => {
    JOBS.forEach((j) => {
      expect(SKILLS[j]).toHaveLength(3);
      expect(getSkill(j, 0)?.id).toBeTruthy();
      expect(getSkill(j, 1)?.id).toBeTruthy();
      expect(getSkill(j, 2)?.id).toBeTruthy();
      expect(getSkill(j, 3)).toBeUndefined();
    });
  });

  it('id unik per job, MP & cooldown positif', () => {
    JOBS.forEach((j) => {
      const ids = SKILLS[j].map((s) => s.id);
      expect(new Set(ids).size).toBe(3);
      SKILLS[j].forEach((s) => {
        expect(s.mpCost).toBeGreaterThan(0);
        expect(s.cooldownMs).toBeGreaterThan(0);
        expect(s.icon.length).toBeGreaterThan(0);
      });
    });
  });

  it('slot 0 = skill lama', () => {
    expect(getSkill('warrior', 0)?.id).toBe('whirlwind');
    expect(getSkill('mage', 0)?.id).toBe('fireball');
    expect(getSkill('archer', 0)?.id).toBe('double-shot');
  });
});
