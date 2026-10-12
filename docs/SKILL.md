---
name: legends-dev
description: Develop the Legends of Padjajaran Phaser MMORPG (jobs, maps, monsters, quests, skills, shop, save, Android/Capacitor). Use when the user asks to continue, fix, or extend this game project.
---

# Legends Dev Skill

Kerjakan repo ini mengikuti `docs/AGENTS.md` (arsitektur, aturan keras,
checklist konten). Ringkasan cepat:

- Web: `npm.cmd run dev` (5173). Verifikasi: `tsc --noEmit`, `npm run test`,
  `npm run build`. Jangan pakai sintaks Bash di npm script.
- Gameplay terpusat di `src/game/scenes/MapScene.ts`; data murni di
  `src/game/data/`; tekstur prosedural di `BootScene`.
- **`main.ts` = bootstrap saja** (auth → dynamic `import('./app')`). Isi game di
  `app.ts`. DILARANG tambah import modul data di `main.ts` — modul data
  meng-cache state saat import, jadi harus setelah `setActiveProfile()`.
  Dijaga `bootOrder.test.ts`.
- **Semua key progres lewat `scopedKey()`** (`mmorpg:p:<id>:<base>`).
  Konstanta key harus fungsi `const KEY = () => scopedKey(...)`.
- **Akun lokal** (`auth.ts`): masuk/daftar + pilih class. Class permanen.
- Scene restart tiap portal: listener global WAJIB via `onWin`/`onDom`.
- Depth Y-sort dari kaki; attackRange > jarak sentuh; save key daftar di
  `save.ts:KEY_BASES`; skill per-slot per-job.
- **Tabrakan antar-entity = soft.** DILARANG `collider` player↔monster /
  monster↔monster. Player ditahan via `blockPlayerByMonsters()`; monster pisah
  via `nudgeMonster()` (cek `blockedByObstacle`).
- **Re-render panel jaga scroll** (`keepScroll()`) + hanya render tab aktif.
- **Quick-slot 3** (hp/mp/food) di `quickslots.ts`; `pruneEmptySlots()`
  mengosongkan slot yang itemnya habis.
- **Alokasi atribut**: `−1` hanya untuk staging sesi ini (lihat
  `attrRules.ts`); poin yang sudah di-Terapkan permanen.
- Android: `npm run build:apk` (= cap:sync + gradle), `npm run mv:apk`.
- DILARANG pakai nama/logo/ikon/splash game ini untuk hal lain (LICENSE);
  fork harus rebrand. Jangan timpa Aset Merek.

Alur: usul batch → implementasi → verifikasi → ringkasan + cara tes.
Detail instalasi: `docs/INSTALL.md`.
