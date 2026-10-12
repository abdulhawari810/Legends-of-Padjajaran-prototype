import { describe, expect, it } from 'vitest';
import { addGold, getGold } from './currency';
import { addItem, getCount } from './inventory';
import {
  depositGold,
  snapshotBank,
  storeItem,
  takeItem,
  withdrawGold
} from './bank';

describe('bank', () => {
  it('mulai kosong', () => {
    expect(snapshotBank()).toEqual({ gold: 0, items: {} });
  });

  it('deposit gagal saat dompet kosong', () => {
    expect(getGold()).toBe(0);
    expect(depositGold(50).ok).toBe(false);
  });

  it('deposit + withdraw 50G', () => {
    addGold(200);
    expect(depositGold(50).ok).toBe(true);
    expect(snapshotBank().gold).toBe(50);
    expect(getGold()).toBe(150);
    expect(withdrawGold(50).ok).toBe(true);
    expect(snapshotBank().gold).toBe(0);
    expect(getGold()).toBe(200);
  });

  it('withdraw gagal saat saldo kurang', () => {
    expect(withdrawGold(10).ok).toBe(false);
  });

  it('store + take item', () => {
    addItem('slime-gel', 3);
    expect(storeItem('slime-gel', 2).ok).toBe(true);
    expect(getCount('slime-gel')).toBe(1);
    expect(snapshotBank().items['slime-gel']).toBe(2);
    expect(takeItem('slime-gel', 1).ok).toBe(true);
    expect(getCount('slime-gel')).toBe(2);
  });

  it('store gagal saat tidak punya', () => {
    expect(storeItem('armor-bone', 1).ok).toBe(false);
  });
});
