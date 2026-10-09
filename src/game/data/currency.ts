import { loadJSON, saveJSON } from './persistence';

const KEY = 'mmorpg-gold-v1';
let gold: number = loadJSON<number>(KEY, 0);

export function getGold(): number {
  return gold;
}

export function addGold(n: number) {
  gold = Math.max(0, gold + n);
  saveJSON(KEY, gold);
  window.dispatchEvent(new CustomEvent('gold-changed', { detail: gold }));
}

export function spendGold(n: number): boolean {
  if (gold < n) return false;
  gold -= n;
  saveJSON(KEY, gold);
  window.dispatchEvent(new CustomEvent('gold-changed', { detail: gold }));
  return true;
}
