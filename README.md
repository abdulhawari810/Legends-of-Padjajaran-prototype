# Legends of Padjajaran — MMORPG Web 2D (Singleplayer)

> Lihat `LICENSE`: kode boleh dipakai dengan atribusi, **nama + logo/ikon
> game ini dilarang dipakai** (fork wajib rebrand).

Game RPG 2D top-down singleplayer: 3 job, 3 map, 10 monster (+2 boss),
12 quest + bounty harian, shop, tempa gear, 9 skill, achievement, dan
save permanen — jalan di web, Android (Capacitor), dan siap desktop (Tauri).

## Konsep game

Petualang solo membersihkan Greenfield → Dark Forest → Crystal Cave.
Bunuh monster → EXP + gold + drop → naik level → beli potion / tempa gear →
quest chain terbuka berurutan → bounty harian elite → boss berpola.
Mati = respawn di heal zone dengan penalti 5% gold.

**Game loop:**
- Menit-ke-menit: cari monster → serang/skill (2014-style target + hadap) →
  hindari AoE merah boss → loot → heal/potion.
- Sesi: selesaikan quest chain → klaim ke Tetua → belanja/tempa → bounty.
- Harian: bounty elite reset + achievement + backup save.

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Engine | Phaser 3.80 (Arcade Physics, tekstur prosedural, tanpa asset eksternal) |
| Web | Vite 5, TypeScript 5, HTML/CSS responsif (mobile + desktop) |
| Android | Capacitor 8 (immersive fullscreen, splash video, launcher icon) |
| Desktop | Tauri 2 (config siap, build belakangan) |
| Audio | WebAudio prosedural (8+ SFX, volume + mute persist) |
| Test/CI | Vitest 2 + jsdom (19 tes), GitHub Actions APK |
| Save | localStorage per-WebView (per-job, posisi per-map, inventory, quest, dsb) |

## Yang terpasang

- Dep: `phaser`, `@capacitor/{core,cli,android}`, `@tauri-apps/api`
- DevDep: `typescript`, `vite`, `vitest`, `jsdom`, `@tauri-apps/cli`,
  `@capacitor/assets`, `sharp`
- Native: `android/` (Capacitor, immersive + splash video + icon),
  `src-tauri/` (config siap), `capacitor.config.ts`
- Script bantu: `scripts/{build-apk,copy-apk,make-icons}.js`

## Fitur

- **3 job** (Warrior/Mage/Archer), save terpisah per job, ganti tanpa reset
- **3 map** via portal: Greenfield → Dark Forest → Crystal Cave (+heal zone)
- **10 monster + 2 boss** (Elite & Troll berpola AoE telegraph + summon),
  AI aggro/provoke/leash-evade (immune + heal saat pulang)
- **12 quest chain + bounty harian + 6 achievement** + statistik
- **Shop** (beli potion/jual drop), **tempa +1..+5**, atribut New World ×
  combat WoW (crit/dodge/block/haste/lifesteal)
- **9 skill** (3/job, MP + cooldown per-slot), auto-target + syarat hadap
- **Juice**: partikel, screen-shake, damage number, EVADE, Y-sort depth
- **UI RPG**: HUD emas, minimap, panel modal tengah, tombol sentuh (sembunyi
  di desktop), pengaturan volume/kualitas, backup export/import

## Mulai cepat

```bash
npm.cmd run dev      # web http://localhost:5173 (Windows pakai npm.cmd!)
npm.cmd run test     # 19 unit test
npm.cmd run build    # tsc + vite → dist/
npm.cmd run build:apk  # cap:sync + Gradle → APK debug
npm.cmd run mv:apk     # salin APK ke Downloads
```

Detail instalasi + masalah umum: [`docs/INSTALL.md`](docs/INSTALL.md).

## Struktur

```
src/main.ts            bootstrap UI + job-select + mute
src/style.css          seluruh UI (responsif + tema RPG)
src/game/Game.ts       config Phaser (RESIZE fullscreen-lebar)
src/game/audio.ts      SFX WebAudio
src/game/data/         jobs/monsters/items/quests/drops/shop/equipment/
                       enhance/skills/attributes/currency/inventory/
                       questState/bounty/stats/achievements/settings/
                       save/persistence/map
src/game/entities/     Player/Monster/Npc
src/game/scenes/       BootScene (tekstur) + MapScene (semua gameplay)
src/game/input/        VirtualInput
src/ui/                joystick/attack/skill/hud/gamePanels/charPanel/
                       settings/minimap/orientation
scripts/               build-apk/copy-apk/make-icons (lintas CMD/Bash)
android/               wrapper Capacitor | src-tauri/ config Tauri
docs/                  INSTALL + AGENTS + SKILL (untuk AI/developer)
store/                 icon-512 + checklist listing
```

## Untuk AI agent / developer

- Lanjut proyek: [`docs/AGENTS.md`](docs/AGENTS.md) (arsitektur + jebakan umum)
- Skill siap tempel: [`docs/SKILL.md`](docs/SKILL.md)
- Cara kerja per batch: usul → implementasi → `tsc` → `build` → ringkasan + cara tes
