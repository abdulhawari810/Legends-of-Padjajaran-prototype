import { loadJSON, saveJSON } from './persistence';
import { addGold, getGold, spendGold } from './currency';
import { addItem, getCount, removeItem } from './inventory';

// Batch W: bank brankas (gold anti-penalti) + stash item.
export interface BankSave {
  gold: number;
  items: Record<string, number>;
}

const KEY = 'mmorpg-bank-v1';

function load(): BankSave {
  try {
    const s = loadJSON<Partial<BankSave>>(KEY, {});
    return { gold: Math.max(0, s.gold ?? 0), items: { ...(s.items ?? {}) } };
  } catch {
    return { gold: 0, items: {} };
  }
}

let bank: BankSave = load();

function persist() {
  saveJSON(KEY, bank);
  window.dispatchEvent(new CustomEvent('bank-changed'));
}

export function snapshotBank(): BankSave {
  return { gold: bank.gold, items: { ...bank.items } };
}

export function depositGold(n: number): { ok: boolean; reason?: string } {
  if (n <= 0) return { ok: false, reason: 'Nominal salah' };
  if (getGold() < n) return { ok: false, reason: 'Gold kurang' };
  if (!spendGold(n)) return { ok: false, reason: 'Gold kurang' };
  bank.gold += n;
  persist();
  window.dispatchEvent(new CustomEvent('bank-deposited', { detail: n }));
  return { ok: true };
}

export function withdrawGold(n: number): { ok: boolean; reason?: string } {
  if (n <= 0) return { ok: false, reason: 'Nominal salah' };
  if (bank.gold < n) return { ok: false, reason: 'Saldo kurang' };
  bank.gold -= n;
  persist();
  addGold(n);
  return { ok: true };
}

export function storeItem(id: string, n = 1): { ok: boolean; reason?: string } {
  if (getCount(id) < n) return { ok: false, reason: 'Tidak punya' };
  if (!removeItem(id, n)) return { ok: false, reason: 'Gagal simpan' };
  bank.items[id] = (bank.items[id] ?? 0) + n;
  persist();
  return { ok: true };
}

export function takeItem(id: string, n = 1): { ok: boolean; reason?: string } {
  if ((bank.items[id] ?? 0) < n) return { ok: false, reason: 'Stok kurang' };
  bank.items[id] -= n;
  if (bank.items[id] <= 0) delete bank.items[id];
  persist();
  addItem(id, n);
  return { ok: true };
}
