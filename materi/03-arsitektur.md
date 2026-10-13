# 03 — Arsitektur LoP

> Prasyarat: [01](01-typescript-dasar.md), [02](02-typescript-lanjutan.md).

## 1. Tech stack (hasil audit nyata)

| Lapisan | Teknologi | Versi | Bukti |
|---------|-----------|-------|-------|
| Bahasa | TypeScript (strict) | 5.5.4 | `tsconfig.json` (`strict: true`, target ES2020) |
| Engine | Phaser | 3.80.1 | `package.json`, dipisah chunk sendiri di `vite.config.ts` |
| UI | DOM + CSS murni | — | `index.html` (423 baris), `src/style.css` (2.390 baris). **Tanpa React** (tidak ada import react / file tsx) |
| Build | Vite | 5.4.8 | `base: './'` WAJIB agar jalan di `file://`, `capacitor://`, `tauri://` |
| Test | Vitest + jsdom | 2.1.0 | `*.test.ts` berdampingan dengan source |
| Mobile | Capacitor 8 | 8.5.3 | `capacitor.config.ts` (`appId com.mmorpg.web`, `webDir dist`) |
| Desktop | Tauri 2 (scaffold) | 2.12.1 | `src-tauri/tauri.conf.json` (`frontendDist ../dist`) |
| Save | localStorage | — | `src/game/data/persistence.ts`, key `mmorpg:*` |
| Backend/server/DB | **Tidak ada** | — | Auth = akun lokal + SHA-256 pure-JS (`auth.ts`) |

## 2. Entry point & alur boot (baca berurutan!)

```
index.html
  └─ <script src="/src/main.ts">          (baris 421)
       └─ main.ts: boot()
            ├─ bindAuthScreen()            pasang UI login
            ├─ await showAuthScreen()      Promise<boolean>
            │     ├─ ada sesi → true → launch()
            │     └─ belum → tunggu onReady → launch()
            └─ launch()
                 ├─ currentProfile()       profil aktif?
                 ├─ dynamic import('./app')← PENTING: modul data baru
                 │                           di-load SETELAH profil aktif
                 └─ app.startGame(job)
                      ├─ tulis job ke save game
                      ├─ createGame(container)   → Phaser.Game
                      └─ init*(...) × 15         → semua UI DOM + audio
```

**Kenapa urutannya sakral** (`main.ts:6-19`): modul data meng-cache state
saat di-import (`let gold = loadJSON(KEY(), 0)` di `currency.ts:4`).
Key ikut profil aktif (`mmorpg:p:<id>:gold-v1`). Import sebelum profil aktif
= cache milik profil yang salah **selamanya**. Ada tes yang menjaga ini:
`bootOrder.test.ts` (gagal bila `main.ts` import statis modul berstate).

**Konsekuensi jika diubah:** memindah `import { addGold }` ke `main.ts` →
game jalan dengan dompet profil lain + tes bootOrder merah.

## 3. Peta modul (tiga lapisan)

```
┌─ LAPISAN DATA (src/game/data/*) ─────────────────────────┐
│ MURNI: tanpa Phaser, tanpa DOM (kecuali dispatch event).  │
│ attributes · jobs · items · monsters · quests · map ·     │
│ skills · drops · shop · bank · enhance · bounty ·         │
│ achievements · stats · prof · quickslots · inventory ·    │
│ currency · equipment · questState · save · auth ·         │
│ persistence · settings · sha256 · sprites · skillLevel    │
│ → gampang di-unit-test (lihat *.test.ts di sebelahnya)   │
└───────────────────────────────────────────────────────────┘
        ▲ dipakai oleh          ▲ dipakai oleh
┌─ LOGIKA (entities/scenes) ─┐  ┌─ UI (src/ui/* + index.html) ┐
│ Player · Monster · Npc ·    │  │ hud · joystick · attack ·   │
│ GatherNode · MapScene ·     │  │ skill · quickslots ·        │
│ BootScene · VirtualInput    │  │ charPanel · gamePanels ·    │
│ audio · text · Game         │  │ settings · minimap · chat · │
└─────────────────────────────┘  │ targetPanel · buffBar ·     │
                                 │ questList · authScreen ·    │
                                 │ orientation · quickmenu     │
                                 └─────────────────────────────┘
              LAPISAN LOGIKA & UI terhubung via EVENT BUS (bagian 4),
              bukan panggilan fungsi langsung.
```

**Aturan arah dependensi:** data tidak boleh import entity/scene/UI.
UI boleh import data. Scene/entity boleh import data. (`bootOrder.test.ts`
mengawasi sebagian aturan ini.)

## 4. Event bus: jembatan UI ↔ game

Karena UI (DOM) dan game (Phaser) hidup di dunia berbeda, mereka bicara lewat
`window.dispatchEvent(new CustomEvent(...))`. Daftar lengkap yang ditemukan:

| Event | Pengirim | Penerima | Isi (`detail`) |
|-------|----------|----------|----------------|
| `stats-changed` | Player (`emitStats`) | hud, charPanel, gamePanels, buffBar, skill | `StatsSnapshot` |
| `gold-changed` | currency | gamePanels (`#gold`), MapScene | angka gold |
| `inventory-changed` | inventory | gamePanels, quickslots UI | — |
| `equipment-changed` | equipment | Player (recalc), charPanel, gamePanels | `{weapon, armor}` |
| `quest-changed` | questState | gamePanels, charPanel, NPC bubble | — |
| `select-job` | UI job | Player | `JobId` |
| `minimap-update` | MapScene (tiap 400ms) | minimap | `MinimapData` |
| `target-show` / `target-hide` | MapScene | targetPanel | data monster |
| `chat` | MapScene/sistem | chat UI | teks |
| `claim-quest` | UI quest/NPC | MapScene | questId |
| `reset-map` | settings UI | MapScene | — |
| `open-bag-with-filter`, `open-bag-for-slot` | charPanel/quickslots | gamePanels | filter/slot |
| `use-quick` | quickslots UI | Player | item id |
| `quick-item-used`, `potion-used`, `buff-used` | Player | UI efek | info item |
| `player-died` / `player-respawned` | Player | MapScene, quickslots | — |
| `skill-used`, `skill-cooldown-sync` | Player/skill UI | tombol skill | cooldown |
| `monster-killed` | MapScene | (stats/achievement via panggilan langsung) | monsterId |
| `shop-bought` / `shop-sold` | shop | (panel refresh) | — |

**Contoh alur penuh** (beli potion): klik Beli di NPC → `buyItem()` cek
gold+stok (`shop.ts:32-43`) → `spendGold` → event `gold-changed` → HUD gold
update; `addItem` → event `inventory-changed` → tas update. Satu aksi,
dua event, nol kopling langsung.

## 5. Alur data: dari klik sampai tersimpan

```
Klik tombol ⚔ (attack.ts)
 → VirtualInput.requestAttack()   (tandai: attackQueued = true)
 → MapScene.update() tiap frame: consumeAttack()
 → tryAttack(): cek cooldown (persistentTimers, jam global!)
 → rollDamage() (Player, pakai derived + crit)
 → damageMonster(): mitigasi? (monster polos: langsung takeDamage)
 → Monster.takeDamage() → mati? → loot (rollDrops → addGold/addItem)
 → registerKill() → quest progress → addExp() → level up?
 → saveJobSave/savePos/saveMeta (autosave) → localStorage
 → event stats-changed/gold-changed/inventory-changed → UI update
```

Semua penyimpanan bermuara ke `persistence.ts` (`loadJSON/saveJSON` +
`scopedKey` per profil). Kunci save terdaftar di `save.ts:ALL_KEYS` —
aturan keras: **key baru wajib didaftarkan** agar ikut export/import/clear.

## 6. Aturan keras proyek (dari `docs/AGENTS.md` — wajib hafal)

1. Script npm lintas-shell (CMD/Bash); helper di `scripts/*.js`.
2. Overlap physics didaftarkan **per-monster**, hapus dari list pakai `splice`
   (bukan `filter`), agar referensi array stabil.
3. Semua listener `window`/DOM di MapScene lewat helper `onWin`/`onDom`
   (auto-lepas saat `SHUTDOWN`); `Player` melepas listener di `destroy()`.
   Lupa = event ganda (double reward/potion) tiap pindah map.
4. Depth dari kaki: entity `10 + kakiY*0.01`, HP bar +0.05, bubble 30,
   partikel 40, teks 60, HUD 100.
5. `attackRange` harus > jarak sentuh badan.
6. Save baru → daftar di `ALL_KEYS` + dukung export/import/clear.
7. `Player` mulai dari `meta.currentJob`, jangan timpa dengan warrior.
8. Touch: `body{touch-action:manipulation}`, tombol sentuh sembunyi di desktop.
9. Monster pulang (evade) = immune + heal + abaikan player; tampilkan EVADE.

## Latihan (per § — kerjakan tanpa melihat Kunci di bawah!)

**§1 Tech stack:**
1. Sebut 5 teknologi + versi (TS/Phaser/Vite/Vitest/Capacitor) tanpa mencontek. Uji: cocokkan tabel §1.

**§2 Boot:**
2. Gambar ulang diagram boot dari ingatan, lalu cocokkan dengan `main.ts`. Uji: urutan `bindAuthScreen → showAuthScreen → launch → import('./app') → startGame` benar?

**§3 Peta modul:**
3. Jelaskan 3 lapisan + aturan arah dependensi (data tidak boleh import apa?). Uji: jawab + 1 contoh rantai.

**§4 Event bus:**
4. `grep -rn "dispatchEvent" src/game/data/ | wc -l` — hitung event dari data. Sebut 3 event + pengirim + penerima. Uji: angka + tabel §4.

**§5 Alur data:**
5. Telusuri beli potion: klik → `buyItem` → 2 event → 2 UI update. Sebut keduanya. Uji: jawab.

**§6 Aturan keras:**
6. Sebut 9 aturan keras tanpa mencontek (cukup kata kunci tiap nomor). Uji: cocokkan §6.

**Kriteria:** bisa menjelaskan 3 lapisan + memberi contoh 1 alur event penuh.

## Kunci (BUKA SETELAH mengerjakan!)

1. TS 5.5.4 strict, Phaser 3.80.1, Vite 5.4.8, Vitest 2.1.0 + jsdom, Capacitor 8.5.3. UI = DOM+CSS (tanpa React), save = localStorage, backend = tidak ada.
2. Lihat diagram §2. Titik sakral: dynamic `import('./app')` SETELAH profil aktif (kalau tidak, cache modul data milik profil salah).
3. Data (murni) ← Logika (entities/scenes) + UI. Data dilarang import entity/scene/UI. Contoh: `MapScene → Player → equipment → items+attributes`.
4. Bandingkan angkamu dengan tabel §4 (buy/sell → `shop-bought/sold`; `addGold/addItem` → `gold/inventory-changed`).
5. `gold-changed` → HUD gold; `inventory-changed` → tas. Ditambah `shop-bought` → `registerBuy` (quest).
6. Kata kunci: lintas-shell · overlap per-monster+splice · `onWin/onDom`+SHUTDOWN · depth dari kaki · attackRange>sentuh · ALL_KEYS · job dari meta · touch-manipulation · evade=immune.
