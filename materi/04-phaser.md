# 04 — Phaser yang Dipakai LoP

> Prasyarat: [03](03-arsitektur.md). Hanya API yang BENAR-BENAR dipakai.

## 1. `Phaser.Game` + konfigurasi (`src/game/Game.ts`)

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,            // WebGL jika bisa, fallback Canvas
  parent,                       // div #game-container di index.html
  width: window.innerWidth,     // kanvas penuhi layar (bukan ukuran tetap)
  height: window.innerHeight,
  pixelArt: true,               // gambar tidak di-blur saat di-scale
  roundPixels: true,            // posisi dibulatkan (anti garis samar)
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, ... },  // tanpa letterbox;
  scene: [BootScene, MapScene]  // urutan jalan: Boot dulu, lalu Map
};
```
- `gravity 0` karena game top-down (dilihat dari atas), bukan platformer.
  Konsekuensi jika diisi: semua entity meluncur ke bawah layar.
- `RESIZE` (bukan `FIT`): kanvas selalu penuhi layar; zoom diatur manual
  (`MapScene.fitWidthZoom`, VIEW_WIDTH world px). Ubah mode → tampilan
  mengecil/melebar di HP.

## 2. Scene lifecycle: `preload → create → update`

| Tahap | Kapan | Di LoP |
|-------|-------|--------|
| `constructor` | Daftar nama scene | `super('Boot')` |
| `init(data)` | Terima data pindah map | `MapScene.init({mapId, spawn})`; reset `monsters=[]`, timer, lock |
| `preload()` | Load aset (sekali) | `BootScene.preload`: `this.load.image(...)` untuk `PLAYER_FRAMES`, `this.load.spritesheet(...)` untuk `MONSTER_SHEETS`. Gagal load = fallback prosedural di `create()` |
| `create()` | Bangun dunia (sekali per masuk scene) | Ground, obstacle, spawn monster, `new Player()`, kamera, listener (`onWin`/`onDom`) |
| `update(time, delta)` | Tiap frame (~60x/detik) | Baca input → gerak → skill/serang → AI monster → projectile → HUD teks |
| `SHUTDOWN` | Scene selesai (pindah map) | Lepas semua listener global + `scale.off("resize")` |

**Aturan:** `MapScene` di-restart tiap pindah portal. Objek scene lama
(monster, timer `delayedCall`, tween) ikut mati. Yang HARUS bertahan
(cooldown skill, buff) disimpan di `persistentTimers.ts` (jam
`performance.now()`, bukan jam scene). Lupa = cooldown reset tiap pindah map.

## 3. Game loop & delta time

`update(time, delta)`: `delta` = milidetik sejak frame lalu (±16.7ms @60fps).
Kecepatan dihitung per-detik agar sama di HP kentang maupun PC:

```ts
// Player.ts: regen tiap 5000ms
this.regenAccum += delta;
if (this.regenAccum >= 5000) { ... }
```
**Kesalahan umum:** pakai angka per-frame (`x += 5`) → game 2x lebih cepat di
layar 120Hz. Selalu kali `delta` atau pakai velocity fisika (diatur px/detik).

## 4. Texture: prosedural dulu, sprite bila ada

`BootScene.create()` memanggil `createPlayerTextures()`,
`createMonsterTextures()`, `createProjectileTextures()`,
`createParticleTextures()`, `createNpcTexture()` — menggambar pakai
`this.add.graphics()` lalu `generateTexture(key, w, h)`.
Contoh: `slash` = lingkaran putih 64x64; `proj-arrow`, `proj-fire`;
`npc-elder` (jubah ungu + tongkat); player 4 arah × 4 frame (`player-down-0…`).

Sprite eksternal (`public/sprites/`, dipetakan di `sprites.ts`) di-`preload`
DULU; kalau file hilang/rusak, `create*` menimpa dengan versi prosedural.
Verifikasi: hapus satu file `public/sprites/...` → game tetap jalan
(aturan: dilarang aset eksternal wajib).

## 5. Input: keyboard + sentuh → satu pintu

- Keyboard: `this.input.keyboard.addKey('SPACE')`, dibaca dengan
  `Phaser.Input.Keyboard.JustDown(key)` (sekali per tekan, bukan tiap frame).
- Sentuh/mouse: tombol DOM (`attack.ts`, `skill.ts`, joystick) → tulis ke
  **singleton** `VirtualInput` (`attackQueued`, `skillSlotQueued`, `x/y`
  analog + deadzone 0.15).
- `MapScene.update` / `Player.update` membaca keduanya tiap frame
  (`consumeAttack()` mengosongkan antrean agar 1 tap = 1 aksi).

Kenapa dua jalur? Phaser tidak tahu DOM; DOM tidak tahu Phaser. Antrean
boolean adalah jembatan paling sederhana (lihat [07-ui](07-ui.md)).

## 6. Kamera, depth, world bounds

- `this.physics.world.setBounds(0, 0, widthPx, heightPx)` — player tidak bisa
  keluar map. `cameras.main.setBounds(...)` + `startFollow(player)` — kamera
  mengikuti. Ukuran map: `map.ts` (greenfield 40×30 tile @32px = 1280×960).
- **Depth dari kaki** (aturan keras): entity `10 + kakiY*0.01`
  (`Player.ts:758`), HP bar +0.05, bubble 30, partikel 40, teks dunia 60,
  HUD DOM di atas kanvas. Salah depth = nama monster ketutup monster lain.

## 7. Timer & tween (plus cleanup)

- `this.time.delayedCall(ms, fn)` — respawn monster, hapus teks damage.
  Timer milik scene → mati saat pindah map. Timer yang harus lintas map
  (cooldown) memakai `persistentTimers` + `timers.nowMs()`.
- `this.tweens.add({targets, alpha/scale/y, ...})` — slash membesar-memudar,
  teks damage naik, pulse idle monster, bubble NPC.
- Cleanup: `onWin`/`onDom` melepas listener saat `SHUTDOWN`; `Player.destroy()`
  melepas listenernya; `Monster.despawn()` membunuh tween + hancurkan HP bar
  + nama. Lupa melepas = listener ganda → potion terpakai 2x, reward dobel.

## Latihan (per § — kerjakan tanpa melihat Kunci di bawah!)

**§1 `Phaser.Game` + config:**
1. Ubah `backgroundColor` Game, rebuild, lihat hasilnya. Batasan: hanya 1 baris. Uji: visual.

**§2 Lifecycle:**
2. Sebut urutan `constructor → init → preload → create → update → SHUTDOWN` + 1 kalimat peran tiap tahap. Uji: tulis dari ingatan.

**§3 Game loop & delta:**
3. Tambah `console.log('frame', delta)` di `update`, amati angka ~16.7. Jelaskan kenapa `x += 5` per-frame salah di layar 120Hz. Uji: console.

**§4 Texture:**
4. Hapus 1 file `public/sprites/...` sementara → game tetap jalan. Sebut fungsi fallback apa yang menggantikannya. Kembalikan! Uji: visual.

**§5 Input:**
5. Jelaskan 1 tap = 1 aksi: `requestAttack()` → `consumeAttack()` mengosongkan antrean. Apa jadinya jika `consumeAttack()` tidak dipanggil? Uji: jawab + baca `VirtualInput.ts`.

**§6 Kamera/depth/bounds:**
6. Sebut rumus depth entity + 4 offset (HP bar/bubble/partikel/teks). Apa gejala salah depth? Uji: jawab.

**§7 Timer/tween/cleanup:**
7. Jelaskan kenapa cooldown skill TIDAK boleh pakai `this.time.now` (jam scene mati saat pindah map → pakai `persistentTimers`).

**Kriteria:** bisa menyebut urutan lifecycle + alasan tiap aturan cleanup.

## Kunci (BUKA SETELAH mengerjakan!)

1. Background berubah saja; tidak ada logika ikut berubah (config murni visual).
2. Lihat tabel §2: `init` terima data pindah map, `preload` load aset sekali, `create` bangun dunia, `update` tiap frame, `SHUTDOWN` lepas listener.
3. ~16.7ms @60fps. `x += 5`/frame = 2x lebih cepat di 120Hz; benar: kali `delta` atau pakai `velocity` (px/detik).
4. `createPlayerTextures()`/`createMonsterTextures()` menggambar prosedural karena guard `textures.exists()` — file hilang = digambar ulang.
5. Tanpa consume, antrean tetap `true` → 1 tap dieksekusi tiap frame (serang terus). Consume = sekali baca lalu kosong.
6. Entity `10 + kakiY*0.01`, HP bar +0.05, bubble 30, partikel 40, teks 60. Gejala: nama/HP bar ketutup monster lain.
7. `this.time.now` milik scene → reset tiap restart MapScene → cooldown hilang tiap pindah portal. `persistentTimers` pakai `performance.now()` (jam global).
