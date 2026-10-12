import { describe, expect, it } from 'vitest';
import {
  ATTR_KEYS,
  ZERO_ATTRS,
  canDecrement,
  canIncrement,
  decrementHint,
  hasStagedChange,
  poolAfterStaging,
  stagedUsed,
  totalSpent,
  type AttrMap
} from './attrRules';

const m = (o: Partial<AttrMap> = {}): AttrMap => ({ ...ZERO_ATTRS, ...o });

describe('attrRules — staging', () => {
  it('stagedUsed menjumlahkan semua pending', () => {
    expect(stagedUsed(m())).toBe(0);
    expect(stagedUsed(m({ str: 3, con: 2 }))).toBe(5);
    // pending negatif (pembatalan) ikut terhitung
    expect(stagedUsed(m({ str: 3, dex: -1 }))).toBe(2);
  });

  it('poolAfterStaging mengurangi staging dari pool', () => {
    expect(poolAfterStaging(5, m())).toBe(5);
    expect(poolAfterStaging(5, m({ str: 3 }))).toBe(2);
    expect(poolAfterStaging(5, m({ str: 5 }))).toBe(0);
  });

  it('hasStagedChange true kalau ada pending != 0', () => {
    expect(hasStagedChange(m())).toBe(false);
    expect(hasStagedChange(m({ str: 1 }))).toBe(true);
    expect(hasStagedChange(m({ str: -1 }))).toBe(true);
  });
});

describe('attrRules — tombol +1', () => {
  it('tampil selama masih ada pool', () => {
    expect(canIncrement(5, m())).toBe(true);
    expect(canIncrement(5, m({ str: 4 }))).toBe(true);
  });

  it('sembunyi saat pool habis', () => {
    expect(canIncrement(5, m({ str: 5 }))).toBe(false);
    expect(canIncrement(0, m())).toBe(false);
  });

  it('sembunyi lagi kalau staging dikurangi', () => {
    const p = m({ str: 5 });
    expect(canIncrement(5, p)).toBe(false);
    p.str = 4;
    expect(canIncrement(5, p)).toBe(true);
  });
});

describe('attrRules — tombol -1 (aturan permanen)', () => {
  it('tampil HANYA kalau atribut punya staging positif', () => {
    expect(canDecrement(m({ str: 1 }), 'str')).toBe(true);
    expect(canDecrement(m({ str: 3 }), 'str')).toBe(true);
  });

  it('sembunyi untuk atribut tanpa staging (mis. setelah Terapkan)', () => {
    expect(canDecrement(m(), 'str')).toBe(false);
    // pending 0 = sudah di-commit -> permanen
    expect(canDecrement(m({ str: 0 }), 'str')).toBe(false);
  });

  it('sembunyi kalau staging atribut itu negatif', () => {
    expect(canDecrement(m({ str: -1 }), 'str')).toBe(false);
  });

  it('hanya berlaku untuk atribut yang disentuh', () => {
    const p = m({ str: 2 });
    expect(canDecrement(p, 'str')).toBe(true);
    expect(canDecrement(p, 'dex')).toBe(false);
    expect(canDecrement(p, 'con')).toBe(false);
  });

  it('TIDAK bergantung pada spent (poin lama tidak bisa dikurangi)', () => {
    // regression: dulu canDec memakai `spent[k] + pending[k] > 0`, sehingga
    // setelah "Terapkan" tombol -1 masih muncul padahal poinnya permanen.
    const afterApply = m(); // pending = 0 setelah applyStaged()
    expect(canDecrement(afterApply, 'str')).toBe(false);
  });

  it('TIDAK bergantung pada pool (poin habis tetap bisa dibatalkan)', () => {
    // regression: dulu ada syarat `poolPreview > 0`, sehingga begitu semua
    // poin terpakai tombol -1 hilang padahal staging masih bisa dibatalkan.
    const p = m({ str: 5 });
    expect(canIncrement(5, p)).toBe(false); // pool habis
    expect(canDecrement(p, 'str')).toBe(true); // tapi masih bisa undo
  });

  it('alur penuh: +3 -> -1 -> apply -> tidak ada -1 lagi', () => {
    let pending = m({ str: 3 });
    expect(canDecrement(pending, 'str')).toBe(true);
    pending = m({ str: 2 }); // tekan -1
    expect(canDecrement(pending, 'str')).toBe(true);
    // tekan "Terapkan" -> pending di-nolkan
    pending = m();
    expect(canDecrement(pending, 'str')).toBe(false);
  });
});

describe('attrRules — tooltip & spent', () => {
  it('decrementHint menjelaskan kedua kondisi', () => {
    expect(decrementHint(m({ str: 1 }), 'str')).toContain('membatalkan');
    expect(decrementHint(m(), 'str')).toContain('permanen');
  });

  it('totalSpent menjumlahkan poin permanen', () => {
    expect(totalSpent(m())).toBe(0);
    expect(totalSpent(m({ str: 5, con: 5 }))).toBe(10);
  });
});

describe('attrRules — invarian', () => {
  it('ATTR_KEYS persis 5 dan semua ada di ZERO_ATTRS', () => {
    expect(ATTR_KEYS).toHaveLength(5);
    ATTR_KEYS.forEach((k) => expect(ZERO_ATTRS[k]).toBe(0));
  });

  it('tidak ada staging tersembunyi: hasStagedChange iff stagedUsed != 0', () => {
    const cases: AttrMap[] = [m(), m({ str: 1 }), m({ str: -1 }), m({ dex: 2, foc: -1 })];
    cases.forEach((p) => {
      const changed = hasStagedChange(p);
      const used = stagedUsed(p);
      if (used !== 0) expect(changed).toBe(true);
      else expect(changed).toBe(false);
    });
  });
});