# 11 — Latihan, Proyek Akhir & Kelulusan

> Kerjakan TANPA melihat jawaban. Pembahasan terpisah di §7.

## 1. Level latihan (naik bertahap)

- **L1 Memahami:** jelaskan kode dengan kata-katamu (mis. `mitigatePhysical`,
  `rollDrops`, `initAttackButton`, `registerKill`).
- **L2 Mengubah nilai:** ganti angka tuning (HP slime, harga potion, aggro)
  + prediksi efek + buktikan di game. Batasan: tidak boleh ubah struktur.
- **L3 Fungsi kecil:** tambah fungsi murni + tesnya (mis. `totalHarga(keranjang)`
  dari `SHOP_BUY`, atau `potionSisaUntukFull(hp, maxHp)`).
- **L4 Perbaiki bug:** saya suntik 1 bug (atau ambil dari §10.3), kamu diagnosis
  dengan urutan §10.4 (gejala→hipotesis→bukti→perbaikan→verifikasi).
- **L5 Lintas file:** mis. tambah material `wolf-fang` (drop wolf → bisa
  dijual 6G → dipakai 1 quest) menyentuh drops/items/shop/quests.
- **L6 Mandiri:** tugas L6.1–L6.3 di bawah tanpa petunjuk langkah.

Setiap latihan wajib mencatat: **tujuan – file – perilaku yang diharapkan –
batasan – cara uji – kriteria lolos** (contoh format di bawah).

## 2. Bank latihan (contoh terisi)

| # | Lv | Tujuan | File | Batasan | Uji | Lolos jika |
|---|----|--------|------|---------|-----|------------|
| 1 | L1 | Jelaskan `rollDrops` baris-per-baris | `drops.ts:78-86` | — | Tulis penjelasan | Menyebut peran `rand` untuk tes |
| 2 | L2 | Potion heal 40%→60% maxHP | `Player.ts:useQuickItem` | Hanya 1 angka | Pakai, HUD naik 60% | Cooldown tetap 5 dtk |
| 3 | L3 | `expSisa(level, exp)` + tes | baru + `*.test.ts` | Murni, tanpa Phaser | `npm test` hijau | 3 kasus batas (pas-level, sisa-1, Lv20) |
| 4 | L4 | Equip staff ke warrior "bisa" (bug suntikan: hapus cek `jobs`) | `equipment.ts` | — | `tsc` + tes equip merah→hijau | Menemukan via tes, bukan tebak |
| 5 | L5 | Material `wolf-fang` full-loop | drops/items/shop/quests | Harga 6G, 1 quest pakai | Drop→jual→quest selesai | 4 file + tidak ada regresi tes |
| 6 | L6.1 | **Monster baru "Serigala"** (09.A contoh 1) | 5 file | Speed < player | Spawn, loot, quest, minimap | Semua checklist 09.A centang |
| 7 | L6.2 | **Skill ke-4? TIDAK** — ganti: tambah 1 quest rantai gather→klaim | quests + NPC otomatis | Ikut pola `requires` | Unlock→progres→klaim 1x | Chain terkunci sebelum syarat |
| 8 | L6.3 | **Panel baru "Peringkat"**: baca `stats.ts`, tampilkan kill/death/maxLevel/playtime | index.html + css + 1 modul UI | Pola `init*` + event | Buka/tutup, angka benar | Tanpa import MapScene/Player |

## 3. Proyek praktik akhir (wajib, tanpa petunjuk langkah)

**"Paket Konten Mini":** 1 monster + 1 material drop + 1 item jual/beli +
1 quest rantai + 1 panel/daftar yang menampilkannya, semua terintegrasi
(combat → loot → shop → quest → UI → save persist → tes hijau).
Batasan: tanpa ubah arsitektur (lapisan data/UI/scene tetap), tanpa `any`,
tanpa aset eksternal wajib (prosedural dulu). Uji: `tsc` + `npm test` +
`npm run build` + main 10 menit 2 map.

## 4. Ujian praktik (simulasi, tanpa AI)

1. **Arsitektur (15 mnt):** gambar boot + 3 lapisan + 5 event dari ingatan.
2. **Baca kode (20 mnt):** jelaskan `damageMonster` + `claimQuest` tanpa referensi.
3. **Tambah (45 mnt):** L6.1 dengan `git diff` bersih per file.
4. **Debug (30 mnt):** temukan 2 bug suntikan hanya dari gejala.
5. **Hapus (20 mnt):** hapus 1 item shop + buktikan tak ada referensi sisa.

## 5. Checklist kelulusan (semua harus ✅ + bukti)

- [ ] Menjelaskan arsitektur + alur eksekusi (bukti: ujian 1).
- [ ] Membaca file penting tanpa AI (bukti: ujian 2).
- [ ] Menulis/mengubah TS bertipe (bukti: L3 + `tsc` bersih).
- [ ] Menelusuri dependensi (bukti: rantai import tiap PR).
- [ ] Menambah fitur terintegrasi (bukti: proyek akhir jalan).
- [ ] Mengubah tanpa merusak (bukti: tes hijau + verifikasi manual).
- [ ] Menghapus aman (bukti: ujian 5).
- [ ] Mengubah UI + hubungkan logika (bukti: L6.3).
- [ ] Debugging sistematis (bukti: ujian 4 + catatan diagnosis).
- [ ] Menjalankan pemeriksaan/pengujian (bukti: log `tsc/test/build`).
- [ ] Menjelaskan alasan perubahan (bukti: tiap latihan ada catatan "kenapa").

## 6. Urutan belajarmu (ringkas)

`01 → 02 → 03 → (04 → 05) → 06 → 07 → 08 (rujukan) → 09 → 10 → 11`.
Alokasi saran: 01–02 (3 hari), 03–05 (4 hari), 06–07 (4 hari), 09–11 (sisanya).

## 7. Pembahasan (BUKA SETELAH mengerjakan!)

- **Latihan 1:** `rand` default `Math.random`; tes oper `() => 0` (gold min,
  semua chance lolos karena `0 < chance`) dan `() => 0.999` (gold max,
  tidak ada item). Itulah gunanya injeksi fungsi.
- **Latihan 2:** ubah `0.4` → `0.6` di `useQuickItem`; efek: 1 potion
  menutup 60% HP → potion jadi lebih kuat di level tinggi; harga 20G jadi
  "murah" → pertimbangkan naikkan harga (putusan desainmu, cek `SHOP_BUY`).
- **Latihan 4:** `npx vitest run equipment.test.ts` merah di kasus tolak beda
  job → baca `canEquip` → kembalikan cek `def.jobs` → hijau.
- **L6.1:** ikuti checklist 09.A contoh 1 + §aturan-keras (attackRange,
  speed, overlap per-monster, texture key).
