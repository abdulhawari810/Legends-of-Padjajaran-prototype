import { describe, expect, it } from 'vitest';
import { addGold } from './currency';
import { ENHANCE_MAX, enhanceCost, getEnhance, tryEnhance } from './enhance';

describe('enhance', () => {
  it('mulai +0, biaya pertama 25G tanpa gel', () => {
    expect(getEnhance('weapon')).toBe(0);
    expect(enhanceCost('weapon')).toEqual({ gold: 25, gel: 0 });
  });

  it('gagal saat gold kurang', () => {
    expect(tryEnhance('weapon').ok).toBe(false);
  });

  it('sukses + naik biaya', () => {
    addGold(1000);
    expect(tryEnhance('weapon').ok).toBe(true);
    expect(getEnhance('weapon')).toBe(1);
    expect(enhanceCost('weapon')).toEqual({ gold: 50, gel: 1 });
  });

  it('butuh gel mulai +1', () => {
    // gel 0 -> gagal walau gold cukup
    expect(tryEnhance('weapon').ok).toBe(false);
  });

  it('max +5', () => {
    expect(ENHANCE_MAX).toBe(5);
  });
});
