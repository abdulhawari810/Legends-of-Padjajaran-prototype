# 17 — Mobile, Desktop & Rilis (Capacitor / Tauri / PWA)

> Prasyarat: [00](00-fondasi-web.md), [07](07-ui.md).
> Tujuan: game jalan di HP + bisa dibungkus APK/desktop. Bukan materi inti logika.

## 1. Status platform (hasil audit)

| Platform | Alat | Bukti | Status |
|----------|------|-------|--------|
| Web/PWA | Vite `dist/` + manifest | `manifest.webmanifest`, `index.html:16` | Jalan (`npm run build` → `dist/`) |
| Android APK | Capacitor 8 | `capacitor.config.ts` (`appId com.mmorpg.web`, `webDir dist`), script `cap:sync/build:apk/mv:apk` | Bisa build |
| Desktop | Tauri 2 | `src-tauri/tauri.conf.json` (`frontendDist ../dist`) | Scaffold saja |
| Backend/multiplayer | — | Tidak ada | TIDAK ada (localStorage saja) |

Ingat `vite.config.ts:6` (`base './'`) — tanpa ini APK/Tauri blank karena path absolut tidak ada di `capacitor://`/`tauri://`.

## 2. Perintah rilis (jangan hafal, pahami urutannya)

```
npm run build        # tsc + vite → dist/
npm run cap:sync     # build + salin dist ke native
npm run build:apk    # + Gradle → APK (butuh Android SDK)
npm run mv:apk       # salin APK ke Downloads
```

Script: `package.json` + `scripts/build-apk.js`, `copy-apk.js` (lintas-shell CMD/Bash, aturan 1 di `03 §6`). `android/` (Java+res) dan `src-tauri/` (Rust) = wrapper native, jangan diedit untuk belajar web.

## 3. Lanskap wajib + sentuh vs klik (3 jebakan HP)

* **Kunci lanskap:** `orientation.ts:5-32` — coba `screen.orientation.lock('landscape')` saat gesture pertama (butuh fullscreen di sebagian Android), gagal → fallback overlay CSS `#rotate-hint` (`index.html:218-223`) yang menutup layar portrait. `orientationchange` → paksa `resize` Phaser (`:29-31`).
* **Manifest** (`manifest.webmanifest:4-5`): `display: fullscreen`, `orientation: landscape` — konsisten dengan di atas.
* **`pointerdown` bukan `click`:** semua tombol aksi (`attack.ts:36`, joystick, skill) memakai `pointerdown` agar responsif di HP + `touch-action: manipulation` (aturan 8). Bug nyata: render ulang DOM (`innerHTML`) di antara `touchstart`–`touchend` menghapus tombol di bawah jari → tap HP gagal, desktop bisa (`10 §4`).
* **Layout ganda:** `style.css` — HP lanskap pendek (`max-height:500px`: tombol 36px, minimap 96px) vs desktop (`hover:hover + pointer:fine`: joystick sembunyi, diganti quick-menu + chat). Uji: resize browser sempit + mode HP DevTools.

## 4. Performa HP kentang

* Kecepatan pakai `velocity` (px/detik) / `delta`, BUKAN per-frame (`04 §3`) — 120Hz tidak jadi 2x cepat.
* Kualitas partikel: `settings.ts` (`getQuality/setQuality`, tombol `#btn-quality`) — turunkan saat lag.
* Kamera: `RESIZE` penuhi layar + zoom manual (`fitWidthZoom`), bukan `FIT` letterbox (`04 §1`).
* Audio butuh gesture pertama (`unlockAudio`, `14 §4`) — tes suara SELALU setelah klik.

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. `npm run build` → buka `dist/index.html`? Jelaskan kenapa harus diserve, bukan double-click.
2. Putar DevTools ke portrait → jelaskan apa yang menutup layar dan dari file apa.
3. Sebut 2 perbedaan input HP vs desktop + file kodenya.

**Lolos jika:** bisa build + menjelaskan 3 jebakan HP tanpa mencontek.

## Kunci (BUKA SETELAH mengerjakan!)

1. Double-click (`file://`) = module import + path relatif gagal (CORS + base). Harus diserve (`npm run preview` / `vite preview` / web server) — sama alasannya dengan dev via `npm run dev`.
2. `#rotate-hint` (`index.html:218-223`) via CSS portrait + `orientation.ts` (coba lock landscape saat gesture). Tampil = paksa putar ke lanskap.
3. HP: joystick + `pointerdown` (`joystick.ts`, `attack.ts:36`); desktop: keyboard + quick-menu/chat (`hover:hover + pointer:fine` di `style.css`). Tombol sentuh sembunyi di desktop.
