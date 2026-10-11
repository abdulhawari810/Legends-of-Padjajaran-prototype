import { describe, expect, it } from 'vitest';
import { addGold } from './currency';
import { addDeath, addKill, addSkillUse, getStats } from './stats';
import {
  checkDeaths,
  checkKills,
  checkLevel,
  checkRich,
  checkSkills,
  checkTravel,
  isUnlocked
} from './achievements';
import { visitMap } from './stats';

describe('achievements', () => {
  it('first-blood dari 1 kill', () => {
    addKill('slime');
    checkKills('slime');
    expect(isUnlocked('first-blood')).toBe(true);
  });

  it('troll + traveler + rich + deaths + skills', () => {
    addKill('cave-troll');
    checkKills('cave-troll');
    expect(isUnlocked('troll-1')).toBe(true);

    visitMap('greenfield');
    visitMap('dark');
    visitMap('cave');
    checkTravel();
    expect(isUnlocked('traveler')).toBe(true);

    addGold(600);
    checkRich(600);
    expect(isUnlocked('rich-500')).toBe(true);

    for (let i = 0; i < 10; i++) addDeath();
    checkDeaths();
    expect(isUnlocked('die-10')).toBe(true);

    for (let i = 0; i < 50; i++) addSkillUse();
    checkSkills();
    expect(isUnlocked('skill-50')).toBe(true);

    expect(getStats().skillUses).toBe(50);
  });

  it('level-10', () => {
    checkLevel(10);
    expect(isUnlocked('level-10')).toBe(true);
    checkLevel(9);
    expect(isUnlocked('level-10')).toBe(true);
  });
});
