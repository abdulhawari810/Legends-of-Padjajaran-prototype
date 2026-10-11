import type { JobId } from './jobs';
import type { Primary } from './attributes';

export type EquipSlot = 'weapon' | 'armor';
export type WeaponKind = 'melee' | 'magic' | 'ranged';

export interface ItemDef {
  id: string;
  name: string;
  type: 'consumable' | 'weapon' | 'armor' | 'quest';
  desc: string;
  heal?: number;
  // --- equip core ---
  slot?: EquipSlot;
  weaponKind?: WeaponKind;
  jobs?: JobId[];
  minLevel?: number;
  atk?: number; // flat ke atk sesuai weaponKind
  def?: number; // flat armor + magicRes separuh
  magicDef?: number;
  primaryBonus?: Partial<Primary>;
  critRateBonus?: number;
}

export const ITEMS: ItemDef[] = [
  { id: 'potion-s', name: 'Small Potion', type: 'consumable', desc: 'Pulihkan 40% HP (min 50).', heal: 50 },
  {
    id: 'sword-wood',
    name: 'Wooden Sword',
    type: 'weapon',
    desc: 'Pedang latihan warrior. +5 P.Atk, +1 STR.',
    slot: 'weapon',
    weaponKind: 'melee',
    jobs: ['warrior'],
    atk: 5,
    primaryBonus: { str: 1 }
  },
  {
    id: 'staff-apprentice',
    name: 'Apprentice Staff',
    type: 'weapon',
    desc: 'Tongkat mage pemula. +7 M.Atk, +2 INT.',
    slot: 'weapon',
    weaponKind: 'magic',
    jobs: ['mage'],
    atk: 7,
    primaryBonus: { int: 2 }
  },
  {
    id: 'bow-short',
    name: 'Short Bow',
    type: 'weapon',
    desc: 'Busur archer pemula. +6 R.Atk, +1 DEX.',
    slot: 'weapon',
    weaponKind: 'ranged',
    jobs: ['archer'],
    atk: 6,
    primaryBonus: { dex: 1 }
  },
  // --- armor starter (def = armor, magicDef default = def/2) ---
  {
    id: 'armor-plate-wood',
    name: 'Wooden Plate',
    type: 'armor',
    desc: 'Armor warrior. +4 Armor, +2 CON.',
    slot: 'armor',
    jobs: ['warrior'],
    def: 4,
    primaryBonus: { con: 2 }
  },
  {
    id: 'armor-robe',
    name: 'Apprentice Robe',
    type: 'armor',
    desc: 'Jubah mage. +2 Armor, +2 INT.',
    slot: 'armor',
    jobs: ['mage'],
    def: 2,
    primaryBonus: { int: 2 }
  },
  {
    id: 'armor-leather',
    name: 'Leather Vest',
    type: 'armor',
    desc: 'Rompi archer. +3 Armor, +1 DEX +1 CON.',
    slot: 'armor',
    jobs: ['archer'],
    def: 3,
    primaryBonus: { dex: 1, con: 1 }
  },
  // --- armor drop ---
  {
    id: 'armor-chain',
    name: 'Goblin Chain',
    type: 'armor',
    desc: 'Drop goblin 8%. +6 Armor, +3 CON.',
    slot: 'armor',
    jobs: ['warrior', 'archer'],
    minLevel: 2,
    def: 6,
    primaryBonus: { con: 3 }
  },
  {
    id: 'armor-bone',
    name: 'Bone Armor',
    type: 'armor',
    desc: 'Drop skeleton 10%. +5 Armor, +2 CON +1 STR.',
    slot: 'armor',
    jobs: ['warrior'],
    minLevel: 2,
    def: 5,
    primaryBonus: { con: 2, str: 1 }
  },
  { id: 'slime-gel', name: 'Slime Gel', type: 'quest', desc: 'Drop quest dari Slime.' }
];

export function getItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}
