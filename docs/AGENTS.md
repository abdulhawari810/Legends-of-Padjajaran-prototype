# AGENTS.md — Panduan nerusin proyek ini (untuk AI agent & developer)

## Cara kerja yang diharapkan

1. Usul batch (isi + kriteria selesai) → 2. Implementasi → 3. `tsc --noEmit`
   → 4. `vite build` bila sentuh runtime → 5. Ringkasan + cara tes manual.
   Jangan tanya hal yang bisa diputuskan sendiri; tanya hanya bila ambigu.

## Arsitektur singkat

- **`main.ts` = BOOTSTRAP SAJA.** Tentukan profil aktif, lalu dynamic
  `import('./app')`. Seluruh game ada di `app.ts`. Alasannya di aturan #15.
- `MapScene` = hampir semua gameplay (attack/skill/quest/shop/portal/AI loop).
  Scene di-**restart tiap pindah portal** (`init({mapId, spawn})`).
- Data `src/game/data/*` murni (tanpa Phaser) kecuali butuh event/waktu.
- State global via modul (inventory/gold/quest/equip/quickslots) + event
  `window` (`stats-changed`, `quest-changed`, `equipment-changed`,
  `quick-item-used`, `quickslots-changed`, `skill-used`, ...).
- UI panel: `charPanel.ts` (Karakter), `gamePanels.ts` (Equipment + Quest),
  `quickslots.ts` (toolbar 3 slot), `buffBar.ts` (bar buff di bawah HUD),
  `questList.ts` (renderer list quest bersama), `authScreen.ts` (login/daftar
  + pilih class).
- Tekstur 100% prosedural di `BootScene` (dilarang asset eksternal).
- Save = localStorage key `mmorpg:p:<profileId>:<base>` (lihat
  `save.ts:allKeys()` + `persistence.ts:scopedKey`).

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
6. **Save/progres baru**: daftarkan key dasar di `save.ts:KEY_BASES` + dukung
   export/import/clear. Quest baru otomatis ter-init di `questState.load()`.
7. **Job class PERMANEN.** Ditetapkan sekali saat layar pilih class
   (`auth.ts:setProfileJob`), lalu `Player.jobLocked = true` menguncinya.
   Strip `#job-select` di `app.ts` diganti label read-only. Tidak ada UI
   untuk ganti class sama sekali.
8. **Touch**: `body{touch-action:manipulation}`, panel `pan-y`, game `none`.
   Tombol sentuh sembunyi di `@media (hover:hover) and (pointer:fine)`.
9. **Evade**: monster pulang = immune + heal + abaikan player sampai home.
   Damage saat evade tampilkan EVADE, bukan angka.
10. **Tabrakan antar-entity = soft, bukan physics push.** DILARANG
    `collider` player↔monster / monster↔monster (saling dorong + tembus
    tembok + snapshot `filter()` basi). Player **ditahan** lewat
    `blockPlayerByMonsters()` (revert ke `body.prev`, monster tak tersentuh).
    Monster pisah via `nudgeMonster` (cek tembok dulu). player↔obstacle/NPC,
    monster↔obstacle, dan player↔**node gather** tetap collider (semuanya
    static body, jadi tidak bisa saling dorong).
11. **Re-render panel = JAGA SCROLL.** `stats-changed` datang tiap ~5 detik
    (regen HP). Kalau `innerHTML` ditimpa tiap event, scroll user meloncat ke
    atas dan tombol `+/-` alokasi atribut hilang di tengah tap. Pakai
    `keepScroll()` (charPanel) / simpan-restore `scrollTop` (gamePanels), dan
    **hanya render tab yang sedang aktif** (`renderActiveView`).
12. **Quick-slot**: 3 slot (hp/mp/food) di `quickslots.ts`. Item dipasang dari
    panel Equipment. Item habis (count 0) atau jenisnya tidak cocok →
    `pruneEmptySlots()` mengosongkan slot otomatis. Satu item hanya boleh di
    satu slot.
13. **Konsumsi item**: `Player.useQuickItem(id)` validasi SEMUA dulu sebelum
    mutasi HP/MP/buff. Dispatch `quick-item-used {id, kind}` (UI yang
    mengurangi stok — bukan UI yang menebak dari slot), plus `potion-used`
    hanya untuk potion dan `buff-used` hanya untuk makanan.
14. **Alokasi atribut: `−1` hanya untuk staging sesi ini.** Poin yang sudah
    di-commit lewat "Terapkan" itu PERMANEN; satu-satunya jalan mundur adalah
    `resetAllAttributes()` (20G). Aturan ini WAJIB lewat helper `attrRules.ts`
    (`canDecrement`/`canIncrement`) supaya `Player.stageAttr` dan UI
    `charPanel.renderAbility` tidak pernah berbeda. DILARANG menulis
    `spent[k] + pending[k] > 0` — itu membuat `−1` tetap muncul setelah apply
    sekaligus hilang begitu pool habis (dua bug sekaligus).
15. **URUTAN BOOT WAJIB (paling rawan).** Hampir semua modul data
    me-cache state saat di-import (`let equipped = loadJSON(...)`,
    `const counts = new Map(...)`). Kalau di-import SEBELUM
    `setActiveProfile()`, state ter-cache milik profil yang salah dan tidak
    pernah di-reload → progres antar akun bercampur.
    **DILARANG** menambah import modul data/Game/audio di `main.ts` atau
    `ui/authScreen.ts`. Muat lewat `await import('./app')`.
    Dijaga oleh test `bootOrder.test.ts`.
16. **Semua key progres WAJIB lewat `scopedKey()`**, bukan string datar.
    Konstanta key harus fungsi: `const KEY = () => scopedKey('mmorpg-x-v1')`
    — BUKAN `const KEY = 'mmorpg-x-v1'` (nilai dihitung saat import, saat
    namespace belum diketahui). Dicek juga oleh `bootOrder.test.ts`.

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
  Consumable baru wajib isi `quick` (hp/mp/food) + minimal satu efek
  (`heal`/`mana`/`buffAtk`/`buffDef`/`regenHp`) — ada test yang memaksa ini.
- **Consumable baru yang ke-quick-slot**: `fitsQuickSlot` otomatis lewat
  `quick`, tidak perlu kode tambahan di UI.
- **Save key baru**: tambah ke `save.ts:KEY_BASES` (bukan `ALL_KEYS`, yang
  sudah jadi fungsi `allKeys()`).
- **Event UI baru**: daftar di `bindGlobalListeners` (bukan addEventListener
  mentah) bila hidup di MapScene.
- **Avatar per job**: `charPanel.ts:AVATAR_OVERRIDE`. Taruh PNG di
  `public/sprites/avatar/<job>.png` lalu isi mapping-nya; tanpa itu pakai
  sprite bawaan + tint per job.
- **Akun/profil baru**: cukup pakai `auth.ts` (`register`/`login`/
  `setProfileJob`). Tidak perlu menyentuh modul data.

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
