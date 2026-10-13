# 01 — TypeScript Dasar (dengan contoh LoP)

> Prasyarat: dasar JavaScript + JSX. File ini HANYA menambah yang belum ada di JS.

## 1. Type annotation & type inference

**Tujuan:** memberi tahu compiler tipe sebuah nilai, agar salah tipe ketahuan
sebelum game dijalankan (bukan saat pemain sudah main).

**Penjelasan sederhana:** TypeScript = JavaScript + label tipe. Label ditulis
dengan titik dua `:`. Kalau label tidak ditulis, TS menebak dari nilai awal
(*inference*).

**Sintaks:**
```ts
let nama: string = "Slime";   // anotasi eksplisit
let hp = 70;                  // inference: TS tahu ini number
```

**Contoh nyata LoP** — `src/game/data/currency.ts:4`:
```ts
let gold: number = loadJSON<number>(KEY(), 0);
```
Baris-per-baris:
- `let gold` — variabel yang nilainya boleh berubah (isi dompet).
- `: number` — anotasi: hanya boleh angka. Kalau diisi string, `tsc` error.
- `loadJSON<number>(...)` — memanggil fungsi generic (dipelajari di file 02)
  dengan `T = number`, jadi hasil kembaliannya `number`.
- `(KEY(), 0)` — argumen: key penyimpanan dan nilai default `0`.

**Kesalahan umum:**
```ts
let gold: number = "100"; // error: Type 'string' is not assignable to type 'number'
```
Perbaikan: `let gold: number = 100;` — error TS dibaca polanya
`Type 'X' is not assignable to type 'Y'` = "nilai X dimasukkan ke tempat Y".

**Latihan:** ubah `gold` jadi `string` di kepala saja, jalankan
`./node_modules/.bin/tsc --noEmit`, baca errornya, lalu kembalikan.
(Jangan simpan perubahan — pakai `git checkout -- <file>` untuk mengembalikan.)

**Kriteria paham:** bisa menjelaskan beda anotasi vs inference dan membaca error
`not assignable`.

## 2. Primitive types

**Tujuan:** tipe paling kecil untuk data game (nama, HP, hidup/mati).

| Tipe | Contoh LoP | Lokasi |
|------|-----------|--------|
| `string` | `"slime"`, nama item | `drops.ts`, `items.ts` |
| `number` | HP, atk, gold, cooldown | hampir semua file data |
| `boolean` | `alive`, `attackQueued` | `Monster.ts`, `VirtualInput.ts` |

**Contoh nyata** — `src/game/input/VirtualInput.ts:3-6`:
```ts
export const VirtualInput = {
  x: 0,
  y: 0,
  attackQueued: false,
```
`x`/`y` ter-inferensi `number`, `attackQueued` ter-inferensi `boolean`.
Konsekuensi jika diubah: `attackQueued = 0` → error, karena tempatnya boolean.

**Latihan:** di `drops.ts:81`, apa tipe hasil `t.gold[0] + Math.floor(...)`?
**Kriteria:** bisa menebak tipe ekspresi tanpa menjalankannya.

## 3. Array & object

**Tujuan:** menampung banyak data sejenis (daftar monster) dan data berpasangan
(stat karakter).

```ts
const daftar: string[] = ["slime", "goblin"];   // array of string
const poin = { str: 12, con: 10 };               // object (inference)
```

**Contoh nyata** — `src/game/data/jobs.ts:27`:
```ts
basePrimary: { str: 12, dex: 5, int: 2, foc: 3, con: 10 },
```
Object literal ini dicek compiler terhadap `interface Primary`
(str/dex/int/foc/con wajib `number`). Kurang satu field → error.

**Contoh nyata 2** — `src/game/data/drops.ts:8`:
```ts
const TABLE: Record<string, { gold: [number, number]; items: Array<{...}> }> = {
```
`Record<string, ...>` = object dengan kunci string bebas (dipelajari di 02).

**Kesalahan umum:** mengakses properti yang tidak ada:
```ts
p.strength // error: Property 'strength' does not exist on type 'Primary'
```
Perbaikan: pakai nama field yang benar (`str`), lihat definisi interface-nya.

**Latihan:** tambah monster fiktif ke `MONSTERS` tanpa field `exp`, jalankan
`tsc`, baca errornya, lalu batalkan (`git checkout`).
**Kriteria:** paham bahwa object literal wajib cocok dengan interface-nya.

## 4. Function, parameter, return type

**Tujuan:** mendefinisikan perilaku (hitung damage, mitigasi) dengan kontrak
input→output yang diperiksa compiler.

```ts
function tambah(a: number, b: number): number {
  return a + b;
}
```

**Contoh nyata** — `src/game/data/attributes.ts:95-99`:
```ts
export function mitigatePhysical(raw: number, armor: number, pen = 0): number {
  const eff = Math.max(0, armor - pen);
  const mult = 100 / (100 + eff);
  return Math.max(1, Math.round(raw * Math.max(0.1, mult)));
}
```
Baris-per-baris:
- `(raw: number, armor: number, pen = 0)` — dua parameter wajib + satu
  **default parameter** (`pen` boleh tidak diisi → dianggap `0`).
- `: number` setelah kurung — return type: fungsi ini wajib mengembalikan angka.
- `Math.max(1, ...)` — menjamin damage minimal 1 (tidak pernah 0/miss di sini;
  miss ditangani terpisah oleh dodge di `Player.takeDamage`).
- Konsekuensi jika diubah: menghapus `Math.max(1, ...)` → monster armor besar
  bisa menerima damage 0 dan tidak pernah mati → quest kill macet.

**Contoh nyata 2** — return boolean + objek hasil:
`src/game/data/shop.ts:32` `buyItem(itemId: string): { ok: boolean; reason?: string }`
mengembalikan object `{ ok: true }` atau `{ ok: false, reason: '...' }`.
Pola `{ ok, reason? }` dipakai di SELURUH proyek untuk operasi yang bisa gagal
(beli, equip, tempa, klaim). Tanda `?` = **optional property** (boleh tidak ada).

**Latihan:** panggil `mitigatePhysical(50, 25)` di atas kertas: hitung hasilnya.
(Jawaban: `eff=25`, `mult=100/125=0.8`, `50*0.8=40`.)
**Kriteria:** bisa membaca signature fungsi dan memprediksi return-nya.

## 5. Optional chaining (`?.`) & nullish coalescing (`??`)

**Tujuan:** mengakses data yang mungkin `null`/`undefined` tanpa crash.

```ts
const nama = monster?.name ?? "???";
// artinya: kalau monster null/undefined → "???". Kalau tidak → monster.name.
```
- `?.` = "lanjutkan hanya jika tidak null/undefined".
- `??` = "pakai kanan hanya jika kiri null/undefined".
- Beda dengan `||`: `||` juga mengganti `0` dan `""`, sedangkan `??` tidak.
  Karena itu untuk angka (gold/HP) LoP selalu pakai `??`, bukan `||`.

**Contoh nyata** — `src/game/data/inventory.ts:30`:
```ts
return counts.get(id) ?? 0;
```
`Map.get()` mengembalikan `undefined` bila item belum pernah ada → diganti `0`.
Tanpa `??`, item baru akan menghasilkan `NaN` saat dijumlah.

**Contoh nyata 2** — `src/game/data/drops.ts:79-80`:
```ts
const t = TABLE[monsterId];
if (!t) return { gold: 0, items: [] };
```
Pola penjagaan manual: monster tak dikenal → drop kosong, game tidak crash.

**Contoh nyata 3** — `src/ui/hud.ts:11-27`: `document.getElementById('hp-fill')`
bertipe `HTMLElement | null`, maka setiap pakai dicek `if (hpFill) ...`.
Itulah alasan semua akses DOM di UI dibungkus `if`.

**Kesalahan umum:** `Cannot read properties of null` = lupa cek null.
Perbaikan: tambah `?.` / `if`.

**Latihan:** cari 3 pemakaian `??` di `src/game/data/`, jelaskan untuk tiap
kasus: apa yang terjadi jika `??` dihapus.
**Kriteria:** bisa menjelaskan kenapa `?? 0` dipakai untuk angka.

## Ringkasan cek diri (lanjut ke 02 jika semua YA)

- [ ] Bisa menulis anotasi + membaca error `not assignable`.
- [ ] Tahu isi `Primary` dan kenapa object harus cocok dengan interface.
- [ ] Bisa membaca signature `{ ok: boolean; reason?: string }`.
- [ ] Bisa menjelaskan `?.` dan `??` dengan contoh LoP.
