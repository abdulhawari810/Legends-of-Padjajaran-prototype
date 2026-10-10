import { describe, expect, it } from 'vitest';
import { addGold, getGold } from './currency';
import { addItem, getCount } from './inventory';
import { buyItem, sellItem } from './shop';

describe('shop', () => {
  it('beli gagal saat gold kurang', () => {
    expect(getGold()).toBe(0);
    const r = buyItem('potion-s');
    expect(r.ok).toBe(false);
  });

  it('beli potion 20G sukses', () => {
    addGold(100);
    const before = getCount('potion-s');
    const r = buyItem('potion-s');
    expect(r.ok).toBe(true);
    expect(getGold()).toBe(80);
    expect(getCount('potion-s')).toBe(before + 1);
  });

  it('jual gagal saat tidak punya barang', () => {
    expect(getCount('slime-gel')).toBe(0);
    expect(sellItem('slime-gel').ok).toBe(false);
  });

  it('jual gel +5G', () => {
    addItem('slime-gel', 2);
    const goldBefore = getGold();
    const r = sellItem('slime-gel');
    expect(r.ok).toBe(true);
    expect(getGold()).toBe(goldBefore + 5);
    expect(getCount('slime-gel')).toBe(1);
  });

  it('item tak dikenal ditolak', () => {
    expect(buyItem('pedang-legendaris').ok).toBe(false);
    expect(sellItem('pedang-legendaris').ok).toBe(false);
  });
});
