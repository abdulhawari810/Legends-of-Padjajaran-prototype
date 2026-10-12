// Sistem atribut flat: 5 primary ala New World + derived combat ala WoW.
// File ini MURNI (tanpa Phaser) agar gampang di-unit-test.

export interface Primary {
  str: number; // strength
  dex: number; // dexterity
  int: number; // intelligence
  foc: number; // focus
  con: number; // constitution
}

export interface Derived {
  maxHp: number;
  maxMp: number;
  pAtk: number;
  rAtk: number;
  mAtk: number;
  heal: number;
  armor: number;
  magicRes: number;
  critRate: number; // 0.05 = 5%
  critDmg: number; // 1.5 = 150%
  hastePct: number; // 0.1 = 10% ( cooldown + attack speed )
  armorPen: number;
  magicPen: number;
  dodge: number; // 0.05 = 5%
  blockChance: number;
  blockValue: number; // 0.3 = reduce 30% saat block
  hpRegen: number; // per 5 detik
  mpRegen: number; // per 5 detik
  moveSpeedBonus: number; // 0.05 = +5%
  lifesteal: number; // 0.02 = 2% dmg jadi HP
  tenacity: number; // 0.1 = -10% durasi CC / dmg monster tertentu
}

export const ZERO_PRIMARY: Primary = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };

// Formula flat yang disepakati (tuning Lv1-20, 1 map).
export function calcDerived(p: Primary): Derived {
  const maxHp = Math.round(100 + p.con * 15);
  const maxMp = Math.round(40 + p.int * 3 + p.foc * 5);

  const pAtk = Math.round(10 + p.str * 2.0 + p.dex * 0.5);
  const rAtk = Math.round(10 + p.dex * 2.0 + p.str * 0.5);
  const mAtk = Math.round(12 + p.int * 2.0 + p.foc * 0.5);
  const heal = Math.round(10 + p.foc * 2.0 + p.int * 0.5);

  const armor = Math.round(p.con * 1.5 + p.str * 0.5);
  const magicRes = Math.round(p.con * 1.0 + p.int * 0.5 + p.foc * 0.5);

  const critRate = 0.05 + p.dex * 0.0015 + p.int * 0.0005;
  const critDmg = 1.5 + p.str * 0.002 + p.int * 0.002;
  // haste dari rating sederhana: tiap 25 INT/FOC/DEX = 1%? flat MVP: dari int+foc
  const hastePct = Math.min(0.4, (p.int + p.foc) * 0.002);

  const armorPen = 0;
  const magicPen = 0;

  const dodge = Math.min(0.3, 0.02 + p.dex * 0.0012 + p.con * 0.0002);
  const blockChance = p.str > 8 ? Math.min(0.4, 0.05 + p.str * 0.001) : 0;
  const blockValue = 0.3;

  const hpRegen = 1 + p.con * 0.3;
  const mpRegen = 1 + p.foc * 0.4;
  const moveSpeedBonus = Math.min(0.2, p.dex * 0.002);
  const lifesteal = Math.min(0.2, p.foc * 0.0005);
  const tenacity = Math.min(0.5, p.con * 0.003);

  return {
    maxHp,
    maxMp,
    pAtk,
    rAtk,
    mAtk,
    heal,
    armor,
    magicRes,
    critRate,
    critDmg,
    hastePct,
    armorPen,
    magicPen,
    dodge,
    blockChance,
    blockValue,
    hpRegen,
    mpRegen,
    moveSpeedBonus,
    lifesteal,
    tenacity
  };
}

// Mitigasi physical: dmg * 100/(100+armor-pen), min 10% dmg masuk.
export function mitigatePhysical(raw: number, armor: number, pen = 0): number {
  const eff = Math.max(0, armor - pen);
  const mult = 100 / (100 + eff);
  return Math.max(1, Math.round(raw * Math.max(0.1, mult)));
}

export function mitigateMagical(raw: number, magicRes: number, pen = 0): number {
  const eff = Math.max(0, magicRes - pen);
  const mult = 100 / (100 + eff);
  return Math.max(1, Math.round(raw * Math.max(0.1, mult)));
}

export function rollCrit(critRate: number): boolean {
  return Math.random() < critRate;
}

// Kurva EXP sederhana untuk Lv 1-20 singleplayer.
export function expForLevel(level: number): number {
  return Math.round(50 * level * (1 + level * 0.2));
}
