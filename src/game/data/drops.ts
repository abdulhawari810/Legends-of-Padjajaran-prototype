// Drop table murni (testable): monsterId -> gold + item chance.
// Tuning Batch B: gold cukup untuk 1 potion (~20G) tiap 3-4 kill.
export interface DropRoll {
  gold: number;
  items: Array<{ id: string; count: number }>;
}

const TABLE: Record<string, { gold: [number, number]; items: Array<{ id: string; chance: number; count: number }> }> = {
  slime: {
    gold: [2, 6],
    items: [
      { id: 'slime-gel', chance: 0.5, count: 1 },
      { id: 'potion-s', chance: 0.12, count: 1 }
    ]
  },
  goblin: {
    gold: [5, 12],
    items: [
      { id: 'potion-s', chance: 0.2, count: 1 },
      { id: 'armor-chain', chance: 0.08, count: 1 }
    ]
  },
  skeleton: {
    gold: [8, 18],
    items: [
      { id: 'potion-s', chance: 0.25, count: 1 },
      { id: 'armor-bone', chance: 0.1, count: 1 }
    ]
  },
  'skeleton-elite': {
    gold: [25, 45],
    items: [
      { id: 'potion-s', chance: 1.0, count: 1 },
      { id: 'armor-bone', chance: 0.5, count: 1 }
    ]
  },
  wolf: {
    gold: [6, 14],
    items: [
      { id: 'potion-s', chance: 0.18, count: 1 },
      { id: 'slime-gel', chance: 0.2, count: 1 }
    ]
  },
  orc: {
    gold: [10, 20],
    items: [
      { id: 'potion-s', chance: 0.22, count: 1 },
      { id: 'armor-chain', chance: 0.1, count: 1 }
    ]
  },
  golem: {
    gold: [14, 26],
    items: [
      { id: 'potion-s', chance: 0.25, count: 1 },
      { id: 'armor-bone', chance: 0.12, count: 1 }
    ]
  },
  bat: {
    gold: [8, 16],
    items: [{ id: 'potion-s', chance: 0.2, count: 1 }]
  },
  cultist: {
    gold: [12, 22],
    items: [
      { id: 'potion-s', chance: 0.22, count: 1 },
      { id: 'armor-chain', chance: 0.12, count: 1 }
    ]
  },
  'cave-troll': {
    gold: [40, 70],
    items: [
      { id: 'potion-s', chance: 1.0, count: 1 },
      { id: 'armor-bone', chance: 0.5, count: 1 }
    ]
  }
};

export function rollDrops(monsterId: string, rand: () => number = Math.random): DropRoll {
  const t = TABLE[monsterId];
  if (!t) return { gold: 0, items: [] };
  const gold = t.gold[0] + Math.floor(rand() * (t.gold[1] - t.gold[0] + 1));
  const items = t.items
    .filter((d) => rand() < d.chance)
    .map((d) => ({ id: d.id, count: d.count }));
  return { gold, items };
}
