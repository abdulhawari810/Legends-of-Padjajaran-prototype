# 15 — Balancing Data-Driven (TTK, EXP & Ekonomi)

> Prasyarat: [06](06-sistem-rpg.md). Tujuan: tuning angka seperti designer, bukan tebak-tebakan.
> Aturan: angka tuning SELALU di modul data, scene hanya mengeksekusi (`09-B`).

## 1. TTK (Time-to-Kill): dari komentar jadi hitungan

`src/game/data/monsters.ts:1-12` sudah berisi target tuning (warrior P43 / mage M51 / archer R44 dengan starter weapon):

* Slime 70 HP → 2 hit semua job. Tutorial aman.
* Goblin 110 HP → 3 hit (~1,2–1,8 dtk). Skeleton 160 HP → 4 hit.
* Damage ke player sudah dimitigasi: slime 5 → W4/M5/A4 per 1,6 dtk (DPS ~3). 1 slime butuh 60–80 dtk untuk membunuhmu — sengaja pemaaf di awal.

Rumus hitung di kertas: `hit = ceil(HP / serangPerHit)`, `TTK = hit × intervalSerang`. Contoh: warrior 43 vs slime 70 → `ceil(70/43)=2` hit.

**Batasan fisik yang tidak boleh dilanggar:** `moveSpeed` monster SELALU < speed player (`jobs.ts:22,32,42` = 170/160/190; monster 40–95 di `monsters.ts:45-157`) agar bisa kabur/kite. `attackRange` HARUS > jarak sentuh badan (lihat `05 §2`) — kalau tidak, tebasan tidak pernah kena.

## 2. Atribut: 5 primer → 19 derived

`src/game/data/attributes.ts:39-46`:

```ts
maxHp = 100 + con×15 · maxMp = 40 + int×3 + foc×5
pAtk = 10 + str×2 + dex×0.5 · rAtk = 10 + dex×2 + str×0.5 · mAtk = 12 + int×2 + foc×0.5
```

Warrior base (str12/con10, `jobs.ts:24`) → P.Atk ≈ 36 sebelum senjata. Mitigasi `mitigatePhysical(raw, armor)` (`:95-99`): `dmg × 100/(100+armor)`, minimal 1 (tidak pernah 0 — quest kill tidak macet).

`jobs.ts:25,34,44` — growth 5 poin/level (warrior +3 STR +2 CON). Ganti job = ganti karakter (save per-job, `13`).

Kurva EXP (`attributes.ts:112-114`): `expForLevel(lv) = 50×lv×(1+lv×0.2)` → Lv1 = 60 EXP. Slime 12 EXP (`monsters.ts:41`) → 5 slime naik Lv2. Hitung dulu sebelum ubah — menaikkan EXP monster 2x = leveling 2x lebih cepat + shop ikut kebanjiran gold.

## 3. Ekonomi: drop → jual → beli (segitiga tertutup)

* `drops.ts:8-76` — `TABLE[monster] = {gold:[min,max], items:[{chance}]}`. Komentar `:2`: gold cukup untuk 1 potion (~20G) tiap 3–4 kill. Slime `[2,6]` → rata-rata 4G/kill → 5 kill ≈ 20G = 1 `potion-s`.
* `shop.ts:17-30` — `SHOP_BUY` (potion-s 20G … tonic 45G) vs `SHOP_SELL` (slime-gel 5G, iron-ore 4G, armor 30–35G). Jual 4 gel = 1 potion. Itu desain, bukan kebetulan.
* `currency.ts` + `bank.ts`: gold bank bebas penalti mati — alasan bank ada.

**Prosedur tuning aman:** (1) hitung di kertas, (2) ubah 1 angka, (3) `tsc` + `npm test` (khususnya `drops.test.ts` range gold!), (4) main 5 menit catat TTK/gold per 10 kill, (5) commit kecil. Jangan ubah 5 angka sekaligus — tidak tahu mana yang berefek.

## Latihan (kerjakan tanpa melihat Kunci di bawah!)

1. Naikkan HP slime 70→100 di kertas: berapa hit warrior sekarang? Efek ke quest kill pertama?
2. Turunkan `chance` potion-s slime 0,12→0,05: berapa potion per 100 kill (harapan)? Efek ke ekonomi?
3. Jelaskan kenapa `mitigatePhysical` punya `Math.max(1, ...)`.

**Lolos jika:** bisa memprediksi TTK + gold/10-kill sebelum menjalankan game.

## Kunci (BUKA SETELAH mengerjakan!)

1. `ceil(100/43) = 3` hit (dari 2). Tutorial melambat ~50%; quest kill pertama butuh 1,5x waktu. Pertimbangkan naikkan EXP slime bila HP naik.
2. Harapan 12 → 5 potion per 100 kill. Gold tidak berubah (gold terpisah dari chance item), tapi sustain potion turun → pemain beli lebih banyak (20G) → gold sink naik.
3. Damage minimal 1: tanpa itu, armor besar → damage 0 → monster tidak pernah mati → quest kill macet selamanya.
