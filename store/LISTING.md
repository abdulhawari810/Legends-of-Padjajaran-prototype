# Listing Play Store — Legends of Padjajaran

## Aset siap
- `store/icon-512.png` — ikon listing 512×512 (dari Lop.jpg)
- Launcher HP: sudah generate via `capacitor-assets` (adaptive + legacy)

## Masih manual (butuh manusia)
- [ ] Feature graphic 1024×500 (logo + nama di tengah, tanpa teks penting di tepi)
- [ ] Screenshot HP min 2 (16:9 atau 9:16), JPEG/PNG
- [ ] Deskripsi singkat (≤80 char) + deskripsi penuh
- [ ] Kategori: Game > RPG, rating kuesioner (kekerasan fantasi ringan)
- [ ] Data safety: **tidak kumpulin data** (save cuma localStorage di HP)

## Rilis
- [ ] `npm run build:apk` → app-debug (tes) / bundle release + signing (produksi)
- [ ] Naikkan `version` tiap rilis (package.json + tauri.conf.json ikut)
- [ ] Update CHANGELOG.md
