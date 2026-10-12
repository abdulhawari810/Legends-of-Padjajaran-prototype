# Changelog — Legends of Padjajaran (mmorpg-web)

## 0.6.0 — Batch AG (Auth & Character Creation)
- AG1: **SHA-256 pure JS** (`data/sha256.ts`) — jalan di mana saja, bukan
  hanya secure context seperti `crypto.subtle`. Terverifikasi terhadap vektor
  NIST termasuk 1 juta karakter 'a'.
- AG2: **Namespacing key per profil** — `mmorpg-gold-v1` →
  `mmorpg:p:<profileId>:gold-v1`. Semua modul data diubah ke
  `const KEY = () => scopedKey(...)` karena namespace baru diketahui setelah
  login (nilai dihitung saat import akan terlalu cepat).
- AG3: **Boot async** — `main.ts` jadi bootstrap (auth → dynamic
  `import('./app')`), isi game dipindah ke `app.ts`. WAJIB karena modul data
  meng-cache state saat import.
- AG4: **Layar Masuk / Daftar** — username 3-16 karakter, password min 4,
  daftar profil tersimpan, banner migrasi save lama.
- AG5: **Layar Pilih Class** — 3 kartu (Warrior/Mage/Archer) dengan
  kecepatan + 5 atribut awal. Hanya untuk karakter baru; class permanen.
- AG6: **Logout + Hapus Progres** di panel Karakter (menggantikan
  "Reset Save"), plus chip nama profil aktif.
- AG7: **Migrasi save lama** → profil otomatis bernama "Pemain" (tanpa
  password) memakai job dari `mmorpg-meta-v1`. Progres lama tidak hilang.
- AG8: Test 158 (20 file). Termasuk `bootOrder.test.ts` yang menjaga urutan
  import & namespacing, plus `auth.test.ts` (34 tes) dan `sha256.test.ts`.
- Fix: `hashPassword(rounds=0)` mengembalikan `salt:password` polos.
- Fix: `register()` tidak menyetel sesi → alur daftar → pilih class → main
  terputus.
- CATATAN: ini sistem akun **lokal**, bukan autentikasi. Tidak ada server,
  jadi siapa pun yang pegang perangkat bisa membaca localStorage. Gunanya
  hanya memisahkan progres antar orang di satu perangkat.

## 0.5.0 — Batch AA–AF
- AA: **fix fisika tabrakan** — hapus collider player↔monster & monster↔monster.
  Player sekarang **ditahan** monster (revert ke `body.prev`, tanpa push ke
  arah mana pun): monster tak bisa menggeser player, player tak bisa menggeser
  monster, player tak bisa terdorong menembus dinding.
- AB: **Panel Equipment 2 kolom** — kolom kiri (avatar + gear slot + vital)
  dan kolom kanan (filter tab per tipe + grid kotak rarity + detail bar).
  Equipment job lain → border merah + 🔒 + toast saat Equip ditekan.
- AC: **Quick-slot** — 3 slot toolbar (1 HP, 2 MP, 3 food buff). Item dipasang
  dari panel Equipment. Item baru: Small Mana Potion, Roast Meat (+5 Atk 30s),
  Herbal Tonic (+4 Armor 30s). Save key `mmorpg-quickslots-v1`. Slot auto
  kosong saat item habis.
- AD: **Job class permanen** — `#job-select` jadi label read-only,
  `Player.jobLocked` menolak penggantian. Ganti class hanya lewat Reset Save.
- AE: **Panel Karakter** — 2 kolom (artwork + tab vertikal Status/Ability/
  Quest/Skill), tema emas gelap sama dengan Equipment, label stat bahasa
  Indonesia, bintang rarity, bar EXP + Next, equipment ringkas.
- AF: **Bar buff makanan** di bawah status bar (nama + bonus + durasi mm:ss,
  berkedip 5 detik terakhir). **List quest bergaya kartu** (badge EXP + progress
  bar + tombol aksi) responsif 2 kolom di desktop, dipakai bersama oleh panel
  Quest dan tab Quest di panel Karakter.
- Fix: scroll panel Karakter meloncat tiap 5 detik (re-render `stats-changed`
  menimpa `innerHTML`); sekarang hanya tab aktif yang di-render + scroll
  di-preserve.
- Fix: validasi `useQuickItem` dipindah sebelum mutasi HP/MP/buff.
- Fix: event `potion-consumed` diganti `quick-item-used` yang membawa id item
  (UI tidak lagi menebak item dari slot).
- Test: 100 unit test (17 file).
- Fix: tombol `−1` alokasi atribut muncul setelah "Terapkan" (poin sebenarnya
  sudah permanen) dan hilang begitu pool poin habis (padahal staging masih bisa
  dibatalkan). Sekarang `−1` hanya untuk staging sesi ini — aturan dipindah ke
  `attrRules.ts` supaya UI dan `Player.stageAttr` tidak bisa berbeda.

## 0.4.0 — Batch V–Y
- V: knockback crit + 5 poin atribut manual/level (ganti growth otomatis)
- W: kota NPC (Tetua/vendor/bank/3 pelatih), trade, bank vault+stash,
  quest beli/jual/setor + reward gold
- X: skill Lv1-3 per job (dmg +30%/Lv, CD turun), upgrade di pelatih
- Y: profesi mining/herbalism (node, gather E, level profesi), 2 quest,
  material jual, 2 achievement
- S: 3 bounty harian (elite/golem/troll), 5 achievement baru, statistik
  map & skill, monster berlevel per zona (skala HP/atk)
- T: potion 40% max HP, docs/QA.md, betulkan hitung monster README
- U: 42 unit test (10 file: bounty/stats/enhance/quest/ach/skill/...)
- Label nama: player (job+Lv), tiap monster (nama+Lv), Tetua Greenfield

## 0.2.0 — Batch H–P
- H: bounty harian elite, penalti mati 5% gold
- I: map Dark Forest + portal, 3 monster, 3 quest
- J: tempa gear +1..+5
- K: pola boss elite (AoE telegraph, summon)
- L: pengaturan (volume/kualitas), minimap, quest tutorial
- Map Greenfield 52×38, Dark 52×40; kamera fullscreen-lebar
- M: statistik, 6 achievement, backup export/import
- N: 3 skill per job (Bulwark/Leap, Frost/Blink, Rain/Swift)
- O: map Crystal Cave, Bat/Cultist/Cave Troll, 3 quest
- P: 19 unit test, CI APK, versi 0.2.0

## 0.1.0 — Batch A–G
- A: tuning combat 3 job; B: loot gold+item
- C: save per-job + posisi; D: shop + quest chain + skeleton
- E: skill + MP; F: dekor, elite, heal zone
- G: SFX prosedural + partikel + shake
- Fix: projectile tembus, auto-target, AI leash/evade, Y-sort depth,
  save job, cooldown per-job, attackRange nempel
- Mobile: UI responsif, tombol sentuh, fullscreen immersive,
  splash video, launcher icon, panel scroll
