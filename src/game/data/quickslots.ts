import { fitsQuickSlot, getItem } from './items';
import { getCount } from './inventory';
import { scopedKey, loadJSON, saveJSON } from './persistence';

// 3 quick-slot di toolbar bawah: slot 1 = HP, slot 2 = MP, slot 3 = food buff.
// Item dipasang lewat panel Equipment, dipakai lewat tombol HUD.
export type QuickKind = 'hp' | 'mp' | 'food';
export type QuickSlotIndex = 0 | 1 | 2;

export const QUICK_KINDS: QuickKind[] = ['hp', 'mp', 'food'];

const KEY = (): string => scopedKey('mmorpg-quickslots-v1');

/** Slot kosong = null (bukan string kosong). */
export type QuickSlots = [string | null, string | null, string | null];

const DEFAULTS: QuickSlots = ['potion-s', null, null];

function sanitize(raw: unknown): QuickSlots {
  const arr = Array.isArray(raw) ? raw : [];
  return QUICK_KINDS.map((kind, i) => {
    const id = arr[i];
    if (typeof id !== 'string' || !id) return null;
    // item yang sudah dihapus / tidak cocok jenis -> kosongkan, jangan crash
    return fitsQuickSlot(id, kind) ? id : null;
  }) as QuickSlots;
}

let slots: QuickSlots = sanitize(loadJSON<unknown>(KEY(), DEFAULTS));

function persist() {
  saveJSON(KEY(), slots);
  window.dispatchEvent(new CustomEvent('quickslots-changed', { detail: [...slots] }));
}

/** Item terpasang di slot i, atau null. */
export function getQuickItem(i: QuickSlotIndex): string | null {
  return slots[i] ?? null;
}

/** Pasang item ke slot. Gagal bila item tidak cocok jenis slot. */
export function setQuickItem(i: QuickSlotIndex, itemId: string | null): { ok: boolean; reason?: string } {
  if (i < 0 || i >= QUICK_KINDS.length) return { ok: false, reason: 'Slot tidak valid' };
  if (itemId === null) {
    slots[i] = null;
    persist();
    return { ok: true };
  }
  const def = getItem(itemId);
  if (!def) return { ok: false, reason: 'Item tidak dikenal' };
  if (!fitsQuickSlot(itemId, QUICK_KINDS[i])) {
    return { ok: false, reason: `Bukan item slot ${labelOf(QUICK_KINDS[i])}` };
  }
  // satu item hanya boleh di satu slot (terutama item yang sama di 2 slot)
  for (let k = 0; k < slots.length; k++) {
    if (k !== i && slots[k] === itemId) slots[k] = null;
  }
  slots[i] = itemId;
  persist();
  return { ok: true };
}

/** Kosongkan slot i (dipakai saat item yang terpasang hilang dari inventory). */
export function clearQuickItem(i: QuickSlotIndex): void {
  if (i < 0 || i >= slots.length) return;
  slots[i] = null;
  persist();
}

/**
 * Kosongkan slot yang itemnya sudah habis (jumlah 0) atau tidak lagi cocok
 * dengan jenis slot. Ini yang membuat slot tidak "nyangkut" ke item yang sudah
 * dibakar habis — pemain langsung melihat slot kosong dan bisa pasang baru.
 * Return jumlah slot yang dibersihkan.
 */
export function pruneEmptySlots(): number {
  let changed = 0;
  QUICK_KINDS.forEach((kind, i) => {
    const id = slots[i];
    if (!id) return;
    const gone = getCount(id) <= 0;
    const wrongKind = !fitsQuickSlot(id, kind);
    if (gone || wrongKind) {
      slots[i] = null;
      changed++;
    }
  });
  if (changed > 0) persist();
  return changed;
}

export function labelOf(kind: QuickKind): string {
  return kind === 'hp' ? 'HP' : kind === 'mp' ? 'MP' : 'Food';
}