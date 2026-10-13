# 06 — Sistem RPG

> Prasyarat: [03](03-arsitektur.md). Semua modul di `src/game/data/`:
> **murni** (tanpa Phaser) kecuali dispatch event → mudah dites
> (`*.test.ts` di sebelahnya, 46 tes hijau).

## 1. Atribut: 5 primer → 19 derived (`attributes.ts`)

`Primary {str, dex, int, foc, con}` (gaya New World) → `calcDerived()` → 19
stat tempur (gaya WoW). Rumus kunci (baris 40-67):
- `maxHp = 100 + con×15` · `maxMp = 40 + int×3 + foc×5`
- `pAtk = 10 + str×2 + dex×0.5` · `rAtk = 10 + dex×2 + str×0.5` ·
  `mAtk = 12 + int×2 + foc×0.5`
- `critRate = 5% + dex×0.15% + int×0.05%`, `dodge` max 30%, `block` butuh str>8.
- `expForLevel(lv) = 50×lv×(1+lv×0.2)` → Lv1 butuh 60 EXP.

**Contoh hitung** (warrior base str12/dex5/con10): P.Atk = 10+24+2.5 ≈ 36.
Slime HP 70 → 2 tebasan. Inilah cara men-tuning TTK: ubah angka di sini,
bukan di scene.

**Job** (`jobs.ts`): 3 class permanen (dipilih sekali di layar auth, lalu
`jobLocked`). Base + growth 5pt/level, mis. warrior +3 STR +2 CON.
Ganti job = ganti karakter (profil/save per-job terpisah).

**Alokasi manual** (`attrRules.ts` + `Player.stageAttr/applyStaged`):
dapat `freePoints` saat naik level → staging +/− → Apply permanen.
Aturan: batalkan staging hanya sebelum Apply; tidak ada reset gratis
(lihat tombol reset di char panel — baca kodenya sebelum pakai).

## 2. Tas, gold, equipment, tempa

| Modul | Pola | Kunci |
|-------|------|-------|
| `inventory.ts` | `Map<itemId, count>` + `DEFAULTS` starter | `addItem/removeItem` → event `inventory-changed`; `removeItem` return `false` bila kurang (selalu cek!) |
| `currency.ts` | `let gold` + persist | `spendGold` return boolean; event `gold-changed` |
| `equipment.ts` | 2 slot weapon+armor, `canEquip` (cek job+level) | `equipItem/unequipSlot` → event `equipment-changed` → Player `recalc`; `gearBonusFor` gabung primary+flat; tempa via `enhance` (+2 atk/+1 armor per level, max +5, bayar gold+gel) |
| `items.ts` | 15 definisi `ItemDef` | `jobs?: JobId[]` (lock job), `minLevel`, `primaryBonus`, `quick?: hp/mp/food` (aturan quick-slot), `icon` emoji |
| `drops.ts` | `TABLE[monster] = {gold:[min,max], items:[{chance}]}` | `rollDrops(id, rand)` — parameter `rand` agar bisa dites deterministik |
| `shop.ts` | `SHOP_BUY` (4) / `SHOP_SELL` (5) | `buyItem/sellItem` validasi lapis: ada di katalog → kenal → cukup gold/punya barang → catat `stats` → event |
| `bank.ts` | `depositGold/withdrawGold/storeItem/takeItem` | Gold bank **bebas penalti mati** — alasan memakai bank sebelum grinding |

**Pola `{ok, reason?}`** dipakai semua operasi gagal-mungkin. UI menampilkan
`reason` ke toast — jangan `alert()`.

## 3. Quest, bounty, achievement

- `quests.ts`: 16 quest **berantai** (`requires`): kill/gather/beli/jual/setor.
- `questState.ts`: `progress` Map + `done` + `claimed` terpisah.
  Alur: `registerKill/gather/buy/sell/deposit` (cek unlock + target) →
  `done` → `canClaim` → `claimReward` **sekali saja** (double-claim return null).
  Klaim hanya lewat NPC (event `claim-quest` → MapScene, harus dekat).
- `bounty.ts`: 3 bounty **harian per map**, reset tiap tanggal lokal
  (`BountyState.date`). Beda dengan quest (sekali selamanya).
- `achievements.ts`: 13 pencapaian **auto-klaim** berhadiah gold, dicek dari
  `stats.ts` (kill/death/level/travel/kaya/skill/gather).
- `stats.ts`: pencatat global lintas-job (juga dipakai profil pemain).

## 4. Skill, quick-slot, profesi

- `skills.ts`: `SKILLS: Record<JobId, SkillDef[]>` — 3 skill/job
  (`mpCost`, `cooldownMs`, `castMs`). Contoh warrior: Whirlwind (AoE 360°),
  Bulwark (perisai −40% 6dtk), Leap Slam (lompat+AoE).
- `skillLevel.ts`: level skill 1–3 (damage +30%/Lv, CD −1dtk, cast −0.5dtk),
  upgrade bayar gold.
- `quickslots.ts` + UI: 3 slot toolbar HP/MP/food, `setQuickItem` validasi
  jenis via `fitsQuickSlot`; `use-quick` → `Player.useQuickItem`.
- `prof.ts` + `GatherNode.ts`: mining/herbalism — XP profesi, channel
  makin cepat + bonus yield per level; node di `map.ts:gather`.
  Kena hit = panen batal (`cancelGather`).

## 5. Save, slot, profil, auth lokal

```
localStorage:
  mmorpg-auth-v1               akun (BUKAN keamanan sungguhan!)
  mmorpg:p:<profileId>:<key>   SEMUA progres, pisah per akun
  mmorpg-slot-{1..3}-v1        snapshot 3 slot manual
```
- `persistence.ts`: `scopedKey()` namespace + `loadJSON/saveJSON` anti-crash.
- `save.ts`: `JobSave` per-job (level/exp/primary/equip/hp/mp) +
  `PosSave` per-map + `MetaSave` (currentJob, killCount) + slot + export/import.
- Autosave: tiap 5 detik + saat EXP/quest (`saveAccum` di MapScene) +
  `saveCurrentJob()` tiap perubahan penting.
- `auth.ts` + `authScreen.ts`: register/login SHA-256 iteratif + salt
  (pure-JS, tanpa `crypto.subtle`), sesi, migrasi save lama, hapus profil.
  **Ingat: siapa pegang perangkat bisa baca localStorage — ini pemisah
  progres antar orang, bukan keamanan.**

## Latihan (per § — kerjakan tanpa melihat Kunci di bawah!)

**§1 Atribut + job:**
1. Tambah +5 base STR warrior di kertas: hitung P.Atk & maxHp baru. Uji: jawab angka.
2. Jelaskan kenapa `JobId` bukan `string` biasa (lihat `02 §1`). Uji: jawab 1 kalimat.
3. Sebut growth/level tiap job + kenapa ganti job = ganti karakter. Uji: jawab.

**§2 Tas/gold/equipment/tempa:**
4. Telusuri beli potion di kertas: `buyItem` → cek apa saja (4 lapis validasi) → event apa yang dikirim? Uji: baca `shop.ts:32-43`.
5. Jelaskan pola `{ok, reason?}` + kenapa UI menampilkan `reason` ke toast, bukan `alert()`. Uji: jawab.
6. Jelaskan rantai equip: `equipItem` → event → Player `recalc` → `gearBonusFor`. Kenapa `removeItem` HARUS dicek return-nya? Uji: jawab.

**§3 Quest/bounty/achievement:**
7. Jelaskan kenapa `claimReward` kedua kali return null (baca `questState.ts`). Uji: jawab + sebut 3 state (`progress/done/claimed`).
8. Bedakan quest vs bounty vs achievement dalam 3 kalimat. Uji: jawab.
9. Sebut cara klaim quest (hanya via NPC + event `claim-quest` + harus dekat). Kenapa tidak dari panel langsung? Uji: jawab.

**§4 Skill/quick-slot/profesi:**
10. Sebut 3 skill warrior + 3 angka tiap skill (`mpCost/cooldownMs/castMs`). Uji: buka `skills.ts`.
11. Jelaskan aturan `fitsQuickSlot` (slot HP/MP/food) + alur `use-quick` → `Player.useQuickItem`. Uji: jawab.
12. Jelaskan kenapa kena hit membatalkan panen (`cancelGather`). Uji: jawab.

**§5 Save/profil/auth:**
13. Lihat [13-save-profil](13-save-profil.md): sebut 3 jenis key + kenapa key baru wajib daftar `ALL_KEYS`. Uji: jawab.

**Kriteria:** bisa menelusuri beli→gold→tas dan kill→quest→klaim tanpa bantuan.

## Kunci (BUKA SETELAH mengerjakan!)

1. STR 12→17: P.Atk = 10+34+2,5 ≈ 46 (naik ~10); maxHp tetap (dari CON, bukan STR) = 100+10×15 = 250.
2. `JobId = 'warrior'|'mage'|'archer'` membatasi 3 nilai — salah ketik langsung error compiler.
3. Warrior +3STR+2CON, mage +3INT+2FOC, archer +3DEX+1STR+1CON (`jobs.ts`). Save per-job terpisah (`save.ts:JobSave`) → ganti job = progres berbeda.
4. Validasi lapis: ada di katalog → item dikenal → gold cukup → `spendGold` berhasil. Event: `gold-changed` (HUD) + `inventory-changed` (tas) + `shop-bought` (quest `registerBuy`).
5. `{ok:false, reason}` = operasi gagal-mungkin tanpa throw. Toast non-blokir (game tetap jalan); `alert()` memblokir game loop.
6. Equip → `equipment-changed` → Player hitung ulang derived via `gearBonusFor`. `removeItem` return `false` bila stok kurang — tanpa cek, item hangus/ganda.
7. `claimed` dicatat setelah klaim pertama; klaim kedua melihat flag → return null (klaim sekali saja, anti double-reward).
8. Quest = sekali selamanya + berantai (`requires`); bounty = harian per map + reset tanggal; achievement = auto-klaim dari `stats.ts`.
9. Klaim lewat NPC dekat (event `claim-quest` → MapScene cek jarak). Desain: hadiah = interaksi dunia, bukan klik menu.
10. Lihat `skills.ts`: Whirlwind (AoE), Bulwark (perisai −40% 6dtk), Leap Slam (lompat+AoE) + angka masing-masing.
11. `fitsQuickSlot` memvalidasi jenis item per slot (HP/MP/food). Alur: toolbar → `use-quick` → `useQuickItem` (rumus di Player, bukan `items.ts`!).
12. Channel panen = aksi terganggu (desain risiko-vs-hadiah); kena hit = `cancelGather` agar tidak panen sambil bertarung.
13. Lihat `13 §1-§2`: auth global, progres per-profil, preferensi perangkat. Lupa daftar = key tidak ikut export/import/slot/wipe.
