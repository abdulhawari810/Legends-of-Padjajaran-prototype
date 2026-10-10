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
- Scene restart tiap portal: listener global WAJIB via `onWin`/`onDom`.
- Depth Y-sort dari kaki; attackRange > jarak sentuh; save key daftar di
  `save.ts:ALL_KEYS`; skill per-slot per-job.
- Android: `npm run build:apk` (= cap:sync + gradle), `npm run mv:apk`.
- DILARANG pakai nama/logo/ikon/splash game ini untuk hal lain (LICENSE);
  fork harus rebrand. Jangan timpa Aset Merek.

Alur: usul batch → implementasi → verifikasi → ringkasan + cara tes.
Detail instalasi: `docs/INSTALL.md`.
