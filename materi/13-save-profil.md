# 13 — Save, Profil & LocalStorage Deep-Dive

> Prasyarat: [03](03-arsitektur.md), [12](12-vitest-dari-nol.md).
> Tujuan: paham ke mana progres pergi, dan disiplin agar tidak hilang.

## 1. Peta key — 3 jenis

Buka DevTools → Application → Local Storage saat game jalan:

```
mmorpg-auth-v1               akun + sesi (GLOBAL, bukan per profil)
mmorpg:p:<profileId>:<base>  SEMUA progres (per profil, mis. mmorpg:p:abc:gold-v1)
mmorpg-vol-v1 / mmorpg-muted-v1   preferensi perangkat (TIDAK ikut wipe)
```

Kode: `src/game/data/persistence.ts:35-37` (`scopedKey` menambah prefix aktif), `:46-48` (`keyForProfile`), `:67-75` (`loadJSON` anti-crash: JSON rusak → fallback, bukan crash).

Aturan keras: **modul auth global, modul progres per-profil.** Itu sebabnya `main.ts:47` memakai `await import('./app')` SETELAH profil aktif — modul data meng-cache `loadJSON(KEY(), ...)` saat import (`currency.ts:4`).

## 2. `save.ts` — 4 dompet + disiplin `ALL_KEYS`

`src/game/data/save.ts`:

* `:8-32` — `JobSave` (level/exp/primary/weapon/armor/hp/mp per job), `PosSave` (`{x,y}` per map), `MetaSave` (`currentJob`, `killCount`).
* `:51-69` — `KEY_BASES`: daftar SEMUA key dasar (17 + 3 slot). `:72-74` `allKeys()` = versi namespaced-nya.
* `:129-158` — `exportSave()` / `importSave(obj: unknown)`: backup sebagai JSON (`{v:1, data}`), validasi `unknown` dulu (lihat `02 §3`).
* `:188-229` — 3 slot manual: `saveSlot(i)` snapshot SEMUA key live, `loadSlot(i)` timpa balik + restart.

**Disiplin sakral (aturan 6 di `03 §6`): key baru WAJIB didaftarkan di `KEY_BASES`.** Lupa = key itu tidak ikut export/import/slot/wipe → backup tidak lengkap, hapus progres menyisakan sampah.

Contoh nyata bug yang dicegah: tambah `mmorpg-pet-v1` tapi lupa daftar → export/import kehilangan pet → pemain protes.

## 3. Alur tulis & baca (kapan autosave?)

* Tulis: `saveJobSave` / `savePos` / `saveMeta` dipanggil tiap perubahan penting + autosave tiap 5 detik + saat EXP/quest (`saveAccum` di MapScene). Posisi dibulatkan (`Math.round`, `save.ts:108`).
* Baca: `loadJobSaves()[jobId] ?? null` (`:80-82`) — `?? null` = job belum pernah dimainkan.
* Kompatibilitas: `loadPos` (`:90-98`) membaca save lama `{x,y}` langsung sebagai greenfield. Jangan hapus cabang ini — pemain lama kehilangan posisi.

## 4. Operasi berbahaya — wipe, hapus profil, slot

* `clearAllSave()` (`:120-126`) — hapus semua key profil aktif (dipakai "Hapus Progres").
* `wipeEverything()` (`auth.ts`, diuji `auth.test.ts:309-343`) — hapus SEMUA profil + key + auth, tapi **TIDAK menghapus** `mmorpg-vol-v1`/`mmorpg-muted-v1` (preferensi perangkat). Ada test yang menjaga ini (`:327-335`).
* `deleteProfile` — hapus profil + `keysOfProfile(id)`. Menolak hapus profil yang sedang login (test `:198-202`).
* `loadSlot` menimpa progres sekarang — UI memperingatkan "timpa + restart" (`index.html:391`).

## 5. Diagnosis save rusak (simulasi aman)

1. Di DevTools, ubah satu value jadi `{bukan json`. Reload → game tetap jalan (fallback `loadJSON`), bukan blank. Itulah gunanya `try/catch` di `persistence.ts:68-74`.
2. Export backup (`#btn-export`), tempel ke textarea, Import → restart. Cek `importSave` menolak "Format salah" / "Bukan file save game ini" untuk input ngawur.
3. Simulasi profil campur: login A → catat gold → logout → login B → gold harus beda (isolasi `auth.test.ts:130-148`).

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. Tambah key khayalan `mmorpg-pet-v1` di kertas: sebut 4 tempat yang harus diubah.
2. Jelaskan kenapa `vol/mute` tidak ikut `wipeEverything`.
3. Jelaskan kenapa `importSave(obj: unknown)` memakai `unknown` bukan `any`.

**Lolos jika:** bisa membuka Application tab, menunjuk key milik profil aktif, dan menjelaskan akibat lupa daftar key baru.

## Kunci (BUKA SETELAH mengerjakan!)

1. `KEY_BASES` di `save.ts:51-69` (export/import/slot/wipe otomatis ikut karena memakai `allKeys()`; `LIVE_KEYS` otomatis karena turunan `allKeys`) + fungsi load/save modulnya + 1 file `*.test.ts` (tulis-baca-hilang) + migrasi bila perlu.
2. `vol/mute` = preferensi perangkat, bukan progres pemain (`audio.ts:3-4`). Hapus progres tidak boleh mengubah pengaturan suara.
3. `unknown` memaksa validasi (`typeof obj !== 'object'` → return "Format salah"); `any` lolos tanpa dicek → `JSON.parse`/akses properti bisa crash (lihat `02 §3`).
