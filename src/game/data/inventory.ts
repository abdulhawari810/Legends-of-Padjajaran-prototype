import { loadJSON, saveJSON } from './persistence';

export type ItemId = string;

const KEY = 'mmorpg-inventory-v1';
const DEFAULTS: Record<string, number> = {
  'potion-s': 3,
  'slime-gel': 0,
  'sword-wood': 1,
  'staff-apprentice': 1,
  'bow-short': 1,
  'armor-plate-wood': 1,
  'armor-robe': 1,
  'armor-leather': 1,
  'armor-chain': 0,
  'armor-bone': 0
};

const stored = loadJSON<Record<string, number>>(KEY, DEFAULTS);
const counts = new Map<ItemId, number>(Object.entries({ ...DEFAULTS, ...stored }));

function persist() {
  saveJSON(KEY, Object.fromEntries(counts.entries()));
}

export function getCount(id: ItemId): number {
  return counts.get(id) ?? 0;
}

export function addItem(id: ItemId, n = 1) {
  counts.set(id, getCount(id) + n);
  persist();
  window.dispatchEvent(new CustomEvent('inventory-changed'));
}

export function removeItem(id: ItemId, n = 1): boolean {
  const cur = getCount(id);
  if (cur < n) return false;
  counts.set(id, cur - n);
  persist();
  window.dispatchEvent(new CustomEvent('inventory-changed'));
  return true;
}

export function snapshotInventory(): Record<string, number> {
  return Object.fromEntries(counts.entries());
}
