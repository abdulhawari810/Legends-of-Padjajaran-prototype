# AGENTS.md — Panduan nerusin proyek ini (untuk AI agent & developer)

## Cara kerja yang diharapkan

1. Usul batch (isi + kriteria selesai) → 2. Implementasi → 3. `tsc --noEmit`
   → 4. `vite build` bila sentuh runtime → 5. Ringkasan + cara tes manual.
   Jangan tanya hal yang bisa diputuskan sendiri; tanya hanya bila ambigu.

## Arsitektur singkat

- `MapScene` = hampir semua gameplay (attack/skill/quest/shop/portal/AI loop).
  Scene di-**restart tiap pindah portal** (`init({mapId, spawn})`).
- Data `src/game/data/*` murni (tanpa Phaser) kecuali butuh event/waktu.
- State global via modul (inventory/gold/quest/equip) + event `window`
  (`stats-changed`, `quest-changed`, `equipment-changed`, `skill-used`, ...).
- Tekstur 100% prosedural di `BootScene` (dilarang asset eksternal).
- Save = localStorage key `mmorpg-*` (lihat `save.ts:ALL_KEYS`).

## Aturan keras (hasil bug nyata — jangan diulang)

1. **Shell Windows**: script npm jalan di CMD. Jangan pakai sintaks Bash di
   `package.json`. Helper lintas-shell ada di `scripts/*.js`.
2. **Overlap physics**: jangan oper array yang di-reassign ke
   `physics.add.overlap`. Daftarkan per-monster; hapus dari list pakai
   `splice`, bukan `filter` (referensi array harus stabil).
3. **Restart scene**: semua listener `window`/DOM di MapScene WAJIB lewat
   helper `onWin`/`onDom` (auto-lepas saat SHUTDOWN). `Player` override
   `destroy()` melepas listenernya. Lupa = double reward/potion.
4. **Depth Y-sort dari kaki**: entity `10 + (kakiY)*0.01`, HP bar +0.05,
   bubble 30, partikel 40, teks 60, HUD 100. Ground/dekor 0-2.
5. **attackRange harus > jarak sentuh badan** (player 20px, monster 32px,
   elite 66px). Nilai sekarang sudah termasuk margin.
6. **Save baru**: daftarkan key di `save.ts:ALL_KEYS` + dukung
   export/import/clear. Quest baru otomatis ter-init di `questState.load()`.
7. **Ganti job**: `Player` konstruktor mulai dari `meta.currentJob`
   (jangan timpa meta dengan warrior). Cooldown skill per-job per-slot.
8. **Touch**: `body{touch-action:manipulation}`, panel `pan-y`, game `none`.
   Tombol sentuh sembunyi di `@media (hover:hover) and (pointer:fine)`.
9. **Evade**: monster pulang = immune + heal + abaikan player sampai home.
   Damage saat evade tampilkan EVADE, bukan angka.
10. **Tabrakan antar-entity = soft, bukan physics push.** DILARANG
    `collider` player↔monster / monster↔monster (saling dorong + tembus
    tembok + snapshot `filter()` basi). Pakai `nudgeMonster` (cek tembok
    dulu) di loop update; player↔obstacle/NPC dan monster↔obstacle tetap
    collider. Semua `setPosition` teleport (knockback/blink) wajib lewat
    guard `blockedByObstacle`.

## Cara nambah konten (checklist)

- **Monster baru**: `monsters.ts` + `drops.ts` + texture `BootScene` +
  spawn di `map.ts` (+ quest bila perlu).
- **Map baru**: `map.ts` (`MapDefShape` + `MAPS` + portal bolak-balik) +
  cabang tema di `createGround`/`createDecorations`. `MapScene` baca
  `this.mapDef` (jangan `MAP_DEF` langsung).
- **Quest baru**: `quests.ts` (+`requires` untuk chain). Panel/NPC otomatis.
- **Skill baru**: `skills.ts` + cabang `def.id` di `trySkill` + tombol bila
  slot baru (lihat Batch N).
- **Item baru**: `items.ts` (+ shop/enhance/drops bila terkait).
- **Event UI baru**: daftar di `bindGlobalListeners` (bukan addEventListener
  mentah) bila hidup di MapScene.

## Perintah

```bash
npm.cmd run dev | test | build | build:apk | mv:apk
.\node_modules\.bin\tsc --noEmit
node scripts/make-icons.js <logo> [warna-bg]
```

## Batasan lisensi (penting!)

`LICENSE`: kode boleh dipakai + atribusi, tapi **nama "Legends of
Padjajaran"/LoP, logo, ikon, splash.mp4, artwork = eksklusif, dilarang
pakai**. Fork WAJIB rebrand total. Jangan generate/timpa Aset Merek.
