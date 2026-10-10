import { describe, expect, it } from 'vitest';
import { canEquip, gearBonusFor } from './equipment';

describe('equipment', () => {
  it('starter warrior bisa dipakai warrior Lv1', () => {
    expect(canEquip('sword-wood', 'warrior', 1).ok).toBe(true);
    expect(canEquip('armor-plate-wood', 'warrior', 1).ok).toBe(true);
  });

  it('senjata beda job ditolak', () => {
    const r = canEquip('sword-wood', 'mage', 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('warrior');
  });

  it('minLevel dijaga', () => {
    expect(canEquip('armor-chain', 'warrior', 1).ok).toBe(false);
    expect(canEquip('armor-chain', 'warrior', 2).ok).toBe(true);
  });

  it('item tak dikenal / consumable ditolak', () => {
    expect(canEquip('tidak-ada', 'warrior', 1).ok).toBe(false);
    expect(canEquip('potion-s', 'warrior', 1).ok).toBe(false);
  });

  it('bonus gear starter benar (tanpa tempa di save baru)', () => {
    const g = gearBonusFor('sword-wood', 'armor-plate-wood');
    expect(g.pAtk).toBe(5);
    expect(g.armor).toBe(4);
    expect(g.primary.str).toBe(1);
    expect(g.primary.con).toBe(2);
  });
});
