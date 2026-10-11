import { describe, expect, it } from 'vitest';
import { addClaim, addDeath, addKill, addSkillUse, getStats, totalKills, visitMap } from './stats';

describe('stats', () => {
  it('awal kosong', () => {
    const s = getStats();
    expect(totalKills(s)).toBe(0);
    expect(s.deaths).toBe(0);
  });

  it('kill terhitung per monster', () => {
    addKill('slime');
    addKill('slime');
    addKill('goblin');
    const s = getStats();
    expect(s.kills['slime']).toBe(2);
    expect(totalKills(s)).toBe(3);
  });

  it('death/claim/skill/visit terhitung', () => {
    addDeath();
    addClaim();
    addSkillUse();
    visitMap('dark');
    visitMap('dark');
    const s = getStats();
    expect(s.deaths).toBe(1);
    expect(s.claims).toBe(1);
    expect(s.skillUses).toBe(1);
    expect(s.visited).toEqual(['dark']);
  });
});
