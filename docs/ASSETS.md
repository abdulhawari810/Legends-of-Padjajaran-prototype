# Aset visual (lisensi + pemetaan)

> Aturan: aset dari `free_assets/` TIDAK diserve langsung. File yang dipakai
> di-copy ke `public/sprites/...`, dicatat di bawah, dan dikonfigurasi di
> `src/game/data/sprites.ts`. Lisensi tiap pack tetap berlaku.

## Lisensi umum

- Pack CraftPix (`object-assets/**/`) mengacu ke
  `https://craftpix.net/file-licenses/` — lisensi gratis CraftPix pada
  umumnya mewajibkan **atribusi + link** bila dipakai komersial. Cek file
  `license.txt`/`readme.txt` tiap pack sebelum rilis, cantumkan kredit di
  layar judul/about game.
- Aset game ini (nama/logo/ikon/splash) tetap eksklusif — lihat `LICENSE`.

## Terpakai

| Key tekstur | File sumber | Pack | Status |
|---|---|---|---|
| `player-down-0..3` | `assets/characters/idle/player_idle-front-01.png` + `walk/player_walk-front-0{1,2,3}.png` | chibi warrior (CraftPix free) | ✅ BA-1 |
| `player-up-0..3` | `assets/characters/idle/player_idle-back-0{1..4}.png` | chibi warrior (CraftPix free) | ✅ BA-1 (idle-cycle, walk asli tidak ada) |
| `player-left-0..3` | `assets/characters/idle/player_idle-leftt-0{1..4}.png` | chibi warrior (CraftPix free) | ✅ BA-1 (idle-cycle) |
| `player-right-0..3` | `assets/characters/idle/player_idle-right-0{1..4}.png` | chibi warrior (CraftPix free) | ✅ BA-1 (idle-cycle) |
| `monster-slime` (+idle 14f) | `Monsters Creatures Fantasy 2/Sprites/Slime/idle.png` (2184×156) | CraftPix free | ✅ BA-2 |
| `monster-bat` (+fly 11f) | `Monsters Creatures Fantasy 2/Sprites/Bat/fly.png` (957×87) | CraftPix free | ✅ BA-2 |
| `monster-skeleton` (+idle 7f) | `object-assets/enemy_full/Skeleton/Idle.png` (896×128) | CraftPix free | ✅ BA-2 |

## Kandidat BA-1 (player, menunggu konfirmasi)

1. `assets/characters/` — chibi warrior 64x64, idle 4 arah (4-7 frame) +
   walk FRONT saja (3 frame). Enteng (<1KB/frame). Kurang: walk
   back/left/right.
2. `object-assets/npc_001/*Leader/PNG/Spritesheeets/` — sheet 4 arah
   (Idle/Walking/Running/Attacking/Hurt), tapi ±0.5-1MB per sheet, berat di web.
3. `object-assets/npc_002/Forest_Ranger_*` — 24 frame per aksi (900x900,
   ±90KB/frame), arah belum dipetakan. Cocok archer bila 4 arah ada.
