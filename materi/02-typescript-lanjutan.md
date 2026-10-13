# 02 — TypeScript Lanjutan

> Prasyarat: [01](01-typescript-dasar.md). Semua contoh dari kode LoP asli.

## 1. `type` vs `interface`

**Tujuan:** memberi nama pada bentuk data agar bisa dipakai ulang dan dicek compiler.

```ts
type JobId = 'warrior' | 'mage' | 'archer';  // alias untuk union string
interface Job { id: JobId; name: string; }    // bentuk object
```

**Perbedaan praktis:**
| | `type` | `interface` |
|---|---|---|
| Alias union/primitif | ✅ bisa | ❌ tidak bisa |
| Bentuk object | ✅ bisa | ✅ bisa |
| `extends` antar interface | — | ✅ (`interface A extends B`) |
| Dipakai di LoP untuk | `JobId`, `EquipSlot`, `MapId`, `ItemId = string` | `Job`, `ItemDef`, `MonsterDef`, `Primary`, `StatsSnapshot` |

**Contoh nyata** — `src/game/data/jobs.ts:3-13`:
```ts
export type JobId = 'warrior' | 'mage' | 'archer';
export interface Job {
  id: JobId;
  ...
  basePrimary: Primary;
  growthPerLevel: Primary;
}
```
`JobId` membatasi string hanya 3 nilai (salah ketik `'warrrior'` → error).
`Job` memakai `JobId` + `Primary` di dalamnya (komposisi antar-interface).

**Contoh nyata 2** — `src/game/data/items.ts` (`ItemDef`): banyak field opsional
(`atk?`, `def?`, `jobs?`, `primaryBonus?`) karena satu interface dipakai untuk
4 jenis item (consumable/weapon/armor/quest). Lihat [08](08-file-katalog.md).

**Kapan pakai apa:** union string/angka → `type`. Bentuk object/class → `interface`.
**Latihan:** buat `type SlotIndex = 0 | 1 | 2`, lalu fungsi yang hanya terima itu.
**Kriteria:** bisa menjelaskan kenapa `JobId` bukan `string` biasa.

## 2. Union, literal, narrowing & type guard

**Tujuan:** menyatakan "nilai ini salah satu dari beberapa kemungkinan" lalu
mempersempitnya dengan aman.

```ts
type Facing = 'down' | 'up' | 'left' | 'right'; // union of literal
function jalan(arah: Facing) {
  if (arah === 'left') { /* di sini TS tahu: arah pasti 'left' */ }
}
```
`if (arah === 'left')` disebut **narrowing**: TS mempersempit tipe di dalam blok.

**Contoh nyata** — `src/game/entities/Player.ts` (`facingVector()`):
arah string dipetakan ke vektor `{ x, y }` dengan rantai `if/return`.
**Contoh nyata 2** — `getItem(id): ItemDef | undefined`
(`src/game/data/items.ts`): return union "ketemu atau tidak". Pemanggil WAJIB
narrowing dulu:
```ts
const def = getItem(itemId);          // ItemDef | undefined
if (!def) return { ok: false, ... };  // guard: setelah ini def pasti ItemDef
```
Pola ini muncul di `equipment.ts:43-44`, `canEquip`, `claimReward`, dll.
**Type guard** = fungsi/ekspresi yang meyakinkan compiler (`if (!x) return`,
`typeof`, `instanceof`).

**Kesalahan umum:** `Object is possibly 'undefined'` = memakai hasil yang
mungkin undefined tanpa guard. Perbaikan: tambah `if (!x) return` di atasnya.

**Latihan:** di `shop.ts:32-43` (`buyItem`), tandai setiap narrowing/guard-nya.
**Kriteria:** bisa menjelaskan kenapa `if (!def)` membuat baris bawahnya aman.

## 3. `any`, `unknown`, `void`, `never`

| Tipe | Arti | Contoh LoP |
|------|------|-----------|
| `any` | Matikan pemeriksaan (hindari!) | Tidak dipakai di `src/` — bagus, jangan mulai |
| `unknown` | "Belum tahu, wajib diperiksa dulu" | `importSave(obj: unknown)` (`save.ts`) — dicek `typeof obj !== 'object'` sebelum dipakai |
| `void` | Tidak mengembalikan nilai | `initHud(): void`, `addGold(n): void` |
| `never` | Tidak pernah kembali (loop selamanya / selalu throw) | `void boot()` dipakai untuk promise tanpa await; praktis jarang ditulis manual |

**Contoh nyata** — `src/game/data/save.ts:115`:
```ts
export function importSave(obj: unknown): { ok: boolean; reason?: string } {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'Format salah' };
```
`unknown` memaksa validasi — tepat untuk data dari luar (textarea import).

**Latihan:** kenapa parameter `importSave` bukan `any`? (Jawaban ada di Kunci bawah.)
**Kriteria:** tidak pernah memakai `any` untuk menutup error.

## 4. Type assertion (`as`) dan risikonya

**Tujuan:** memberi tahu compiler "aku lebih tahu tipenya" — dipakai saat
mengambil data dari DOM/event yang tipenya umum.

**Contoh nyata** — `src/ui/minimap.ts`:
```ts
const cv = document.getElementById('minimap') as HTMLCanvasElement | null;
```
`getElementById` hanya tahu `HTMLElement | null`, padahal elemennya `<canvas>`
yang punya `.width` dan `.getContext()`. Assertion menyempitkannya.

**Contoh nyata 2** — `src/ui/hud.ts:5`:
```ts
window.addEventListener('stats-changed', ((e: CustomEvent<StatsSnapshot>) => {...}) as EventListener);
```
`addEventListener` mau `EventListener` (event generik `Event`), tapi kode butuh
`CustomEvent<StatsSnapshot>` (ada `.detail`). `as` menjembatani — dengan risiko:
kalau event yang datang ternyata bukan `CustomEvent`, `.detail` = `undefined`
dan error muncul saat jalan, bukan saat compile. Itu harga assertion.

**Aturan aman:** assertion hanya untuk DOM/event. Jangan pakai `as` untuk
menutup error logika ("biar hijau") — itu bom waktu.

**Latihan:** hapus `as HTMLCanvasElement` di minimap.ts di kepala, baca error
`tsc`, kembalikan. Pahami properti apa yang hilang tanpa assertion.
**Kriteria:** bisa menyebut 2 risiko `as` yang salah pakai.

## 5. Class, constructor, inheritance, `this`, access modifier

**Tujuan:** entity game (Player, Monster, Npc) = data + perilaku dalam satu paket.

```ts
class Musuh {
  hp: number;                    // property
  constructor(hp: number) {      // dipanggil saat new Musuh(70)
    this.hp = hp;                // this = objek yang sedang dibuat
  }
  terluka(n: number): boolean {  // method
    this.hp -= n;
    return this.hp <= 0;
  }
}
class Slime extends Musuh {}     // inheritance: warisi semua
```

**Contoh nyata** — `src/game/entities/Monster.ts:5-37`:
```ts
export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: MonsterDef;               // public (default): bisa dibaca scene
  private hpBar: ...;            // private: hanya dalam class ini
  constructor(scene, x, y, def, level = 1) {
    super(scene, x, y, def.texture); // wajib: panggil constructor induk dulu
    ...
  }
}
```
- `extends Phaser.Physics.Arcade.Sprite` → Monster ADALAH sprite fisika,
  jadi punya `setVelocity`, `x`, `y`, `destroy` bawaan Phaser.
- `super(...)` wajib baris pertama sebelum pakai `this`.
- `private hpBar` → MapScene tidak boleh menyentuh HP bar langsung
  (harus lewat `updateBar()`). Kalau diubah `public`, aturan ini jebol dan
  bug tampilan sulit dilacak.

**Contoh nyata 2** — `Player.ts` field `private regenAccum`, `private cursors`
vs public `hp`, `level`, `dead` (dibaca MapScene tiap frame).

**Kesalahan umum:** lupa `super()` → error `'this' cannot be referenced
before 'super()'`. Pakai `this` di callback tanpa bind → `this` berubah
(LoP menghindari ini dengan arrow function `() =>`).

**Latihan:** jelaskan kenapa `Monster` tidak perlu menulis ulang `setVelocity`.
**Kriteria:** bisa bedakan `public`/`private` dan tahu kapan `super` wajib.

## 6. Generics (`<T>`)

**Tujuan:** fungsi yang bekerja untuk BANYAK tipe tapi tetap aman tipenya.

**Contoh nyata** — `src/game/data/persistence.ts:67`:
```ts
export function loadJSON<T>(key: string, fallback: T): T {
  ...
  return JSON.parse(raw) as T;
}
```
`T` = "tipe yang ditentukan pemanggil". `loadJSON<number>(k, 0)` → kembali
`number`; `loadJSON<Profile[]>(k, [])` → kembali `Profile[]`. Satu fungsi,
aman untuk semua tipe — tanpa generic harus ada `loadJSONNumber`,
`loadJSONProfile`, dst.

**Contoh nyata 2:** `Record<string, number>` (inventory), `Array<{id,count}>`
(drops), `Partial<Record<JobId, JobSave>>` (save per-job, `Partial` = semua
properti opsional), `Promise<boolean>` (authScreen).

**Latihan:** baca `snapshotInventory(): Record<string, number>`, jelaskan
artinya dalam 1 kalimat.
**Kriteria:** bisa membaca `Record<K,V>`, `Partial<T>`, `Array<T>`.

## 7. Modul: import/export dan hubungan antarmodul

- `export function ...` / `export interface ...` / `export const ...` = bernama.
- `import { a, b } from './file'` = ambil bernama. `import type { X }` = hanya
  tipe (hilang saat compile, aman dari circular runtime).
- Aturan proyek (lihat `bootOrder.test.ts`): `main.ts`/UI auth **dilarang**
  import statis modul data berstate — karena modul data meng-cache
  `loadJSON(...)` saat di-import (contoh `currency.ts:4`). Import terlalu dini
  = cache milik profil yang salah. Karena itu `main.ts` memakai
  `await import('./app')` (**dynamic import**, baris 47) SETELAH profil aktif.

**Contoh nyata rantai import:** `MapScene.ts` → `Player.ts` →
`equipment.ts` → `items.ts` + `attributes.ts`. Mengubah `ItemDef` berarti
compiler memeriksa ulang semua file di rantai ini.

**Latihan:** gambar rantai import `shop.ts` (4 import di baris 1-4) di kertas.
**Kriteria:** bisa menelusuri "kalau file X berubah, file apa yang dicek ulang".

## 8. Async/event: Promise dan event-driven

LoP hampir tanpa `async/await` di gameplay; pola utamanya **event-driven**:
sesuatu terjadi → `dispatchEvent` → pendengar bereaksi. Contoh penuh di
[07-ui](07-ui.md). Dua `Promise` yang ada:
- `main.ts: boot()/launch()` — `await showAuthScreen()` (authScreen.ts
  mengembalikan `Promise<boolean>` yang resolve saat user login).
- `setAuthReadyCallback(() => void launch())` — callback ditunda sampai siap.

**Latihan:** jelaskan alur `showAuthScreen() → onReady → launch()` dengan
kata-katanmu.
**Kriteria:** paham bahwa UI dan game terhubung lewat event, bukan panggilan langsung.

## 9. Membaca error TypeScript (cheat sheet)

| Pesan | Arti | Aksi |
|-------|------|------|
| `Type 'X' is not assignable to type 'Y'` | Nilai salah tempat | Perbaiki nilai / ubah anotasi |
| `Property 'a' does not exist on type 'B'` | Salah nama field | Cek interface-nya |
| `Object is possibly 'undefined'` | Butuh guard | Tambah `if (!x) return` |
| `Cannot find module './x'` | Salah path import | Cek nama file + `./` vs `../` |
| `Argument of type X is not assignable to parameter of type Y` | Argumen salah | Cek signature fungsi |
| `'this' cannot be referenced before 'super()'` | Class anak | Panggil `super()` dulu |

Perintah cek: `./node_modules/.bin/tsc --noEmit` (tanpa build, cepat).

## Ringkasan cek diri

- [ ] Bedakan `type` vs `interface` + contoh LoP masing-masing.
- [ ] Menandai narrowing/guard di fungsi validasi.
- [ ] Tidak memakai `any`; paham risiko `as`.
- [ ] Menjelaskan `extends`/`super`/`this`/`private` di Monster.
- [ ] Membaca `Record/Partial/Array/Promise<T>`.
- [ ] Menjelaskan kenapa `main.ts` memakai dynamic `import()`.

## Kunci (BUKA SETELAH mengerjakan!)

- §1: `SlotIndex` membatasi 3 angka — argumen `3` langsung error compiler.
- §2: guard di `buyItem`: `!entry` → `!def` → gold kurang → `!spendGold`. Tiap guard menyempitkan tipe di bawahnya (mis. setelah `if (!def) return`, `def` pasti `ItemDef`).
- §3: `any` lolos tanpa dicek → kode di bawah bisa crash; `unknown` memaksa guard (`typeof obj !== 'object'`).
- §4: tanpa `as HTMLCanvasElement`, `.width`/`.getContext()` error (`Property does not exist on HTMLElement`). Risiko `as` salah: crash runtime yang tidak ketahuan compiler.
- §5: `Monster` mewarisi `setVelocity/x/y/destroy` dari `Phaser.Physics.Arcade.Sprite` via `extends` — tidak perlu tulis ulang.
- §6: `Record<string, number>` = object kunci-string nilai-angka (snapshot tas: itemId → jumlah).
- §7: rantai `shop.ts`: `items` + `inventory` + `currency` + `stats`. Ubah `ItemDef` = compiler cek ulang semua file ini.
- §8: `showAuthScreen()` return `Promise<boolean>` (resolve saat login) → `onReady` → `launch()` (dynamic import + `startGame`).
