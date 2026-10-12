import { beforeEach, describe, expect, it } from 'vitest';
import { ITEMS, fitsQuickSlot, getItem, quickItemsFor } from './items';
import {
  QUICK_KINDS,
  clearQuickItem,
  getQuickItem,
  labelOf,
  pruneEmptySlots,
  setQuickItem,
  type QuickSlotIndex
} from './quickslots';
import { addItem, getCount, removeItem } from './inventory';

function resetSlots() {
  QUICK_KINDS.forEach((_, i) => clearQuickItem(i as QuickSlotIndex));
}

describe('items consumable', () => {
  it('semua consumable punya quick kind + minimal satu efek', () => {
    ITEMS.filter((i) => i.type === 'consumable').forEach((it) => {
      expect(it.quick, `${it.id} tanpa quick kind`).toBeDefined();
      const hasEffect = !!(it.heal || it.mana || it.buffAtk || it.buffDef || it.regenHp);
      expect(hasEffect, `${it.id} tanpa efek`).toBe(true);
    });
  });

  it('item buff punya durasi > 0', () => {
    ITEMS.filter((i) => i.buffAtk || i.buffDef).forEach((it) => {
      expect(it.durMs, `${it.id} tanpa durMs`).toBeGreaterThan(0);
    });
  });

  it('quickItemsFor tidak pernah menyertakan weapon/armor/material', () => {
    QUICK_KINDS.forEach((k) => {
      quickItemsFor(k).forEach((it) => expect(it.type).toBe('consumable'));
    });
  });

  it('fitsQuickSlot menolak item tak dikenal', () => {
    expect(fitsQuickSlot('tidak-ada', 'hp')).toBe(false);
  });

  it('weapon/armor/material tidak masuk quick slot', () => {
    expect(fitsQuickSlot('sword-wood', 'hp')).toBe(false);
    expect(fitsQuickSlot('armor-robe', 'food')).toBe(false);
    expect(fitsQuickSlot('iron-ore', 'mp')).toBe(false);
    expect(fitsQuickSlot('slime-gel', 'hp')).toBe(false);
  });
});

describe('quickslots', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSlots();
    addItem('potion-s', 3);
    addItem('potion-m', 2);
    addItem('roast-meat', 1);
  });

  it('pasang item ke slot yang cocok', () => {
    expect(setQuickItem(1, 'potion-m').ok).toBe(true);
    expect(getQuickItem(1)).toBe('potion-m');
  });

  it('tolak item yang jenisnya beda', () => {
    const r = setQuickItem(0, 'potion-m');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('HP');
    expect(getQuickItem(0)).toBe(null);
  });

  it('tolak item tak dikenal', () => {
    expect(setQuickItem(0, 'tidak-ada').ok).toBe(false);
  });

  it('makanan tidak bisa masuk slot potion', () => {
    setQuickItem(2, 'roast-meat');
    expect(getQuickItem(2)).toBe('roast-meat');
    expect(setQuickItem(0, 'roast-meat').ok).toBe(false);
    expect(getQuickItem(2)).toBe('roast-meat');
  });

  it('lepas slot dengan null', () => {
    setQuickItem(0, 'potion-s');
    expect(setQuickItem(0, null).ok).toBe(true);
    expect(getQuickItem(0)).toBe(null);
  });

  it('clearQuickItem mengosongkan slot', () => {
    setQuickItem(2, 'roast-meat');
    clearQuickItem(2);
    expect(getQuickItem(2)).toBe(null);
  });

  it('label slot sesuai jenis', () => {
    expect(labelOf('hp')).toBe('HP');
    expect(labelOf('mp')).toBe('MP');
    expect(labelOf('food')).toBe('Food');
  });
});

describe('pruneEmptySlots', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSlots();
    addItem('potion-s', 2);
    addItem('potion-m', 2);
    addItem('roast-meat', 2);
  });

  it('slot dengan item valid tetap utuh', () => {
    setQuickItem(0, 'potion-s');
    setQuickItem(1, 'potion-m');
    setQuickItem(2, 'roast-meat');
    expect(pruneEmptySlots()).toBe(0);
    expect(getQuickItem(0)).toBe('potion-s');
    expect(getQuickItem(1)).toBe('potion-m');
    expect(getQuickItem(2)).toBe('roast-meat');
  });

  it('slot dengan item habis (0) dikosongkan', () => {
    setQuickItem(0, 'potion-s');
    setQuickItem(1, 'potion-m');
    // habiskan potion MP
    while (getCount('potion-m') > 0) removeItem('potion-m', 1);
    expect(getCount('potion-m')).toBe(0);
    expect(pruneEmptySlots()).toBe(1);
    expect(getQuickItem(1)).toBe(null);
    expect(getQuickItem(0)).toBe('potion-s');
  });

  it('slot kosong tidak_report sebagai perubahan', () => {
    expect(pruneEmptySlots()).toBe(0);
  });

  it('semua slot habis dibersihkan sekaligus', () => {
    setQuickItem(0, 'potion-s');
    setQuickItem(1, 'potion-m');
    setQuickItem(2, 'roast-meat');
    ['potion-s', 'potion-m', 'roast-meat'].forEach((id) => {
      while (getCount(id) > 0) removeItem(id, 1);
    });
    expect(pruneEmptySlots()).toBe(3);
    expect(getQuickItem(0)).toBe(null);
    expect(getQuickItem(1)).toBe(null);
    expect(getQuickItem(2)).toBe(null);
  });

  it('item yang hilang dari inventory dibersihkan dari slot', () => {
    setQuickItem(0, 'potion-s');
    while (getCount('potion-s') > 0) removeItem('potion-s', 1);
    expect(pruneEmptySlots()).toBe(1);
    expect(getQuickItem(0)).toBe(null);
  });
});