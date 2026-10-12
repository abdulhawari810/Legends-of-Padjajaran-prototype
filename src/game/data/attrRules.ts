// Aturan alokasi atribut (Batch V) — MURNI tanpa Phaser supaya unit-testable.
//
// Model:
//   freePoints : pool poin yang belum dipakai
//   primary    : total atribut (base + growth + committed)
//   spent      : poin yang SUDAH di-commit lewat "Terapkan" (permanen)
//   pending    : staging sesi ini (belum di-commit), boleh + atau -
//
// Aturan kunci: `−1` hanya boleh membatalkan staging sesi ini. Poin yang sudah
// di-commit bersifat PERMANEN; satu-satunya jalan mundur adalah reset (20G).
// Kalau ini dilanggar, tombol "Terapkan" kehilangan makna karena pemain bisa
// meng-commit lalu langsung menguranginya lagi.

export type AttrKey = 'str' | 'dex' | 'int' | 'foc' | 'con';
export type AttrMap = Record<AttrKey, number>;

export const ATTR_KEYS: AttrKey[] = ['str', 'dex', 'int', 'foc', 'con'];

export const ZERO_ATTRS: AttrMap = { str: 0, dex: 0, int: 0, foc: 0, con: 0 };

/** Poin yang sudah terpakai di staging sesi ini. */
export function stagedUsed(pending: AttrMap): number {
  return ATTR_KEYS.reduce((a, k) => a + (pending[k] ?? 0), 0);
}

/** Sisa pool setelah staging (>= 0). */
export function poolAfterStaging(freePoints: number, pending: AttrMap): number {
  return freePoints - stagedUsed(pending);
}

/** true kalau masih ada perubahan yang perlu "Terapkan". */
export function hasStagedChange(pending: AttrMap): boolean {
  return ATTR_KEYS.some((k) => (pending[k] ?? 0) !== 0);
}

/** Total poin permanen yang sudah di-commit. */
export function totalSpent(spent: AttrMap): number {
  return ATTR_KEYS.reduce((a, k) => a + (spent[k] ?? 0), 0);
}

/**
 * Tombol `+1` tampil kalau masih ada pool poin setelah staging.
 */
export function canIncrement(freePoints: number, pending: AttrMap): boolean {
  return poolAfterStaging(freePoints, pending) > 0;
}

/**
 * Tombol `−1` tampil HANYA kalau atribut itu punya staging positif di sesi ini.
 *
 * Setelah "Terapkan", pending = 0 -> tombol hilang = atribut permanen.
 * Tombol ini juga tetap tampil walau pool sudah habis, karena yang dibatalkan
 * adalah staging (bukan mengambil poin baru).
 */
export function canDecrement(pending: AttrMap, key: AttrKey): boolean {
  return (pending[key] ?? 0) > 0;
}

/** Alasan `−1` disembunyikan (untuk tooltip UI). */
export function decrementHint(pending: AttrMap, key: AttrKey): string {
  return canDecrement(pending, key)
    ? 'Poin menunggu "Terapkan" — tekan −1 untuk membatalkan'
    : 'Sudah permanen — tekan +1 dulu untuk menambah, lalu −1 untuk membatalkan';
}