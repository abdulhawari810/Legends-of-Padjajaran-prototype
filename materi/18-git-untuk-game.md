# 18 — Git untuk Game Dev (aman coba-coba)

> Prasyarat: [10](10-debugging-testing.md). Tujuan: berani merusak kode karena bisa kembali.

## 1. 5 perintah penyelamat (hafal urutannya)

```bash
git status --short          # apa yang berubah? (materi ini: hanya materi/)
git diff <file>             # bedanya apa, baris per baris — baca SEBELUM commit
git checkout -- <file>      # BATALKAN perubahan 1 file (senjata latihan L2/L4!)
git stash                   # simpan sementara tanpa commit (ganti tugas cepat)
git log --oneline -5        # riwayat pendek proyek ini
```

Contoh alur latihan aman (dipakai di `01` + `12`):

```bash
# 1. ubah 1 angka di drops.ts
# 2. npx vitest run src/game/data/drops.test.ts   → lihat merah
git diff src/game/data/drops.ts                    # pahami bedanya
git checkout -- src/game/data/drops.ts             # kembalikan
npx vitest run src/game/data/drops.test.ts         # hijau lagi
```

## 2. Aturan commit untuk proyek game

* **Kecil + pesan jelas:** 1 commit = 1 perubahan logika (mis. "slime HP 70→80 + update test"). Jangan campur balancing + UI + refactoring dalam 1 commit — tidak bisa revert sebagian.
* **Jangan commit:** `dist/`, `node_modules/`, hasil APK, `android/app/build` (hasil build & dependensi — lihat `08-H`). Verifikasi `.gitignore` dulu.
* **Urutan sebelum commit:** `tsc --noEmit` → `npm test` → `npm run build` → main manual 5 menit. Catat log-nya sebagai bukti kelulusan (`11 §5`).

## 3. Branch per fitur (saat mulai berani)

```bash
git checkout -b fitur-serigala   # kerja di cabang
# ... ubah monsters/drops/map + test ...
git checkout main                 # kembali aman kapan saja
git merge fitur-serigala          # gabung kalau sudah hijau semua
```

Proyek ini riwayatnya pendek — branch murah dan aman. Latihan L6/proyek akhir (`11`) WAJIB di branch sendiri.

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. Suntik bug 1 angka → `git diff` → jelaskan bedanya → `checkout` → buktikan hijau.
2. `git status` setelah build → sebut file apa yang TIDAK boleh di-commit.
3. Buat branch khayalan, ubah 1 file, kembali ke main tanpa merge.

**Lolos jika:** bisa merusak + mengembalikan dalam < 2 menit tanpa panik.

## Kunci (BUKA SETELAH mengerjakan!)

1. `git diff` menunjukkan baris `-` (lama) vs `+` (baru); `git checkout -- <file>` mengembalikan; bukti hijau = `npx vitest run <file>.test.ts` semua lolos + `git status` bersih.
2. `dist/`, `node_modules/`, hasil APK, `android/app/build` (lihat `08-H`). Verifikasi `.gitignore` dulu.
3. `git checkout -b coba` → ubah → `git checkout main` (perubahan tertinggal di branch `coba`; main bersih — verifikasi via `git status`).
