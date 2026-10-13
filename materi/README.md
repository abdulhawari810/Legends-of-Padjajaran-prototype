# 📚 Materi Pembelajaran Mandiri — Legends of Padjajaran (LoP)

Panduan belajar pribadi berdasarkan **source code asli** proyek `mmorpg`
(game MMORPG web 2D: TypeScript + Phaser 3 + DOM UI, tanpa React, tanpa backend).
Tujuan akhir: kamu bisa menambah, mengubah, menghapus, dan memperbaiki sistem
game **tanpa bergantung pada AI sebagai penulis kode**.

## Cara memakai materi ini

1. Baca berurutan dari `01` → `11`. Setiap file saling terhubung lewat tautan.
2. Setiap konsep punya **latihan + kriteria paham**. Jangan lanjut sebelum lolos kriteria.
3. Selalu buka file sumber yang dirujuk di VS Code sambil membaca (path relatif dari root `mmorpg/`).
4. Kerjakan latihan **tanpa melihat jawaban**; pembahasan ada di file latihan.
5. Patuhi [aturan perlindungan proyek](#aturan-perlindungan-proyek) — materi ini
   hanya membaca kode, tidak mengubahnya.

## Urutan belajar (wajib berurutan)

| # | File | Isi | Prasyarat |
|---|------|-----|-----------|
| 1 | [01-typescript-dasar.md](01-typescript-dasar.md) | Anotasi tipe, inference, primitif, array, object, fungsi, parameter opsional/default, optional chaining, nullish coalescing | Dasar JS + JSX (kamu sudah punya) |
| 2 | [02-typescript-lanjutan.md](02-typescript-lanjutan.md) | `type` vs `interface`, union/literal/narrowing, `any/unknown/void/never`, assertion, class, generics, modul, async/event, baca error TS, tipe Phaser | 01 |
| 3 | [03-arsitektur.md](03-arsitektur.md) | Tech stack, entry point, alur boot auth→game, peta modul, event bus, alur data, aturan keras proyek | 01–02 |
| 4 | [04-phaser.md](04-phaser.md) | `Phaser.Game`, Scene lifecycle, game loop + delta, texture, input, kamera, depth, timer/tween, cleanup | 03 |
| 5 | [05-fisika-dan-combat.md](05-fisika-dan-combat.md) | Arcade Physics, movement, facing, collider vs overlap, alur serang, monster AI, mati/respawn | 04 |
| 6 | [06-sistem-rpg.md](06-sistem-rpg.md) | Atribut, job, EXP/level, inventory, equipment, tempa, drop, shop, bank, quest, bounty, achievement, skill, save, auth lokal | 03 |
| 7 | [07-ui.md](07-ui.md) | DOM UI (tanpa React!), panel, styling, pola `init*`, jembatan UI↔Phaser via event, responsif | 03 |
| 8 | [08-file-katalog.md](08-file-katalog.md) | Katalog semua file: tujuan, export, dependensi, risiko ubah/hapus, cara uji | 03–07 (rujukan) |
| 9 | [09-tambah-ubah-hapus.md](09-tambah-ubah-hapus.md) | Prosedur menambah, mengubah, menghapus fitur dengan contoh LoP | 01–08 |
| 10 | [10-debugging-testing.md](10-debugging-testing.md) | Baca error, debugger, bug khas proyek, vitest, git aman, contoh diagnosis | 01–08 |
| 11 | [11-latihan-dan-kelulusan.md](11-latihan-dan-kelulusan.md) | Latihan level 1–6, proyek akhir, ujian praktik, checklist kelulusan | Semua |

## Status proyek saat materi ditulis (audit Oktober 2026)

- ±12.200 baris TypeScript di `src/` (25 modul data, 17 modul UI, 5 entity, 2 scene).
- 3 map (`greenfield`, `dark`, `cave`), 10 monster + boss, 16 quest berantai,
  3 job permanen, 9 skill, shop/bank/tempa/bounty/achievement/profesi/gather.
- 46+ unit test vitest, semua hijau. Build: `tsc && vite build` → `dist/`.
- APK via Capacitor (`npm run build:apk`), desktop via Tauri (scaffold).
- **Tidak ada**: React, backend/server, database, multiplayer. Save = `localStorage`
  (`mmorpg:*`), auth = akun lokal (bukan keamanan sungguhan).

## Aturan perlindungan proyek

- Jangan mengubah kode game demi dokumentasi. Hanya folder `materi/` yang boleh dibuat.
- Jangan refactor arsitektur sebagai bagian dari belajar.
- Cuplikan kode di materi secukupnya saja (path + baris + potongan relevan).
- Bedakan fakta hasil audit vs rekomendasi: fakta = sudah diverifikasi dari source.

## Cakupan yang belum selesai

- `MapScene.ts` (2.726 baris) hanya didokumentasikan per pola + method penting,
  bukan baris-per-baris. Pelajari bertahap setelah lulus materi 01–05.
- `src-tauri/` dan `android/` hanya ringkasan (bukan materi inti web).
- Fileмент `LoP.jpg`, ikon, dan hasil `dist/` tidak didokumentasikan (aset/build).
