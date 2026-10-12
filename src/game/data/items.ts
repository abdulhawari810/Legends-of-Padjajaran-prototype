import type { JobId } from './jobs';
import type { Primary } from './attributes';

export type EquipSlot = 'weapon' | 'armor';
export type WeaponKind = 'melee' | 'magic' | 'ranged';
/** Jenis quick-slot (toolbar bawah). Menentukan item apa yang boleh dipasang. */
export type QuickKind = 'hp' | 'mp' | 'food';

export interface ItemDef {
  id: string;
  name: string;
  type: 'consumable' | 'weapon' | 'armor' | 'quest' | 'material';
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
  // --- consumable / quick-slot ---
  /** Restore mana (persen max MP, dengan minimum). */
  mana?: number;
  /** Regenerasi HP per detik selama durMs. */
  regenHp?: number;
  /** Tambah atk flat selama durMs (buff makanan). */
  buffAtk?: number;
  /** Tambah armor flat selama durMs. */
  buffDef?: number;
  /** Lamanya buff aktif (ms). */
  durMs?: number;
  /** Jenis quick-slot yang menerima item ini. */
  quick?: QuickKind;
  icon?: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'potion-s', name: 'Small Potion', type: 'consumable', desc: 'Pulihkan 40% HP (min 50).', heal: 50, quick: 'hp', icon: '🧪' },
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
  { id: 'slime-gel', name: 'Slime Gel', type: 'quest', desc: 'Drop quest dari Slime.' },
  { id: 'iron-ore', name: 'Iron Ore', type: 'material', desc: 'Hasil mining. Jual / bahan tempa.' },
  { id: 'herb', name: 'Wild Herb', type: 'material', desc: 'Hasil herbalism. Jual.' },
  // --- consumable quick-slot: MP + food buff ---
  {
    id: 'potion-m',
    name: 'Small Mana Potion',
    type: 'consumable',
    desc: 'Pulihkan 40% MP (min 40).',
    mana: 40,
    quick: 'mp',
    icon: '🔮'
  },
  {
    id: 'roast-meat',
    name: 'Roast Meat',
    type: 'consumable',
    desc: 'Buff +5 Atk selama 30 detik.',
    buffAtk: 5,
    durMs: 30000,
    quick: 'food',
    icon: '🍖'
  },
  {
    id: 'herbal-tonic',
    name: 'Herbal Tonic',
    type: 'consumable',
    desc: 'Buff +4 Armor selama 30 detik.',
    buffDef: 4,
    durMs: 30000,
    quick: 'food',
    icon: '🍵'
  }
];

export function getItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** Item consumable yang boleh dipasang ke quick-slot Certain jenis. */
export function quickItemsFor(kind: QuickKind): ItemDef[] {
  return ITEMS.filter((i) => i.type === 'consumable' && i.quick === kind);
}

/** true bila item boleh dipasang ke slot jenis `kind`. */
export function fitsQuickSlot(id: string, kind: QuickKind): boolean {
  return quickItemsFor(kind).some((i) => i.id === id);
}
