import type { Primary } from './attributes';

export type JobId = 'warrior' | 'mage' | 'archer';

export interface Job {
  id: JobId;
  name: string;
  desc: string;
  moveSpeed: number;
  color: number;
  basePrimary: Primary;
  /** growth per level, total 5 poin */
  growthPerLevel: Primary;
}

// 3 job class awal. Primary + growth 5pt/level.
export const JOBS: Job[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    desc: 'Melee tank, HP tinggi.',
    moveSpeed: 170,
    color: 0xef4444,
    basePrimary: { str: 12, dex: 5, int: 2, foc: 3, con: 10 },
    growthPerLevel: { str: 3, dex: 0, int: 0, foc: 0, con: 2 }
  },
  {
    id: 'mage',
    name: 'Mage',
    desc: 'Burst magic, MP besar, lembek.',
    moveSpeed: 160,
    color: 0x3b82f6,
    basePrimary: { str: 2, dex: 4, int: 12, foc: 8, con: 5 },
    growthPerLevel: { str: 0, dex: 0, int: 3, foc: 2, con: 0 }
  },
  {
    id: 'archer',
    name: 'Archer',
    desc: 'Serangan cepat jarak menengah.',
    moveSpeed: 190,
    color: 0x22c55e,
    basePrimary: { str: 5, dex: 12, int: 3, foc: 3, con: 7 },
    growthPerLevel: { str: 1, dex: 3, int: 0, foc: 0, con: 1 }
  }
];
