# MMORPG Web 2D — Singleplayer (Web saja)

Scope awal: 1 map (Greenfield), beberapa monster, quest, item, 3 job class.
Karakter: 1 player bisa jalan atas / kiri / kanan / bawah (WASD + Panah).

## Struktur
```
index.html
src/
  main.ts            -> bootstrap + UI pilih job
  style.css
  game/
    Game.ts          -> konfigurasi Phaser
    scenes/
      BootScene.ts   -> generate texture prosedural (tanpa asset eksternal)
      MapScene.ts    -> 1 map, kamera follow, spawn monster
    entities/
      Player.ts      -> jalan 4 arah + animasi
      Monster.ts     -> visual idle bob
    data/
      jobs.ts        -> warrior, mage, archer
      monsters.ts    -> slime, goblin, skeleton
      items.ts
      quests.ts
      map.ts         -> definisi Greenfield 40x30
```

## Jalankan
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # output dist/
```

> Catatan: Capacitor/Tauri sengaja belum dipasang sesuai permintaan (web dulu).
> `vite.config.ts` sudah pakai `base: './'` agar nanti siap dibungkus.
