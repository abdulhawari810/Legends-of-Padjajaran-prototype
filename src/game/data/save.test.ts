import { describe, expect, it } from 'vitest';
import {
  MAX_SLOTS,
  deleteSlot,
  loadMeta,
  loadSlot,
  saveJobSave,
  saveMeta,
  saveSlot,
  slotInfo
} from './save';

describe('save slot (Batch D)', () => {
  it('punya 3 slot, awalnya kosong', () => {
    expect(MAX_SLOTS).toBe(3);
    expect(slotInfo(1).empty).toBe(true);
  });

  it('simpan -> ubah -> muat kembali seperti semula', () => {
    saveMeta({ currentJob: 'mage', killCount: 7 });
    saveJobSave('mage', {
      level: 5,
      exp: 10,
      primary: { str: 2, dex: 4, int: 20, foc: 12, con: 5 },
      weaponId: 'staff-apprentice',
      armorId: 'armor-robe',
      hp: 100,
      mp: 80
    });
    localStorage.setItem('mmorpg-gold-v1', '123');

    expect(saveSlot(1)).toEqual({ ok: true });
    const info = slotInfo(1);
    expect(info.empty).toBe(false);
    expect(info.job).toBe('mage');
    expect(info.level).toBe(5);
    expect(info.kill).toBe(7);
    expect(info.gold).toBe(123);

    // ubah state live
    saveMeta({ currentJob: 'warrior', killCount: 0 });
    localStorage.setItem('mmorpg-gold-v1', '0');

    expect(loadSlot(1)).toEqual({ ok: true });
    expect(loadMeta()).toEqual({ currentJob: 'mage', killCount: 7 });
    expect(localStorage.getItem('mmorpg-gold-v1')).toBe('123');
  });

  it('slot kosong tidak bisa dimuat, nomor invalid ditolak', () => {
    expect(loadSlot(2)).toEqual({ ok: false, reason: 'Slot kosong' });
    expect(saveSlot(99)).toEqual({ ok: false, reason: 'Slot tidak valid' });
  });

  it('hapus slot jadi kosong lagi', () => {
    deleteSlot(1);
    expect(slotInfo(1).empty).toBe(true);
  });
});
