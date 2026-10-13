# 10 — Debugging, Testing & Perawatan

> Prasyarat: [01](01-typescript-dasar.md)–[08](08-file-katalog.md).

## 1. Membaca error (jenis → sumber → aksi)

| Gejala | Jenis | Cara baca |
|--------|-------|-----------|
| Merah di `tsc --noEmit` | Compile-time | Lihat `file:baris`, tabel di [02 §9](02-typescript-lanjutan.md#9-membaca-error-typescript-cheat-sheet) |
| Merah di console browser (F12) | Runtime | Baca stack trace: fungsi PALING ATAS milikmu = lokasi |
| Build Vite gagal | Konfigurasi/import | Biasanya import path salah / file hilang |
| Game jalan tapi perilaku aneh | Logika | Bukan error — butuh investigasi (§3) |
| Tes merah | Regresi/spesifikasi | Baca nama tes → ekspektasi vs aktual |

Perintah baku: `./node_modules/.bin/tsc --noEmit` (cepat) → `npm test` →
`npm run build` → `npm run dev` + skenario manual.

## 2. Teknik: logging, breakpoint, pemisah masalah

- **Logging:** `console.log('TAG', nilai)` di titik curiga; hapus setelahnya.
  Untuk event: log di pengirim DAN penerima (putus di tengah = listener lepas).
- **Breakpoint:** Sources → `src/...` di devtools (Vite serve file asli).
  Jeda di `damageMonster` untuk melihat nilai `dmg`/`crit` aktual.
- ** localized test:** modul data bisa dites tanpa browser:
  `npx vitest run src/game/data/drops.test.ts`.
- **Tanya pemisah:** "data atau tampilan?" (cek localStorage di
  Application tab vs yang tampil di HUD) → "kirim atau terima?" (log dua sisi
  event) → "sekali atau tiap restart?" (bug listener ganda).

## 3. Bug khas LoP (hafalkan polanya)

1. **Event ganda tiap pindah map** — listener MapScene tidak via `onWin`/`onDom`
   → potion/reward dobel. Bukti: efek 1x di map pertama, 2x setelah portal.
   Perbaikan: pindahkan ke helper (auto-lepas `SHUTDOWN`).
2. **Monster respawn tak kena hit** — overlap pakai array basi / `filter`
   ganti referensi. Bukti: monster lama kena, yang baru kebal. Perbaikan:
   overlap per-monster + `splice`.
3. **Profil salah / progres campur** — modul data di-import sebelum
   `setActiveProfile`. Bukti: gold/item milik akun lain. Perbaikan: jaga
   urutan `main.ts`, lihat `bootOrder.test.ts`.
4. **Tombol HP tidak merespons** — render ulang DOM menghapus tombol di antara
   `touchstart`–`touchend`; atau panel kurang `pointer-events/touch-action`.
   Bukti: di desktop bisa, di HP tidak. Perbaikan: `pointerdown`, jangan
   render ulang saat interaksi (kasus nyata: tas di-render tiap regen).
5. **Teks/nama ketutup** — depth salah / di belakang HUD. Perbaikan: aturan
   depth §aturan-keras + `isBehindHud`.
6. **Cooldown hilang saat pindah map** — pakai jam scene. Perbaikan:
   `persistentTimers.nowMs()`.
7. **EVADE membingungkan** — bukan bug: monster pulang = immune (aturan 9).

## 4. Contoh diagnosis lengkap (kasus nyata: tap equip di HP gagal)

1. **Gejala:** tap Equip di HP tak berefek, di desktop bisa.
2. **Hipotesis:** (a) handler click tak sampai, (b) validasi gagal, (c) render.
3. **Bukti:** tambah log di handler grid tas → di HP log tidak muncul =
   hipotesis (a). Cek `stats-changed` tiap 5 detik (regen) → `renderBag()`
   mengganti `innerHTML` tepat saat jari menyentuh = tombol di bawah jari
   hilang sebelum `click` → hipotesis (c) sebagai akar.
4. **Perbaikan:** render ulang hanya saat job/level berubah; handler pakai
   `pointerdown`; sinkron job via `select-job`.
5. **Verifikasi:** tap 10x di HP berhasil + `tsc` + build. Pelajaran diabadikan
   di aturan touch AGENTS.md.

## 5. Testing (vitest + jsdom)

- File `*.test.ts` di sebelah source; jalan: `npm test` (semua) atau
  `npx vitest run <path>` (satu file). Daftar 21 file + yang diuji ada di
  hasil audit (katalog subagen data, [08](08-file-katalog.md)).
- Tulis tes untuk: formula murni (drops/attributes), validasi (shop/equip),
  state machine (quest klaim-1x, slot simpan-muat).
- Kode Phaser/DOM dites via jsdom hanya untuk logika terisolasi
  (contoh `authScreen.test.ts` pakai mock DOM).

## 6. Git aman

```bash
git status --short          # lihat yang berubah (materi ini: hanya materi/)
git diff <file>             # periksa sebelum commit
git checkout -- <file>       # batalkan perubahan file (latihan!)
git stash                   # simpan sementara tanpa commit
git log --oneline -5        # riwayat (proyek ini riwayatnya pendek)
```
Aturan: commit kecil + pesan jelas; jangan commit `dist/`, `node_modules/`,
hasil build APK (sudah di `.gitignore`? verifikasi dulu).

## Latihan

1. Sengaja hapus 1 field `MonsterDef`, catat error `tsc` + perbaikannya.
2. Tambah `console.log` di `buyItem`, beli potion, amati console.
3. Jelaskan langkah membedakan "data salah" vs "tampilan salah" untuk gold.
**Kriteria:** bisa menjalankan 4 perintah baku + mendiagnosis 3 bug khas.
