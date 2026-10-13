# 12 — Vitest dari Nol (tulis tes pertamamu)

> Prasyarat: [00](00-fondasi-web.md), [01](01-typescript-dasar.md).
> Tujuan: bisa menulis `*.test.ts` sendiri, bukan cuma menjalankan.

## 1. Apa itu test? Analogi

Test = "asisten yang mengklik ulang semua fitur tiap kamu ubah kode".

* Tanpa test: ubah harga potion → takut quest/shop/bank ikut rusak → tes manual 10 menit.
* Dengan test: `npm test` 3 detik → merah = ada yang rusak, hijau = aman.

Konfigurasi proyek (`vitest.config.ts:4-6`): `include: ['src/**/*.test.ts']`, `environment: 'jsdom'`. Artinya file test HARUS di `src/` dan berakhiran `.test.ts` agar auto-kedetek. Perintah: `npm test` (semua) atau `npx vitest run <path-1-file>` (satu file, cepat).

## 2. Anatomi: `describe` / `it` / `expect`

```ts
import { describe, expect, it } from 'vitest';
import { rollDrops } from './drops';   // fungsi ASLI yang diuji

describe('drops', () => {              // grup: fitur apa
  it('monster tak dikenal = kosong', () => {   // 1 perilaku
    expect(rollDrops('naga')).toEqual({ gold: 0, items: [] });
  });
});
```

* `describe('nama', ...)` — map/folder logika.
* `it('perilaku ...', ...)` — SATU kalimat harapan. Nama harus jelas karena ini yang muncul saat merah.
* `expect(hasil).toBe/toEqual/...` — pembanding:
  * `toBe()` angka/string persis, `toEqual()` object/array, `toContain()` string, `toBeGreaterThanOrEqual()` range.

Pola pikir **Arrange–Act–Assert**: siapkan input → panggil fungsi asli → cek hasil. Contoh nyata `src/game/data/stats.test.ts:11-18` (bunuh slime 2x → `kills['slime']` harus `2`).

## 3. Masalah #1: fungsi random tidak bisa dites? Bisa — injeksi `rand`

Lihat `src/game/data/drops.ts:78`:

```ts
export function rollDrops(monsterId: string, rand: () => number = Math.random): DropRoll {
```

Parameter `rand` default `Math.random`, tapi test mengoper fungsi palsu. Contoh nyata `src/game/data/drops.test.ts:4-10`:

```ts
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
```

`seeded(7)` selalu menghasilkan urutan angka yang SAMA → `rollDrops('goblin', seeded(7))` deterministik → bisa `toEqual`. Trik `() => 0` = gold minimal + semua chance lolos (`0 < chance`); `() => 0.999` = gold maksimal + tidak ada item.

**Aturan:** kalau bikin fungsi random baru, SELALU tambah parameter `rand = Math.random`. Kalau tidak, fungsi itu tidak bisa dites.

## 4. Masalah #2: state global mengotori antar-test — `beforeEach(reset)`

Modul seperti `auth`/`stats` menyimpan ke `localStorage`. Tanpa reset, test ke-2 melihat sisa test ke-1 → hasil goyang. Contoh nyata `src/game/data/auth.test.ts:25-29`:

```ts
function reset() {
  localStorage.clear();
  setActiveProfile(null);
  __resetAuthCache();
}
```

lalu tiap grup memakai `beforeEach(reset)` (`auth.test.ts:48`). `jsdom` menyediakan `localStorage` palsu di Node — itulah gunanya `environment: 'jsdom'`.

Template untuk modul ber-state:

```ts
import { beforeEach, describe, expect, it } from 'vitest';

function reset() { localStorage.clear(); /* + reset modul-mu */ }

describe('fitur-baru', () => {
  beforeEach(reset);
  it('...', () => { /* ... */ });
});
```

## 5. Latihan terpandu (kerjakan tanpa melihat Kunci di bawah!)

Jalankan `npx vitest run src/game/data/drops.test.ts` → catat hasilnya. Sekarang suntik bug latihan (jangan disimpan!):

1. Di `drops.ts:81` ubah `t.gold[0] +` jadi `t.gold[0] + 100 +`. Jalan test → catat kasus apa yang merah + pesan ekspektasi vs aktualnya.
2. Kembalikan (`git checkout -- src/game/data/drops.ts`) → catat hasilnya.
3. Latihan menulis: bikin `src/game/data/harga.test.ts` yang menguji fungsi `totalHarga(keranjang)` khayalanmu — 3 kasus: kosong = 0, 1 item, 2 item. Jalan 1 file itu saja. (Hapus file latihan setelah selesai agar tidak mengotori repo!)

**Kesalahan umum:** nama file `drops-test.ts` / di luar `src/` → tidak jalan (tidak match `*.test.ts`). Test saling bergantung (tanpa `beforeEach`) → lolos sendiri, gagal saat semua.

**Kriteria paham:** bisa menjelaskan `describe/it/expect`, kenapa `rand` diinjeksi, kenapa `beforeEach(reset)` wajib, dan cara jalan 1 file.

## Kunci (BUKA SETELAH mengerjakan!)

1. Kasus merah: `gold slime selalu dalam range` — ekspektasi `>= 2` (dan `<= 6`), aktual ~102–106. Itulah "test menangkap regresi".
2. Hijau lagi (4/4 di file itu). `git status --short` bersih.
3. Contoh struktur: `describe('totalHarga')` + 3 `it` (kosong/1/2 item) + `expect(...).toBe(...)`. Jalan via `npx vitest run src/game/data/harga.test.ts`.
