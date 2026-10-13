# 09 — Menambah, Mengubah, Menghapus Fitur

> Prasyarat: [08](08-file-katalog.md). Prosedur kerja mandiri dengan contoh LoP.

## A. Menambah fitur baru

**Langkah:** 1) identifikasi subsistem → 2) tentukan file baru/lama →
3) tentukan type/interface/fungsi → 4) hubungkan ke sistem → 5) UI+state →
6) uji + cegah regresi.

**Contoh 1 — monster baru "Serigala"** (checklist dari `docs/AGENTS.md`):
1. `monsters.ts`: tambah `MonsterDef` (hp/atk/exp/aggro/speed/cooldown).
   Speed WAJIB < speed player, attackRange > jarak sentuh.
2. `drops.ts`: tambah entri drop (gold range + chance item).
3. `BootScene`: tambah texture `monster-serigala` (prosedural dulu).
4. `map.ts`: tambah ke `monsterSpawns` map yang cocok.
5. Quest bila perlu (`quests.ts` + otomatis `questState`).
6. Uji: `tsc` → dev → bunuh → cek loot, HP bar, respawn, minimap (titik merah
   otomatis karena dari `monsters` array).

**Contoh 2 — item baru yang bisa dibeli:**
`items.ts` (definisi) → `SHOP_BUY` (harga) → tas otomatis (render dari
`ITEMS`) → `shop.test.ts` tambah kasus → `npm test`.

**Contoh 3 — tombol UI baru:** tambah `<button id>` di `index.html` →
style di `style.css` → modul `src/ui/*.ts` pola `init*` (guard null +
`pointerdown`) → hubungkan via `VirtualInput` atau `CustomEvent` baru
(daftarkan di `bindGlobalListeners` bila didengar MapScene!) → init di `app.ts`.

## B. Mengubah fitur yang sudah ada

**Langkah:** telusuri pemicu→hasil → temukan sumber data/state →
identifikasi dependensi → ubah terkecil → cek efek samping → verifikasi.

**Contoh — potion heal 40% → 60% maxHP:**
1. Pemicu: tombol 🧪 → `use-quick` → `Player.useQuickItem` (`Player.ts:251`).
2. Sumber data: **rumus di Player, bukan `items.ts`!**
   `items.ts` (`heal: 50`) hanya penanda "item ini menyembuhkan" + teks;
   jumlahnya dihitung di `useQuickItem`: `max(50, 40% maxHp)`.
   Ini pengecualian dari "angka tuning di modul data" — dan contoh kenapa
   langkah 1 (telusuri pemicu→hasil) wajib sebelum mengubah.
3. Dependensi: `quickslots`, cooldown global potion 5 detik, quest? (tidak).
4. Ubah `0.4` → `0.6` di `useQuickItem` → `tsc` → tes manual.
5. Verifikasi: HUD HP + tidak ada yang mengasumsikan 40%
   (`grep -rn "0.4" src/game/entities/Player.ts`).

**Aturan ubah formula:** angka tuning (damage/HP/drop/aggro) SELALU di modul
data, jangan di scene. Scene hanya mengeksekusi.

## C. Menghapus fitur

**Langkah:** cari referensi (`grep` import, event, id DOM) → hapus kode →
bersihkan state/timer/listener → pastikan tetangga sehat → uji.

**Contoh — hapus bounty harian:**
1. `grep -rn "bounty" src/ index.html` → catat: `bounty.ts`, questList render,
   MapScene `registerKillBounty`, save key, tes, HTML?
2. Hapus bertahap: render UI → pemanggil → modul → key di `ALL_KEYS` →
   file + tesnya.
3. Bersihkan: event `bounty-changed` (pastikan tak ada listener sisa),
   state localStorage lama (abaikan aman: `loadJSON` fallback).
4. Uji: `tsc` (import sisa ketahuan di sini!) → `npm test` → main 5 menit.

**Senjata utama penghapusan:** `tsc --noEmit` menemukan SEMUA referensi tipe/
import yang rusak. Jangan andalkan ingatan.

## Latihan (per § — kerjakan tanpa melihat Kunci di bawah!)

**A. Menambah:**
1. Tambah item `potion-xl` (heal 120, harga shop 50G) full-prosedur di atas. Uji: `tsc` + `npm test` + beli di game.
2. Tambah 1 quest khayalan di kertas: sebut file + field `requires` + fungsi register apa. Uji: jawab.

**B. Mengubah:**
3. Ubah aggro slime 120→80, jelaskan efek gameplay-nya. Uji: main + amati jarak kejar.
4. Jelaskan kenapa rumus potion ada di `Player.useQuickItem`, bukan `items.ts` — apa buktinya? Uji: jawab + baris kode.

**C. Menghapus:**
5. Rencanakan penghapusan `chat.ts` (desktop): daftar file yang tersentuh. Uji: `grep -rn "chat" src/ index.html` + `tsc` bersih setelah hapus.

**Kriteria:** tiap perubahan menyebut file, risiko, dan cara ujinya.

## Kunci (BUKA SETELAH mengerjakan!)

1. `items.ts` (definisi + `heal`) → `SHOP_BUY` (50G) → tas otomatis render dari `ITEMS` → tambah kasus `shop.test.ts` → `npm test`. Risiko: lupa `getItem` dikenal → `buyItem` return "Item tidak dikenal".
2. `quests.ts` (def + `requires` rantai) → progres otomatis via `questState.register*` → klaim via NPC. Tanpa `requires` benar = quest terbuka terlalu dini.
3. Aggro 80 < 120: slime baru kejar saat sangat dekat → area aman lebih luas → tutorial lebih mudah; risiko: map terasa sepi.
4. Bukti: `items.ts` (`heal: 50`) hanya penanda + teks; jumlah dihitung di `useQuickItem`: `max(50, 40% maxHp)` (`Player.ts:251`). Pelajaran: telusuri pemicu→hasil DULU sebelum mengubah.
5. Minimal: `chat.ts` + `index.html` (`#chat-panel`) + `style.css` + `app.ts` (`initChat`) + event `chat` (pengirim di MapScene/sistem). `tsc` menemukan import sisa; `npm test` memastikan tidak ada regresi data.
