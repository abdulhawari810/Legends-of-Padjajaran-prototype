# 14 — Aset, Sprite & Audio Pipeline

> Prasyarat: [04](04-phaser.md). Tujuan: tambah/ganti gambar & suara tanpa merusak game.

## 1. Prinsip proyek: prosedural dulu, sprite bila ada

Aturan keras: **dilarang aset eksternal wajib.** Setiap sprite eksternal punya fallback gambar-kode. Buktinya di `BootScene.preload/create`:

* `src/game/scenes/BootScene.ts:11-26` — `preload()`: load `PLAYER_FRAMES` sebagai `image`, `MONSTER_SHEETS` sebagai `spritesheet`.
* `:28-35` — `create()`: SELALU memanggil `createPlayerTextures()`, `createMonsterTextures()`, dst. Di dalamnya ada guard `if (this.textures.exists(key)) continue/return` (`:51`, `:107`) — artinya: **kalau file berhasil load, jangan gambar ulang; kalau gagal, gambar prosedural.**

Verifikasi: hapus 1 file `public/sprites/...` → game tetap jalan (kotak warna). Itu BUKAN bug — itu fitur.

## 2. Player: `PLAYER_FRAMES` (16 file PNG)

`src/game/data/sprites.ts:37-54` memetakan key tekstur → path file:

```ts
'player-down-0': 'sprites/player/player_idle-front-01.png',
'player-down-1': 'sprites/player/player_walk-front-01.png',
...
```

* Key `player-{down,up,left,right}-{0..3}` dipakai `Player.ts` untuk anim jalan. **Jangan ubah key** — ganti FILE-nya saja (lihat komentar `:56-57`).
* File hidup di `public/sprites/player/` (disalin ke `dist/` saat build). Jangan serve dari folder luar (`free_assets`) — path build putus.
* Cara ganti set: timpa mapping di atas, atau set `null`/kosong untuk kembali 100% prosedural.

## 3. Monster: `MONSTER_SHEETS` (strip horizontal)

`src/game/data/sprites.ts:19-33`:

```ts
slime: { file: 'sprites/monsters/slime-idle.png', fw: 156, fh: 156, start: 0, end: 13, rate: 8 },
```

* `fw/fh` = ukuran 1 frame persegi, `start..end` = frame anim, `rate` = fps.
* `BootScene.ts:199-214` — potong frame 0 jadi tekstur statis `monster-{id}` (`sliceSheetFrame`), lalu buat anim `monster-{id}-idle` (`repeat: -1`).
* Konvensi key: sheet `monster-{id}-sheet`, statis `monster-{id}`, anim `monster-{id}-idle`. `monsters.ts:42` (`texture: 'monster-slime'`) merujuk ke key STATIS — jadi sheet baru otomatis dipakai tanpa ubah `monsters.ts`.

**Checklist tambah monster baru "Serigala":** `monsters.ts` (def + `texture: 'monster-serigala'`) → `BootScene.createMonsterTextures` tambah warna fallback → `sprites.ts` tambah sheet (opsional) → `map.ts` spawn → `drops.ts` loot. Speed WAJIB < speed player (lihat batch 15).

## 4. Audio: 100% prosedural WebAudio, tanpa file MP3

`src/game/audio.ts`:

* `:1-22` — `muted`/`vol` persist di `mmorpg-muted-v1`/`mmorpg-vol-v1` (preferensi perangkat, bukan progres!).
* `:56-73` — `ensure()`: buat `AudioContext` + `master GainNode`. `:75-82` `unlockAudio`/`initAudio`: resume saat gesture pertama (autoplay policy browser: tanpa klik dulu, suara diblokir).
* `:84-111` — `tone(f0, f1, dur, type)`: 1 bunyi = osilator geser frekuensi + envelope. `:113-137` — semua SFX (`sfxHit`, `sfxCoin`, `sfxLevelUp`, ...) = komposisi `tone`.

Tambah SFX baru = tambah 1 baris `export const sfxX = () => tone(...)`, lalu panggil di tempat kejadian. Tidak ada file audio untuk di-compress.

## 5. PWA: manifest + ikon

`public/manifest.webmanifest:1-8` (`name`, `display: fullscreen`, `orientation: landscape`, `start_url: ./`) + `index.html:16` (`<link rel=manifest>`). Ikon di `icons/*.webp` (48–512). Start URL `./` (relatif!) sejalan dengan `base './'` batch 00.

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. Hapus sementara 1 PNG player → jalan → jelaskan kotak warna apa yang muncul dan dari fungsi apa. (Kembalikan!)
2. Tambah sheet monster khayalan di kertas (isi `fw/fh/start/end/rate`) + sebut 3 key yang terbentuk otomatis.
3. Jelaskan kenapa SFX pertama butuh klik dulu.

**Lolos jika:** bisa menambah texture + SFX baru tanpa memecah fallback.

## Kunci (BUKA SETELAH mengerjakan!)

1. Kotak prosedural dari `createPlayerTextures()` (`BootScene.ts:37-93`): badan abu + baju warna arah (down biru/up hijau/left oranye/right merah) + kaki animasi. Guard `textures.exists()` yang memicu fallback.
2. Key otomatis: sheet `monster-{id}-sheet`, statis `monster-{id}` (frame 0), anim `monster-{id}-idle` (`BootScene.ts:199-214`).
3. Autoplay policy browser memblokir AudioContext sebelum gesture; `initAudio` (`audio.ts:79-82`) me-resume context saat `pointerdown`/`keydown` pertama.
