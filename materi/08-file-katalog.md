# 08 — Katalog File

> Legenda tiap entri: tujuan → export kunci → dipakai oleh → risiko → cara uji.
> Detail pola ada di [03](03-arsitektur.md)–[07](07-ui.md); di sini fokus
> "file apa, tanggung jawab apa".

## A. Entry & boot

| File | Tujuan | Kunci | Dipakai oleh | Risiko / Uji |
|------|--------|-------|--------------|--------------|
| `index.html` | Struktur DOM: auth, HUD, panel, overlay | ±140 id (lihat materi 07) | `main.ts` via `getElementById` | Hapus id → UI terkait mati diam-diam (guard `if (!el) return`). Uji: buka devtools, cek elemen |
| `src/main.ts` | Bootstrap auth-first + dynamic `import('./app')` | `boot()`, `launch()` (internal) | script module HTML | Import statis modul data di sini = cache profil salah + tes bootOrder merah |
| `src/app.ts` | `startGame(job)`: tulis job→save, buat game, init 15 UI + audio | `startGame`, `paintJob`, `resolveJob` | `main.ts` (dynamic) | Urutan init bebas, tapi `createGame` sebelum UI baca state. Uji: reload, cek HUD terisi |
| `src/game/Game.ts` | Factory `Phaser.Game` + config | `createGame(parent)` | `app.ts` | Ubah scale/gravity → seluruh tampilan/gerak berubah. Uji visual |
| `src/style.css` | Seluruh styling (15 kelompok) | selector `#top-hud`, `.panel`, `.bag-*`, `.ql-*`, media query | `index.html` + semua UI | Aman (visual saja). Uji: resize + HP mode |

## B. Scene & dunia

| File | Tujuan | Kunci | Risiko / Uji |
|------|--------|-------|--------------|
| `src/game/scenes/BootScene.ts` | Preload sprite + generate SEMUA texture prosedural → `start('Map')` | `BootScene`, `preload/create`, `create*Textures`, `sliceSheetFrame` | Texture key dipakai lintas scene (`slash`, `npc-elder`). Uji: hapus 1 sprite public → fallback jalan |
| `src/game/scenes/MapScene.ts` | Hampir semua gameplay (2.726 baris!): spawn, combat, skill, AI loop, NPC/shop/bank/tempa, portal, gather, bounty, minimap data, save periodik | `init/create/update`, `tryAttack/trySkill/damageMonster/spawnMonster/resetMap/claimQuest/openNpc/checkPortals`, helper `onWin/onDom` | Pelajari per method (lihat 05). Listener WAJIB via helper. Uji: main 5 menit + pindah map |
| `src/game/text.ts` | Teks dunia anti-ketutup HUD | `worldText`, `isBehindHud`, `hudOcclusionPx` | Ubah offset → teks ketutup HUD. Uji visual |
| `src/game/audio.ts` | SFX WebAudio prosedural + mute/volume persist | `sfx*`, `initAudio`, `unlockAudio` (autoplay policy) | Audio butuh gesture dulu. Uji: klik → bunyi |

## C. Entity & input

| File | Tujuan | Kunci | Risiko / Uji |
|------|--------|-------|--------------|
| `src/game/entities/Player.ts` | Avatar: job permanen, atribut, combat stat, buff, cooldown global, listener | `Player`, `StatsSnapshot`, `takeDamage/die/respawn`, `rollDamage`, `stageAttr/applyStaged`, `addExp`, `useQuickItem` | `destroy()` melepas listener (aturan). Uji: ganti map → tidak ada aksi ganda |
| `src/game/entities/Monster.ts` | AI kejar/leash/evade + HP bar + skala level | `chaseOrHold/returnHome/takeDamage/dieWithEffect/despawn/provoke` | Evade = immune (jangan "perbaiki" jadi bisa dipukul). Uji: lari jauh → EVADE + heal |
| `src/game/entities/Npc.ts` | NPC statis + bubble `!/lelah` | `Npc`, `setClaimable`, `destroyAll` | — |
| `src/game/entities/GatherNode.ts` | Node ore/herb | `GatherNode`, `NodeKind` | — |
| `src/game/entities/persistentTimers.ts` | Jam global + cooldown/buff lintas scene | `nowMs`, `state`, `resetPersistentState`, `pruneExpiredState` | Reset di sini = semua cooldown hilang. Ada tesnya |
| `src/game/input/VirtualInput.ts` | Singleton antrean input (43 baris, baca utuh!) | `x/y`, `requestAttack/consumeAttack`, `requestSkill/consumeSkill` | `consume*` wajib dipanggil tiap baca agar 1 tap = 1 aksi |

## D. Data karakter & tempur

| File | Tujuan | Kunci |
|------|--------|-------|
| `data/attributes.ts` | Formula primer→derived, mitigasi, EXP | `Primary`, `Derived`, `calcDerived`, `mitigatePhysical/Magical`, `rollCrit`, `expForLevel` |
| `data/attrRules.ts` | Aturan staging alokasi atribut | `canIncrement/canDecrement`, pool, hint |
| `data/jobs.ts` | 3 job + base + growth | `JobId`, `Job`, `JOBS` |
| `data/skills.ts` | 9 definisi skill | `SkillDef`, `SKILLS` |
| `data/skillLevel.ts` | Level skill 1–3 + biaya | `tryUpgradeSkill`, `skillDamageMult/Cd/Cast` |
| `data/monsters.ts` | 10 monster + boss | `MonsterDef`, `MONSTERS` (tuning TTK di sini) |
| `data/map.ts` | 3 map + portal/NPC/gather/town | `MAPS`, `getMapDef`, `MapDefShape` |
| `data/sprites.ts` | Mapping sprite eksternal + fallback | `MONSTER_SHEETS`, `PLAYER_FRAMES` |

## E. Ekonomi & item

| File | Tujuan | Kunci |
|------|--------|-------|
| `data/items.ts` | 15 definisi item + aturan quick-slot | `ItemDef`, `ITEMS`, `getItem`, `fitsQuickSlot` |
| `data/inventory.ts` | Tas count-Map + default starter | `addItem/removeItem/getCount/snapshotInventory` |
| `data/currency.ts` | Dompet gold | `getGold/addGold/spendGold` |
| `data/equipment.ts` | Equip 2 slot + bonus gear + tempa | `canEquip/equipItem/unequipSlot`, `gearBonusFor`, `calcDerivedWithGear` |
| `data/enhance.ts` | Tempa +1…+5 | `tryEnhance`, `enhanceCost` (gold+gel progresif) |
| `data/drops.ts` | Tabel drop murni + `rand` injeksi | `rollDrops`, `DropRoll` |
| `data/shop.ts` | Vendor beli/jual + catat quest | `SHOP_BUY/SHOP_SELL`, `buyItem/sellItem` |
| `data/bank.ts` | Brankas anti-penalti | `depositGold/withdrawGold/storeItem/takeItem` |
| `data/quickslots.ts` | 3 slot toolbar HP/MP/food | `getQuickItem/setQuickItem/pruneEmptySlots` |
| `data/prof.ts` | Mining/herbalism | `addProfXp`, `rollGatherLoot`, `channelTimeMs` |

## F. Quest, progres & akun

| File | Tujuan | Kunci |
|------|--------|-------|
| `data/quests.ts` | 16 quest berantai | `QuestDef`, `QUESTS` (`requires`, gather/buy/sell/deposit) |
| `data/questState.ts` | State progres + klaim 1x | `registerKill/Gather/Buy/Sell/Deposit`, `canClaim/claimReward`, `isQuestUnlocked` |
| `data/bounty.ts` | Bounty harian per map | `BOUNTIES`, `registerKillBounty`, reset tanggal |
| `data/achievements.ts` | 13 pencapaian auto-klaim | `checkKills/Level/...`, `snapshotAchievements` |
| `data/stats.ts` | Statistik global lintas-job | `addKill/Death/Claim/...`, `getStats` |
| `data/save.ts` | Save per-job/pos/meta + 3 slot + backup | `saveJobSave/loadPos/saveMeta`, `saveSlot/loadSlot/deleteSlot`, `exportSave/importSave`, `ALL_KEYS` |
| `data/persistence.ts` | localStorage + namespace profil | `scopedKey`, `loadJSON/saveJSON`, `setActiveProfile`, `keysOfProfile` |
| `data/auth.ts` | Akun lokal multi-profil (BUKAN backend) | `register/login/logout`, `setProfileJob`, `migrateLegacySave`, `wipeEverything` |
| `data/sha256.ts` | Hash password pure-JS | `hashPassword`, `makeSalt`, `safeEqual` |
| `data/settings.ts` | Kualitas partikel | `getQuality/setQuality` |

## G. UI (17 modul — pola `init*` + event, lihat 07)

`attack` (antre serang) · `skill` (3 tombol + cooldown) · `joystick` (analog) ·
`quickslots` (toolbar + `use-quick`) · `hud` (bar HP/MP/EXP) ·
`targetPanel` (bingkai target) · `buffBar` (chip buff + interval) ·
`minimap` (gambar `minimap-update`) · `chat` (desktop, event `chat`) ·
`charPanel` (4 tab + alokasi atribut + save row) ·
`gamePanels` (tas doll+vital + quest/bounty/achievement + toast) ·
`questList` (HTML quest/bounty/achievement + `bindQuestList`) ·
`settings` (volume/mute/kualitas/slot/backup/reset-map) ·
`authScreen` (login/register/pilih class, Promise) ·
`orientation` (kunci lanskap + `#rotate-hint`) · `quickmenu` (mirror desktop).

## H. Konfigurasi, script, platform

| File | Tujuan |
|------|--------|
| `package.json` | Script: `dev/build/preview/test/cap:sync/build:apk/mv:apk/tauri` |
| `tsconfig.json` | strict, ES2020, `include: [src]` — cek error: `tsc --noEmit` |
| `vite.config.ts` | `base './'`, `outDir dist`, phaser chunk terpisah |
| `vitest.config.ts` | jsdom, `src/**/*.test.ts` |
| `capacitor.config.ts` | appId `com.mmorpg.web`, `webDir dist` |
| `index.html` head | viewport lock-zoom, `screen-orientation`, manifest |
| `public/manifest.webmanifest` + `public/sprites/` | PWA + 19 sprite (dipakai via `sprites.ts`; fallback prosedural) |
| `scripts/build-apk.js` / `copy-apk.js` / `make-icons.js` | Build APK lintas-shell, salin ke Downloads, generate ikon |
| `android/` (Java+res) / `src-tauri/` (Rust) | Wrapper native: splash, ikon, `tauri.conf.json` (`frontendDist ../dist`). Bukan materi inti |
| `docs/`, `FOR_AI_AGENT.md`, `CHANGELOG.md` | Dokumen proyek yang sudah ada (baca sebagai pelengkap) |
| `*.test.ts` (21 file) | Spesifikasi perilaku per modul — baca SEBELUM ubah modulnya |
| `dist/`, `node_modules/`, `android/app/build` | Hasil build & dependensi — jangan diedit/dihafal |

**Cara uji perubahan per file:** modul data → `npx vitest run <file>.test.ts`
(bila ada) + `tsc --noEmit`; scene/entity/UI → `npm run dev` + skenario
manual (lihat 10–11); semua → `npm run build` sebelum dianggap selesai.
