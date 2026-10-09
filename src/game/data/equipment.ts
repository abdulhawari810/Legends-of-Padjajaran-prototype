import { getItem } from './items';
import type { JobId } from './jobs';
import type { Derived, Primary } from './attributes';
import { calcDerived } from './attributes';
import { loadJSON, saveJSON } from './persistence';

export interface GearBonus {
  primary: Primary;
  pAtk: number;
  rAtk: number;
  mAtk: number;
  armor: number;
  magicRes: number;
  critRate: number;
}

export const EMPTY_GEAR: GearBonus = {
  primary: { str: 0, dex: 0, int: 0, foc: 0, con: 0 },
  pAtk: 0,
  rAtk: 0,
  mAtk: 0,
  armor: 0,
  magicRes: 0,
  critRate: 0
};

const KEY_W = 'mmorpg-equip-weapon-v1';
const KEY_A = 'mmorpg-equip-armor-v1';

let equippedWeaponId: string | null = loadJSON<string | null>(KEY_W, 'sword-wood');
let equippedArmorId: string | null = loadJSON<string | null>(KEY_A, null);

export function getEquippedWeaponId(): string | null {
  return equippedWeaponId;
}

export function getEquippedArmorId(): string | null {
  return equippedArmorId;
}

export function canEquip(itemId: string, jobId: JobId, level: number): { ok: boolean; reason?: string } {
  const def = getItem(itemId);
  if (!def || (def.type !== 'weapon' && def.type !== 'armor')) return { ok: false, reason: 'Bukan equipment' };
  if (def.jobs && !def.jobs.includes(jobId)) return { ok: false, reason: `Khusus ${def.jobs.join('/')}` };
  if (def.minLevel && level < def.minLevel) return { ok: false, reason: `Butuh Lv.${def.minLevel}` };
  return { ok: true };
}

function emit() {
  window.dispatchEvent(
    new CustomEvent('equipment-changed', { detail: { weapon: equippedWeaponId, armor: equippedArmorId } })
  );
}

export function equipItem(itemId: string, jobId: JobId, level: number): { ok: boolean; reason?: string } {
  const def = getItem(itemId);
  if (!def?.slot) return { ok: false, reason: 'Bukan equipment' };
  const check = canEquip(itemId, jobId, level);
  if (!check.ok) return check;
  if (def.slot === 'weapon') {
    equippedWeaponId = itemId;
    saveJSON(KEY_W, equippedWeaponId);
  } else {
    equippedArmorId = itemId;
    saveJSON(KEY_A, equippedArmorId);
  }
  emit();
  return { ok: true };
}

// backward compat
export function equipWeapon(itemId: string, jobId: JobId, level: number) {
  return equipItem(itemId, jobId, level);
}

export function unequipSlot(slot: 'weapon' | 'armor') {
  if (slot === 'weapon') {
    equippedWeaponId = null;
    saveJSON(KEY_W, null);
  } else {
    equippedArmorId = null;
    saveJSON(KEY_A, null);
  }
  emit();
}

export function unequipWeapon() {
  unequipSlot('weapon');
}

export function starterWeaponFor(jobId: JobId): string {
  if (jobId === 'mage') return 'staff-apprentice';
  if (jobId === 'archer') return 'bow-short';
  return 'sword-wood';
}

export function starterArmorFor(jobId: JobId): string {
  if (jobId === 'mage') return 'armor-robe';
  if (jobId === 'archer') return 'armor-leather';
  return 'armor-plate-wood';
}

function bonusOf(itemId: string | null): GearBonus {
  const empty = structuredClone(EMPTY_GEAR);
  if (!itemId) return empty;
  const def = getItem(itemId);
  if (!def) return empty;
  if (def.primaryBonus) {
    empty.primary.str += def.primaryBonus.str ?? 0;
    empty.primary.dex += def.primaryBonus.dex ?? 0;
    empty.primary.int += def.primaryBonus.int ?? 0;
    empty.primary.foc += def.primaryBonus.foc ?? 0;
    empty.primary.con += def.primaryBonus.con ?? 0;
  }
  empty.pAtk += def.weaponKind === 'melee' ? (def.atk ?? 0) : 0;
  empty.rAtk += def.weaponKind === 'ranged' ? (def.atk ?? 0) : 0;
  empty.mAtk += def.weaponKind === 'magic' ? (def.atk ?? 0) : 0;
  empty.armor += def.def ?? 0;
  empty.magicRes += def.magicDef ?? Math.floor((def.def ?? 0) / 2);
  empty.critRate += def.critRateBonus ?? 0;
  return empty;
}

/** Bonus gear gabungan weapon + armor. Murni. */
export function gearBonusFor(weaponId: string | null, armorId?: string | null): GearBonus {
  const w = bonusOf(weaponId);
  const a = bonusOf(armorId ?? equippedArmorId);
  return {
    primary: {
      str: w.primary.str + a.primary.str,
      dex: w.primary.dex + a.primary.dex,
      int: w.primary.int + a.primary.int,
      foc: w.primary.foc + a.primary.foc,
      con: w.primary.con + a.primary.con
    },
    pAtk: w.pAtk + a.pAtk,
    rAtk: w.rAtk + a.rAtk,
    mAtk: w.mAtk + a.mAtk,
    armor: w.armor + a.armor,
    magicRes: w.magicRes + a.magicRes,
    critRate: w.critRate + a.critRate
  };
}

/** Derived final = calc(primary + gear.primary) + flat gear. */
export function calcDerivedWithGear(base: Primary, gear: GearBonus): Derived {
  const eff: Primary = {
    str: base.str + gear.primary.str,
    dex: base.dex + gear.primary.dex,
    int: base.int + gear.primary.int,
    foc: base.foc + gear.primary.foc,
    con: base.con + gear.primary.con
  };
  const d = calcDerived(eff);
  d.pAtk += gear.pAtk;
  d.rAtk += gear.rAtk;
  d.mAtk += gear.mAtk;
  d.armor += gear.armor;
  d.magicRes += gear.magicRes;
  d.critRate += gear.critRate;
  return d;
}
