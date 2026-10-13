# 00 — Fondasi Web Game Dev (wajib untuk pemula)

> Baca ini SEBELUM `01`. Prasyarat: bisa install Node + buka browser.
> Tujuan: paham "game web itu apa" — file apa jalan di mana.

## 1. Gambaran besar: 3 dunia

```
Browser
 ├─ DOM (index.html + style.css + src/ui/*.ts)  → tombol, panel, HUD
 ├─ Canvas (Phaser, disuntik ke #game-container) → karakter, monster, map
 └─ localStorage                                 → save (tanpa server!)
```

* **DOM** = elemen HTML biasa (`<button>`, `<div>`). Diinspeksi di DevTools → Elements.
* **Canvas** = satu kotak gambar yang dilukis Phaser tiap frame. Isinya TIDAK bisa di-klik-inspect per monster — debug-nya lewat `console.log`, bukan klik elemen.
* Keduanya hidup berdampingan di `index.html`. Kanvas di `src/game/Game.ts` via `parent: #game-container` (`index.html:91`), UI menutupinya di `#ui-overlay` (`index.html:92`).

Istilah Inggris: *DOM* (Document Object Model), *canvas*, *viewport*, *bundle*, *dev server*.

## 2. File `index.html` — baca dari atas ke bawah

Lokasi: `index.html:1-423`. Yang wajib tahu:

* `:5-8` — `viewport` kunci zoom HP (`maximum-scale=1.0, user-scalable=no`). Kalau dihapus, pinch-zoom HP mengacaukan joystick.
* `:9` — `screen-orientation: landscape` + `:218-223` `#rotate-hint` = game ini **wajib lanskap** di HP.
* `:16` — `manifest` untuk PWA (install ke homescreen, lihat batch 17).
* `:91` — `<div id="game-container">` kosong: Phaser menyuntik `<canvas>` ke sini saat `app.ts:42` memanggil `createGame(container)`.
* `:92-217` — `#ui-overlay`: seluruh HUD + tombol. Punya `pointer-events: none` (lihat `07`), tombol mengaktifkan `auto` satu per satu.
* `:421` — `<script type="module" src="/src/main.ts">`: **entry point**. Browser memuat ini pertama kali.

**Latihan:** buka `index.html`, hapus HANYA di kepala (`git checkout` sesudahnya!), jalankan `npm run dev`, rasakan bedanya.

## 3. Perintah npm — 4 yang dipakai tiap hari

Dari `package.json` (hasil audit):

| Perintah | Arti | Kapan |
|----------|------|-------|
| `npm run dev` | Dev server Vite (port 5173, hot reload) | Ngoding harian |
| `./node_modules/.bin/tsc --noEmit` | Cek tipe saja, tanpa build (cepat) | Setiap selesai ubah 1 file |
| `npm test` | Jalan semua `*.test.ts` (Vitest) | Sebelum anggap selesai |
| `npm run build` | `tsc && vite build` → folder `dist/` | Sebelum rilis/APK |

Alur kerja baku: ubah → `tsc` → `npm test` → `npm run dev` + main manual → `npm run build`.

**Kesalahan umum pemula:**
* Edit file di `dist/` — SIA-SIA, `dist/` ditimpa tiap build. Selalu edit `src/`.
* Buka `index.html` langsung via double-click (`file://`) saat dev — salah. Selalu lewat `npm run dev` (Vite melayani `import` module).

## 4. Vite + `base './'` — kenapa penting

`vite.config.ts:6` — `base: './'` WAJIB. Artinya path aset relatif (`./assets/...`), bukan absolut (`/assets/...`).

Kenapa: game dibungkus Capacitor (`capacitor://`) dan Tauri (`tauri://`), bukan `https://`. Path absolut `/` tidak ada di sana → sprite/manifest hilang. Jangan ubah ke `'/'`.

`chunkSizeWarningLimit: 2000` + `manualChunks: { phaser: ['phaser'] }` (`vite.config.ts:12-18`): Phaser ±1,2 MB dipisah ke chunk sendiri agar di-cache terpisah. Bukan error.

## 5. DevTools — alat kerja utama game dev web

Tekan F12 saat `npm run dev`:

* **Console** — lihat `console.log` + error runtime + stack trace. Fungsi paling atas milikmu = lokasi bug.
* **Elements** — klik tombol game, lihat id-nya (`#attack-btn`), lalu `grep` id itu di `src/ui/` untuk ketemu kodenya.
* **Application → Local Storage** — lihat key `mmorpg:*` (save). Di sinilah kamu bedakan "data salah vs tampilan salah" (batch 13).
* **Network** — cek sprite gagal load (404 di `sprites/...` → fallback prosedural jalan, batch 14).
* **Sources** — pasang breakpoint di `src/...` (Vite serve file asli), lihat nilai `dmg`/`gold` saat jalan.

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. `npm run dev`, buka game, di Console ketik `localStorage.length` → jelaskan angkanya.
2. Di Elements, sembunyikan (`display:none`) `#gold-row` → pastikan game tetap jalan (UI ≠ logika).
3. Jalankan `tsc --noEmit`, lalu `npm test`, catat hasilnya.

**Lanjut ke `01` jika:** bisa menyebut 3 dunia (DOM/Canvas/storage), 4 perintah npm, dan alasan `base './'` tidak boleh diubah.

## Kunci (BUKA SETELAH mengerjakan!)

1. Angka = jumlah key save di browser (key `mmorpg:*` per profil + auth + vol/mute). Setelah login pertama kali > 0; sebelum login hanya auth/vol.
2. Gold hilang dari layar tapi beli/jual tetap jalan (nilai di `currency.ts`, bukan di CSS). Bukti UI ≠ logika.
3. `tsc` bersih (0 error) + `npm test` 23 file / 176 test hijau (angka saat materi ditulis).
